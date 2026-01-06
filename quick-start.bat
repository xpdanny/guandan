@echo off
REM 🚀 Windows 快速启动脚本
REM 使用方法: quick-start.bat

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  掼蛋设备智能管理平台 - 真机硬件通讯方案                  ║
echo ║                   快速启动脚本 (Windows)                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js 18+
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js 版本: %NODE_VERSION%
echo.

REM 检查依赖
if not exist "node_modules" (
    echo 📦 安装依赖中...
    call npm install
    echo.
)

REM 菜单
:menu
echo 选择操作：
echo.
echo  1  在开发环境运行测试
echo  2  在测试环境运行测试
echo  3  在生产环境运行测试
echo  4  启动本地开发服务器
echo  5  构建生产版本
echo  6  查看快速参考文档
echo  7  查看硬件部署指南
echo  8  查看 API 规范
echo  9  查看部署清单
echo  0  退出
echo.

set /p option="请输入选项 (0-9): "

if "%option%"=="1" (
    echo.
    echo 🧪 运行开发环境测试...
    echo.
    call npm run test:hardware:dev
    goto menu
)

if "%option%"=="2" (
    echo.
    echo 🧪 运行测试环境测试...
    echo.
    call npm run test:hardware:staging
    goto menu
)

if "%option%"=="3" (
    echo.
    echo 🧪 运行生产环境测试...
    echo.
    call npm run test:hardware:prod
    goto menu
)

if "%option%"=="4" (
    echo.
    echo 🚀 启动开发服务器...
    echo.
    call npm run dev
    goto menu
)

if "%option%"=="5" (
    echo.
    echo 🔨 构建生产版本...
    echo.
    call npm run build
    goto menu
)

if "%option%"=="6" (
    echo.
    echo 📖 打开快速参考文档...
    echo.
    start notepad QUICK_REFERENCE.md
    goto menu
)

if "%option%"=="7" (
    echo.
    echo 📖 打开硬件部署指南...
    echo.
    start notepad REAL_HARDWARE_GUIDE.md
    goto menu
)

if "%option%"=="8" (
    echo.
    echo 📖 打开 API 规范...
    echo.
    start notepad API_SPEC.md
    goto menu
)

if "%option%"=="9" (
    echo.
    echo 📖 打开部署清单...
    echo.
    start notepad DEPLOYMENT_CHECKLIST.md
    goto menu
)

if "%option%"=="0" (
    echo.
    echo 👋 再见！
    exit /b 0
)

echo.
echo ❌ 无效的选项
echo.
goto menu
