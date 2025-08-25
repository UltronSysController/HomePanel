# Smart Home Dashboard Proxy Server

這是 Smart Home Dashboard 的代理伺服器，用於解決 CORS 問題並安全地與 UltronSMART API 通訊。

## 安裝

```bash
cd proxy-server
npm install
```

## 設定

1. 複製環境變數檔案：
```bash
cp .env.example .env
```

2. 編輯 `.env` 檔案（如需要）

## 執行

### 開發模式（自動重啟）
```bash
npm run dev
```

### 生產模式
```bash
npm start
```

## API 使用方式

代理伺服器會將所有 `/api/*` 的請求轉發到 UltronSMART API。

例如：
- `http://localhost:3001/api/app/v1/AppGetDevices` → `https://api.ultroncloud.com/app/v1/AppGetDevices`
- `http://localhost:3001/api/usr/org/v1/GetAppZones` → `https://api.ultroncloud.com/usr/org/v1/GetAppZones`

### 必要的 Headers

請求時需要包含以下 headers：
- `X-Api-Key`: 您的 API Key
- `Ultron-Cloud-Appid`: 您的 App ID
- `orgid`: 您的組織 ID

### 範例請求

```javascript
fetch('http://localhost:3001/api/app/v1/AppGetDevices', {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': 'your-api-key',
        'Ultron-Cloud-Appid': 'your-app-id',
        'orgid': 'your-org-id'
    }
})
.then(response => response.json())
.then(data => console.log(data));
```

## 健康檢查

訪問 `http://localhost:3001/health` 確認伺服器是否正常運行。

## 部署建議

### 使用 PM2
```bash
npm install -g pm2
pm2 start server.js --name smart-home-proxy
pm2 save
pm2 startup
```

### 使用 Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

## 安全建議

1. 在生產環境中，考慮添加額外的安全措施：
   - API 請求速率限制
   - 請求來源驗證
   - API Key 加密儲存
   - HTTPS 支援

2. 不要將敏感資訊（如 API Keys）儲存在前端代碼中

## 故障排除

1. **EADDRINUSE 錯誤**：端口已被占用，請更改 `.env` 中的 PORT 設定

2. **連接被拒絕**：確認 UltronSMART API 是否可訪問

3. **401 未授權**：檢查 API 憑證是否正確