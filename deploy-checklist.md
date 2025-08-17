# Netlify 部署檢查清單

## 部署前檢查

### 1. 本地建置測試
```bash
# 清理舊的建置檔案
rm -rf dist

# 安裝依賴
npm install

# 建置專案
npm run build

# 檢查 dist 資料夾是否生成
ls -la dist/
```

### 2. 建置輸出檢查
確保 `dist/` 資料夾包含：
- `index.html`
- `assets/` 資料夾（包含 JS/CSS 檔案）
- 其他靜態資源

### 3. 本地預覽測試
```bash
npm run preview
```
訪問 `http://localhost:4173` 確認建置結果正常

## 部署步驟

### 方法 1: 使用 Netlify CLI
```bash
# 安裝 Netlify CLI
npm install -g netlify-cli

# 登入 Netlify
netlify login

# 部署
netlify deploy --prod --dir=dist
```

### 方法 2: 手動上傳
1. 執行 `npm run build`
2. 將 `dist/` 資料夾內容上傳到 Netlify
3. 設定建置命令：`npm run build`
4. 設定發布資料夾：`dist`

### 方法 3: Git 自動部署
1. 推送到 GitHub
2. 在 Netlify 連接 GitHub 儲存庫
3. 設定建置命令：`npm run build`
4. 設定發布資料夾：`dist`

## 故障排除

### 建置失敗
- 檢查 TypeScript 錯誤：`npm run build`
- 檢查依賴版本相容性
- 確認 Node.js 版本（建議 18+）

### 部署後無法訪問
- 檢查 Netlify 部署日誌
- 確認自訂域名設定
- 檢查 SSL 憑證狀態
- 確認建置成功且沒有錯誤

### 路由問題
- 確認 `netlify.toml` 中的 SPA 回退設定
- 檢查 `/*` 重定向規則
- 測試 API 路由是否正常

## 環境變數設定

在 Netlify 中設定以下環境變數（如果需要）：
- `VITE_SEED_ADMIN_EMAIL` - 管理員帳號
- `VITE_SEED_ADMIN_PASSWORD` - 管理員密碼

## 監控和維護

- 定期檢查 Netlify 部署狀態
- 監控網站效能和可用性
- 備份重要設定和配置
