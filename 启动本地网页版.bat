@echo off
setlocal
chcp 65001 >nul
title 工资打卡日历 - 本地网页版

cd /d "%~dp0"
if errorlevel 1 (
  echo.
  echo [错误] 无法进入项目目录：
  echo %~dp0
  echo.
  pause
  exit /b 1
)

echo ========================================
echo        工资打卡日历 V0.1
echo        本地网页版启动器
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js。
  echo.
  echo 请安装 Node.js 22 或更高版本后再运行。
  echo 下载地址：https://nodejs.org/
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [错误] 已检测到 Node.js，但未找到 npm。
  echo 建议重新安装官方 Node.js。
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node --version 2^>nul') do set "NODE_VERSION=%%v"
for /f "delims=" %%v in ('npm --version 2^>nul') do set "NPM_VERSION=%%v"
echo Node.js: %NODE_VERSION%
echo npm:     %NPM_VERSION%
echo.

if not exist "package.json" (
  echo [错误] 当前目录没有 package.json。
  echo 请确认“启动本地网页版.bat”位于项目根目录。
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo 首次运行，正在安装依赖...
  echo 这一步需要可以访问 npm 软件源的网络连接。
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [错误] 依赖安装失败。
    echo 请检查网络、npm 镜像或代理设置后重试。
    echo.
    pause
    exit /b 1
  )
  echo.
  echo 依赖安装完成。
  echo.
)

echo 正在启动本地网页...
echo 地址：http://localhost:5173/work-tracker-pwa/
echo.
echo 启动成功后请保持本窗口打开。
echo 要关闭网页服务，请在此窗口按 Ctrl+C。
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:5173/work-tracker-pwa/'"

call npm run dev -- --host 127.0.0.1
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo ========================================
if "%EXIT_CODE%"=="0" (
  echo 本地网页服务已停止。
) else (
  echo [错误] 本地网页服务启动失败或异常退出。
  echo npm/Vite 退出代码：%EXIT_CODE%
)
echo ========================================
echo.
pause
exit /b %EXIT_CODE%
