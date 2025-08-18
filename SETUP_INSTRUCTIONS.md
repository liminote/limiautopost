# 排程貼文系統設定說明

## 🎯 系統概述

新的排程貼文系統已經建立，能夠確保排程貼文即使在你關閉瀏覽器或電腦休眠後仍能可靠執行。

## 🔧 需要設定的環境變數

### 1. Netlify 環境變數

在 Netlify 的 Site settings > Environment variables 中設定：

```
SCHEDULER_SECRET=your-secret-key-here
```

**說明：** 這是用來保護排程檢查 API 的密鑰，防止未授權的請求。

### 2. GitHub Secrets

在 GitHub 倉庫的 Settings > Secrets and variables > Actions 中設定：

```
SCHEDULER_SECRET=your-secret-key-here
NETLIFY_SITE_URL=https://your-site.netlify.app
```

**說明：**
- `SCHEDULER_SECRET`：必須與 Netlify 中的值相同
- `NETLIFY_SITE_URL`：你的 Netlify 網站 URL

## 🚀 系統工作流程

### 1. 排程設定
- 使用者在追蹤頁面設定貼文排程時間
- 系統將排程資訊儲存到本地儲存

### 2. 自動檢查
- GitHub Actions 每 5 分鐘觸發一次
- 調用 Netlify Function 檢查到期的排程貼文

### 3. 授權檢查
- 系統自動檢查 Threads 授權狀態
- 如果 token 即將過期，自動嘗試刷新
- 如果無法刷新，標記貼文為失敗並通知使用者

### 4. 自動發佈
- 授權有效時，自動發佈到 Threads
- 更新貼文狀態和相關資訊

## 📋 設定步驟

### 步驟 1：設定 Netlify 環境變數
1. 前往 [Netlify](https://netlify.com)
2. 選擇你的網站
3. 前往 Site settings > Environment variables
4. 新增 `SCHEDULER_SECRET` 變數，值為任意安全字串

### 步驟 2：設定 GitHub Secrets
1. 前往你的 GitHub 倉庫
2. 點擊 Settings > Secrets and variables > Actions
3. 新增以下 secrets：
   - `SCHEDULER_SECRET`：與 Netlify 中相同的值
   - `NETLIFY_SITE_URL`：你的 Netlify 網站完整 URL

### 步驟 3：啟用 GitHub Actions
1. 推送程式碼到 GitHub
2. 前往 Actions 標籤
3. 確認工作流程已啟用
4. 手動觸發一次測試（使用 workflow_dispatch）

## 🧪 測試排程系統

### 1. 手動觸發測試
```bash
# 在 GitHub Actions 頁面點擊 "Run workflow"
# 或使用 curl 直接測試
curl -X POST "https://your-site.netlify.app/.netlify/functions/scheduled-posts-checker" \
  -H "Authorization: Bearer your-secret-key" \
  -H "Content-Type: application/json"
```

### 2. 設定測試排程
1. 在追蹤頁面設定一個 5 分鐘後的排程貼文
2. 關閉瀏覽器
3. 等待 5 分鐘後檢查是否自動發佈

### 3. 檢查日誌
- Netlify Functions 日誌：在 Netlify 的 Functions 標籤中查看
- GitHub Actions 日誌：在 GitHub 的 Actions 標籤中查看

## 🔍 故障排除

### 問題 1：GitHub Actions 沒有執行
**解決方案：**
- 檢查 GitHub Secrets 是否正確設定
- 確認 Actions 權限已啟用
- 檢查 cron 語法是否正確

### 問題 2：排程檢查 API 返回 401
**解決方案：**
- 確認 `SCHEDULER_SECRET` 在 Netlify 和 GitHub 中設定相同
- 檢查環境變數是否已部署

### 問題 3：排程貼文沒有自動發佈
**解決方案：**
- 檢查 Threads 授權是否有效
- 查看 Netlify Functions 日誌
- 確認貼文狀態是否為 'scheduled'

## 📊 監控和維護

### 1. 定期檢查
- 每週檢查 GitHub Actions 執行記錄
- 監控 Netlify Functions 執行狀況
- 檢查 Threads 授權狀態

### 2. 效能優化
- 如果排程貼文很多，可以調整檢查頻率
- 監控 API 呼叫次數，避免達到限制

### 3. 備份和恢復
- 定期備份排程貼文資料
- 建立授權狀態的備份機制

## 🎉 完成設定

設定完成後，你的排程貼文系統將具備：

✅ **可靠性**：即使瀏覽器關閉也能執行  
✅ **自動化**：無需人工干預  
✅ **監控**：自動檢查授權狀態  
✅ **恢復**：自動嘗試刷新過期的 token  
✅ **通知**：授權失效時及時通知  

現在你可以放心設定三天後的排程貼文，系統會自動處理所有可能的問題！
