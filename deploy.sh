#!/bin/bash

# 登入問題診斷和部署腳本
echo "🚀 開始部署 limiautopost 到 Netlify..."

# 檢查 Node.js 版本
echo "📋 檢查 Node.js 版本..."
node --version
npm --version

# 清理舊的建置檔案
echo "🧹 清理舊的建置檔案..."
rm -rf dist
rm -rf node_modules

# 安裝依賴
echo "📦 安裝依賴..."
npm install

# 建置專案
echo "🔨 建置專案..."
npm run build

# 檢查建置結果
if [ ! -d "dist" ]; then
    echo "❌ 建置失敗：dist 資料夾不存在"
    exit 1
fi

echo "✅ 建置成功！"
echo "📁 建置內容："
ls -la dist/

# 檢查必要檔案
if [ ! -f "dist/index.html" ]; then
    echo "❌ 建置失敗：index.html 不存在"
    exit 1
fi

# 本地預覽測試
echo "🌐 啟動本地預覽..."
echo "請在另一個終端執行：npm run preview"
echo "然後訪問 http://localhost:4173 測試"

# 部署選項
echo ""
echo "🚀 部署選項："
echo "1. 使用 Netlify CLI 部署"
echo "2. 手動上傳到 Netlify"
echo "3. 推送到 Git 觸發自動部署"
echo ""
read -p "請選擇部署方式 (1-3): " choice

case $choice in
    1)
        echo "📤 使用 Netlify CLI 部署..."
        if ! command -v netlify &> /dev/null; then
            echo "安裝 Netlify CLI..."
            npm install -g netlify-cli
        fi
        
        echo "請登入 Netlify..."
        netlify login
        
        echo "部署到 Netlify..."
        netlify deploy --prod --dir=dist
        ;;
    2)
        echo "📤 手動部署步驟："
        echo "1. 開啟 https://app.netlify.com/"
        echo "2. 拖拽 dist/ 資料夾到部署區域"
        echo "3. 等待部署完成"
        echo "4. 設定自訂域名（如果需要）"
        ;;
    3)
        echo "📤 Git 自動部署步驟："
        echo "1. 推送到 GitHub：git push origin main"
        echo "2. 在 Netlify 連接 GitHub 儲存庫"
        echo "3. 設定建置命令：npm run build"
        echo "4. 設定發布資料夾：dist"
        ;;
    *)
        echo "❌ 無效選擇"
        exit 1
        ;;
esac

echo ""
echo "🎉 部署完成！"
echo "📋 檢查清單："
echo "- 確認網站可以正常訪問"
echo "- 測試登入功能"
echo "- 檢查所有路由是否正常"
echo "- 確認 API 功能正常"
