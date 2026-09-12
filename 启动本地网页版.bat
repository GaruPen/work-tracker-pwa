@echo off
chcp 65001 >nul
cd /d %~dp0

where node >nul 2>nul
if errorlevel 1 (
  echo 未检测到 Node.js，请先安装 Node.js 22 或更高版本。
  pause
  exit /b 1
)

if not exist node_modules (
  echo 首次运行，正在安装依赖...
  call npm install
  if errorlevel 1 (
    echo 依赖安装失败，请检查网络或 npm 配置。
    pause
    exit /b 1
  )
)

start "" "http://localhost:5173/work-tracker-pwa/"
call npm run dev -- --host 127.0.0.1
