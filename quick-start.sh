#!/bin/bash

# 🚀 快速启动脚本
# 使用方法: bash quick-start.sh

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  掼蛋设备智能管理平台 - 真机硬件通讯方案                  ║"
echo "║                   快速启动脚本                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖中..."
    npm install
    echo ""
fi

# 菜单
echo "选择操作："
echo "1. 在开发环境运行测试 (npm run test:hardware:dev)"
echo "2. 在测试环境运行测试 (npm run test:hardware:staging)"
echo "3. 在生产环境运行测试 (npm run test:hardware:prod)"
echo "4. 启动本地开发服务器 (npm run dev)"
echo "5. 构建生产版本 (npm run build)"
echo "6. 查看快速参考文档 (QUICK_REFERENCE.md)"
echo "7. 查看硬件部署指南 (REAL_HARDWARE_GUIDE.md)"
echo "8. 查看 API 规范 (API_SPEC.md)"
echo "9. 查看部署清单 (DEPLOYMENT_CHECKLIST.md)"
echo "0. 退出"
echo ""

read -p "请输入选项 (0-9): " option

case $option in
    1)
        echo "🧪 运行开发环境测试..."
        npm run test:hardware:dev
        ;;
    2)
        echo "🧪 运行测试环境测试..."
        npm run test:hardware:staging
        ;;
    3)
        echo "🧪 运行生产环境测试..."
        npm run test:hardware:prod
        ;;
    4)
        echo "🚀 启动开发服务器..."
        npm run dev
        ;;
    5)
        echo "🔨 构建生产版本..."
        npm run build
        ;;
    6)
        if command -v code &> /dev/null; then
            code QUICK_REFERENCE.md
        else
            cat QUICK_REFERENCE.md | less
        fi
        ;;
    7)
        if command -v code &> /dev/null; then
            code REAL_HARDWARE_GUIDE.md
        else
            cat REAL_HARDWARE_GUIDE.md | less
        fi
        ;;
    8)
        if command -v code &> /dev/null; then
            code API_SPEC.md
        else
            cat API_SPEC.md | less
        fi
        ;;
    9)
        if command -v code &> /dev/null; then
            code DEPLOYMENT_CHECKLIST.md
        else
            cat DEPLOYMENT_CHECKLIST.md | less
        fi
        ;;
    0)
        echo "👋 再见！"
        exit 0
        ;;
    *)
        echo "❌ 无效的选项"
        exit 1
        ;;
esac
