@echo off
chcp 65001 >nul

:: 视频抽帧助手 - 一键启动脚本 (Windows)
:: 使用方法: 双击 start.bat

echo 🎬 视频抽帧助手 - 本地启动
echo ==========================

:: 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未安装 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js 已安装

:: 检查依赖
if not exist "node_modules" (
    echo 📦 安装依赖...
    npm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
) else (
    echo ✅ 依赖已安装
)

echo.
echo 🚀 启动服务...
echo.
echo 启动后会自动打开浏览器
echo.
echo 管理员后台: http://localhost:3000/admin.html
echo 用户名: admin
echo 密码: clover2026
echo.

:: 启动服务器
start http://localhost:3000
node server.js

pause
