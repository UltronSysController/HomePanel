# Smart Home React Dashboard

一個仿照 Apple Home 設計的智慧家庭管理介面，使用 React 開發，支援 UltronSMART Cloud Personal API。

## 功能特色

- 🏠 **Apple Home 風格介面**：採用玻璃擬態設計，美觀現代
- 📱 **響應式設計**：完美支援桌面、平板和手機
- 🔐 **安全的 API 整合**：透過 proxy server 處理 CORS 問題
- 🎯 **直覺的設備控制**：點擊即可開關設備
- 🏷️ **房間管理**：將設備組織到不同房間，支援自訂名稱和圖標
- 🌡️ **即時狀態顯示**：顯示溫度、濕度等感測器數據
- 📐 **可收摺側邊欄**：節省螢幕空間，專注於內容
- 🎨 **自訂房間圖標**：豐富的 emoji 圖標選擇

## 快速開始

### 步驟 1：下載專案

```bash
git clone [repository-url]
cd smart-home-react
```

### 步驟 2：安裝依賴套件

```bash
# 安裝 React 應用程式依賴
npm install

# 安裝 Proxy Server 依賴
cd proxy-server
npm install
cd ..
```

### 步驟 3：啟動 Proxy Server

在第一個終端機視窗中：

```bash
cd proxy-server
npm start
```

Proxy server 會在 port 3001 啟動。

### 步驟 4：啟動 React 應用程式

在第二個終端機視窗中：

```bash
npm start
```

應用程式會在瀏覽器中自動開啟 (http://localhost:3000)。

### 步驟 5：設定 API 憑證

1. 在瀏覽器中開啟應用程式
2. 輸入您的 UltronSMART Personal API 憑證：
   - **App ID**：從 UltronSMART Cloud 開發者平台取得
   - **API Key**：從 UltronSMART Cloud 開發者平台取得
3. 點擊「儲存並測試連線」
4. 成功連線後會自動跳轉到主頁面

## 使用說明

### 介面操作

#### 側邊欄控制
- 點擊右上角的 `<` 按鈕可收摺/展開側邊欄
- 收摺後只顯示圖標，節省螢幕空間
- 展開時可看到完整的房間名稱和功能選項

#### 房間管理
- **新增房間**：點擊「房間」旁的 `+` 按鈕
- **編輯房間名稱**（側邊欄展開時）：
  - 點擊房間名稱即可編輯
  - 按 Enter 儲存，按 ESC 取消
- **更換房間圖標**（側邊欄展開時）：
  - 點擊房間圖標
  - 從豐富的 emoji 選單中選擇
- **調整房間順序**：拖曳房間項目上下移動

#### 設備控制
- **開關設備**：點擊設備卡片上的電源按鈕
- **調整設備**：點擊設備卡片進入詳細控制
  - 燈光：調整亮度、色溫
  - 冷氣：調整溫度、模式
- **分配設備到房間**：拖曳設備卡片到側邊欄的房間

#### 群組切換
- 點擊頂部的群組名稱
- 從下拉選單選擇不同的群組

### 資料持久化
- 房間配置會自動儲存
- 設備的房間分配會記憶
- 自訂的設備名稱會保留
- API 設定會安全地儲存在本地

## 專案結構

```
smart-home-react/
├── src/
│   ├── components/        # React 元件
│   ├── pages/            # 頁面元件
│   ├── services/         # API 服務
│   ├── store/            # Zustand 狀態管理
│   ├── styles/           # 全域樣式
│   └── types/            # TypeScript 類型定義
├── proxy-server/         # CORS proxy server
└── public/               # 靜態資源
```

## 系統需求

- Node.js 14.0 或以上版本
- npm 或 yarn
- 現代瀏覽器（Chrome、Firefox、Safari、Edge）

## 故障排除

### 「無法連上這個網站」錯誤

確保 proxy server 正在運行：

```bash
cd proxy-server
npm start
```

### API 連線失敗

1. 確認 API 憑證正確
2. 確認網路連線正常
3. 檢查 proxy server 的 console 輸出

## 部署

### 本地部署

按照上述「快速開始」步驟操作即可。

### 生產環境部署

1. 建置生產版本：

```bash
npm run build
```

2. 部署 `build` 資料夾到您的網頁伺服器
3. 部署 proxy server 到支援 Node.js 的主機

## 技術特點

- **React 18** 與 **TypeScript** 開發
- **Zustand** 狀態管理，支援持久化儲存
- **Framer Motion** 提供流暢動畫
- **Axios** 處理 API 請求，含重試機制
- **React Beautiful DnD** 實現拖放功能
- 模組化 CSS 與響應式設計

## 開發者資訊

詳細的開發筆記和技術細節請參考 [CLAUDE.md](./CLAUDE.md)

## 授權

MIT License