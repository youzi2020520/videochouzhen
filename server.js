const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const DB_PATH = process.env.VERCEL ? '/tmp/auth_db.json' : path.join(__dirname, 'auth_db.json');

app.use(bodyParser.json());

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'clover2026';

function generateToken(username) {
    const payload = `${username}:${Date.now()}`;
    return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 32);
}

let tokenStore = {};

function getDB() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {}
    return { codes: [] };
}

function saveDB(db) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    } catch (err) {
        console.error('Failed to save DB:', err);
    }
}

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = generateToken(username);
        tokenStore[token] = { username, created: Date.now() };
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
});

app.post('/api/logout', (req, res) => {
    const token = req.headers['authorization'] || req.query.token;
    if (token && tokenStore[token]) {
        delete tokenStore[token];
    }
    res.json({ success: true });
});

function verifyServerToken(token) {
    return token && tokenStore[token] !== undefined;
}

function requireAdminAuth(req, res, next) {
    const token = req.headers['authorization'] || req.query.token;
    if (!token || !verifyServerToken(token)) {
        return res.status(401).json({ success: false, message: '请先登录' });
    }
    next();
}

app.post('/api/verify', (req, res) => {
    const { code, wechatId, ip, location } = req.body;
    const db = getDB();
    const index = db.codes.findIndex(c => c.code === code);

    if (index === -1) return res.status(401).json({ success: false, message: '无效授权码' });
    
    const record = db.codes[index];
    
    if (record.status === 0) return res.status(403).json({ success: false, message: '授权码已禁用' });
    if (new Date(record.expiry) < new Date()) return res.status(403).json({ success: false, message: '授权码已过期' });

    record.lastIp = ip || 'unknown';
    record.lastLocation = location || '未知';
    record.lastLogin = new Date().toISOString();
    
    saveDB(db);
    const expiryDate = new Date(record.expiry).toISOString().split('T')[0];
    res.json({ success: true, message: '验证成功', expiry: expiryDate });
});

app.post('/api/admin/generate', requireAdminAuth, (req, res) => {
    const { wechatId, days } = req.body;
    if (!wechatId) return res.status(400).json({ error: '请提供微信号' });

    const db = getDB();
    const existing = db.codes.find(c => c.wechatId === wechatId);
    if (existing) return res.json({ success: false, message: '该微信号已存在授权码', code: existing.code });

    const newCode = 'CINE-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (parseInt(days) || 30));

    const newRecord = {
        wechatId,
        code: newCode,
        status: 1,
        expiry: expiry.toISOString(),
        created: new Date().toISOString(),
        lastIp: '',
        lastLocation: '',
        lastLogin: ''
    };

    db.codes.push(newRecord);
    saveDB(db);

    res.json({ success: true, code: newCode });
});

app.get('/api/admin/list', requireAdminAuth, (req, res) => {
    res.json(getDB().codes);
});

app.post('/api/admin/toggle', requireAdminAuth, (req, res) => {
    const { code } = req.body;
    const db = getDB();
    const record = db.codes.find(c => c.code === code);
    if (record) {
        record.status = record.status === 1 ? 0 : 1;
        saveDB(db);
        res.json({ success: true, status: record.status });
    } else {
        res.status(404).json({ error: '未找到该授权码' });
    }
});

module.exports = app;
