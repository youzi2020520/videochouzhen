const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'auth_db.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.')));

// Initialize "Database"
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ codes: [] }));
}

function getDB() {
    return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(db) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// --- Client APIs ---

// Verify a code
app.post('/api/verify', (req, res) => {
    const { code, wechatId, ip, location } = req.body;
    const db = getDB();
    const index = db.codes.findIndex(c => c.code === code);

    if (index === -1) return res.status(401).json({ success: false, message: '无效授权码' });
    
    const record = db.codes[index];
    
    if (record.status === 0) return res.status(403).json({ success: false, message: '授权码已禁用' });
    if (new Date(record.expiry) < new Date()) return res.status(403).json({ success: false, message: '授权码已过期' });

    // Update login info
    record.lastIp = ip || req.ip;
    record.lastLocation = location || '未知';
    record.lastLogin = new Date().toISOString();
    
    saveDB(db);
    // Format expiry date to YYYY-MM-DD
    const expiryDate = new Date(record.expiry).toISOString().split('T')[0];
    res.json({ success: true, message: '验证成功', expiry: expiryDate });
});

// --- Management APIs (Add basic password protection for prod) ---

// Generate a code
app.post('/api/admin/generate', (req, res) => {
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

// List codes
app.get('/api/admin/list', (req, res) => {
    res.json(getDB().codes);
});

// Toggle status
app.post('/api/admin/toggle', (req, res) => {
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

app.listen(PORT, () => {
    console.log(`视频帧探服务运行在 http://localhost:${PORT}`);
});
