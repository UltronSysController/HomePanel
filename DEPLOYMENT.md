# 部署指南 - HomePanel (Smart Home React Dashboard)

## 概述
本指南說明如何將 Smart Home React Dashboard 部署到 Vercel，包括使用 GitHub Actions 自動化部署流程。

## 架構說明
- **前端應用**：React SPA 部署在 Vercel
- **API 代理**：使用 Vercel Serverless Functions 處理 CORS
- **自動部署**：GitHub Actions 觸發 Vercel 部署

## 先決條件

### 1. GitHub Repository
- Repository 名稱：`HomePanel`
- 確保代碼已推送到 GitHub

### 2. Vercel 帳號
- 註冊 [Vercel](https://vercel.com) 帳號
- 安裝 [Vercel CLI](https://vercel.com/cli)（可選）

### 3. UltronSMART API 憑證
- App ID
- API Key

## 部署步驟

### 步驟 1：初始化 Vercel 專案

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 在專案根目錄執行
vercel

# 按照提示：
# - 選擇帳號
# - 設定專案名稱：homepanel
# - 選擇 Create React App 框架
```

### 步驟 2：獲取 Vercel 憑證

1. **獲取 Vercel Token**：
   - 前往 [Vercel Settings](https://vercel.com/account/tokens)
   - 創建新的 Token
   - 複製 Token 值

2. **獲取專案 ID**：
   ```bash
   # 在專案目錄執行
   vercel link
   cat .vercel/project.json
   ```
   記錄 `projectId` 和 `orgId`

### 步驟 3：設定 GitHub Secrets

在 GitHub Repository 設定以下 Secrets：

1. 前往 Repository → Settings → Secrets and variables → Actions
2. 添加以下 Secrets：

| Secret 名稱 | 說明 | 範例值 |
|------------|------|--------|
| `VERCEL_TOKEN` | Vercel 存取權杖 | `xxx...` |
| `VERCEL_ORG_ID` | Vercel 組織 ID | `team_xxx...` |
| `VERCEL_PROJECT_ID` | Vercel 專案 ID | `prj_xxx...` |
| `REACT_APP_ULTRON_API_KEY` | UltronSMART API Key | `your-api-key` |
| `REACT_APP_ULTRON_APP_ID` | UltronSMART App ID | `your-app-id` |
| `REACT_APP_API_BASE_URL` | API 基礎 URL（選填） | `/api` |

### 步驟 4：設定 Vercel 環境變數

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇你的專案
3. 前往 Settings → Environment Variables
4. 添加以下變數：

```bash
REACT_APP_ULTRON_API_KEY=your-api-key
REACT_APP_ULTRON_APP_ID=your-app-id
```

### 步驟 5：推送代碼觸發部署

```bash
# 添加所有檔案
git add .

# 提交變更
git commit -m "Setup Vercel deployment with GitHub Actions"

# 推送到 GitHub
git push origin main
```

GitHub Actions 會自動：
1. 建置應用程式
2. 部署到 Vercel
3. 主分支推送 → 生產環境
4. PR → 預覽環境

## 檔案結構說明

```
HomePanel/
├── .github/
│   └── workflows/
│       └── deploy-to-vercel.yml    # GitHub Actions 工作流程
├── api/
│   └── proxy.js                    # Vercel Serverless Function (API 代理)
├── src/                            # React 應用程式源碼
├── build/                          # 建置輸出（自動生成）
├── vercel.json                     # Vercel 配置
└── package.json                    # 專案依賴
```

## 重要檔案說明

### vercel.json
- 定義建置和部署配置
- 設定 URL 重寫規則
- 配置 Serverless Functions
- 設定環境變數映射

### api/proxy.js
- Serverless Function 處理 API 代理
- 解決 CORS 問題
- 轉發請求到 UltronSMART API

### .github/workflows/deploy-to-vercel.yml
- 自動化部署流程
- 區分生產和預覽部署
- 處理環境變數注入

## 驗證部署

### 1. 檢查 GitHub Actions
- 前往 Repository → Actions
- 確認工作流程成功執行

### 2. 檢查 Vercel Dashboard
- 前往 [Vercel Dashboard](https://vercel.com/dashboard)
- 確認部署狀態為 "Ready"

### 3. 訪問應用程式
- 生產環境：`https://homepanel.vercel.app`
- 預覽環境：每個 PR 會生成唯一 URL

### 4. 測試 API 連接
1. 開啟應用程式
2. 輸入 API 憑證
3. 測試連接功能

## 故障排除

### 問題：部署失敗
**解決方案**：
1. 檢查 GitHub Actions 日誌
2. 確認所有 Secrets 設定正確
3. 確認 `vercel.json` 格式正確

### 問題：API 連接失敗
**解決方案**：
1. 檢查環境變數是否正確設定
2. 在 Vercel Functions 日誌中查看錯誤
3. 確認 API 憑證有效

### 問題：404 錯誤
**解決方案**：
1. 確認 `vercel.json` 中的 rewrites 設定
2. 檢查 Serverless Function 是否正確部署

## 本地開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm start

# 啟動代理伺服器（另一個終端）
cd proxy-server
npm start
```

## 更新部署

### 自動更新
- 推送到 `main` 分支自動觸發生產部署
- 創建 PR 自動生成預覽部署

### 手動更新
```bash
# 使用 Vercel CLI
vercel --prod
```

## 安全注意事項

1. **不要提交敏感資訊**：
   - API Keys 應使用環境變數
   - 不要提交 `.env` 檔案

2. **定期更新憑證**：
   - 定期輪換 API Keys
   - 更新 GitHub Secrets 和 Vercel 環境變數

3. **監控使用量**：
   - 監控 Vercel Functions 使用量
   - 檢查 API 調用限制

## 相關連結

- [Vercel 文檔](https://vercel.com/docs)
- [GitHub Actions 文檔](https://docs.github.com/en/actions)
- [Create React App 部署指南](https://create-react-app.dev/docs/deployment/)
- [UltronSMART API 文檔](./docs/ultron-api-documentation.md)

## 支援

如有問題，請：
1. 查看 [故障排除](#故障排除) 章節
2. 檢查 Vercel 和 GitHub Actions 日誌
3. 在 GitHub 創建 Issue