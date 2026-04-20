#!/bin/bash

# 视频抽帧助手 - 一键启动脚本
# 使用方法: ./start.sh

echo "🎬 视频抽帧助手 - 本地启动"
echo "=========================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装完成"
else
    echo "✅ 依赖已安装"
fi

echo ""
echo "🚀 启动服务..."
echo ""
echo "启动后会自动打开浏览器"
echo ""
echo "管理员后台: http://localhost:3000/admin.html"
echo "用户名: admin"
echo "密码: clover2026"
echo ""

# 启动服务器并打开浏览器
node server.js &
SERVER_PID=$!

# 等待服务器启动
sleep 2

# 打开浏览器
if command -v open &> /dev/null; then
    # macOS
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open http://localhost:3000
elif command -v start &> /dev/null; then
    # Windows
    start http://localhost:3000
fi

# 等待服务器结束
wait $SERVER_PID
