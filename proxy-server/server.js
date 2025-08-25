const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中間件
app.use(cors());
app.use(express.json());

// 記錄請求
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// 健康檢查
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 代理 API 請求
app.all('/api/*', async (req, res) => {
    try {
        // 從請求路徑中提取實際的 API 端點
        const endpoint = req.path.replace('/api', '');
        
        // 根據端點決定使用哪個 API 伺服器
        let apiUrl;
        if (endpoint.startsWith('/usr/v4/') || endpoint.startsWith('/device/v1/')) {
            // 個人版 API 端點
            apiUrl = `https://api.ultroncloud.com${endpoint}`;
        } else {
            // 企業版 API 端點
            apiUrl = `https://cms-doraemon.appspot.com${endpoint}`;
        }
        
        console.log('Proxying request to:', apiUrl);
        console.log('Headers:', req.headers);
        
        // 記錄請求體（特別是 SendZoneCommand 和 SendCommand）
        if (endpoint.includes('SendZoneCommand') || endpoint.includes('SendCommand')) {
            console.log(`${endpoint} Request Body:`, JSON.stringify(req.body, null, 2));
        }
        
        // 準備請求配置
        const config = {
            method: req.method,
            url: apiUrl,
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': req.headers['x-api-key'],
                'Ultron-Cloud-Appid': req.headers['ultron-cloud-appid'],
                'orgid': req.headers['orgid']
            }
        };
        
        // 只有在有請求體時才添加 data
        if (req.body && Object.keys(req.body).length > 0) {
            config.data = req.body;
        }
        
        // 發送請求到 UltronSMART API
        const response = await axios(config);
        
        console.log('API Response:', response.status, JSON.stringify(response.data, null, 2));
        
        // 特別記錄 GetZones 的詳細資訊
        if (endpoint.includes('GetZones') && response.data.zones) {
            console.log('Detailed Zone Information:');
            Object.entries(response.data.zones).forEach(([zoneId, zone]) => {
                console.log(`\nZone ID: ${zoneId}`);
                console.log(`Zone Name: ${zone.name}`);
                console.log(`Members:`, JSON.stringify(zone.members, null, 2));
            });
        }
        
        // 如果是錯誤回應，記錄詳細資訊
        if (response.status >= 400) {
            console.log('Error Response Details:', {
                status: response.status,
                statusText: response.statusText,
                data: response.data
            });
        }
        
        // 返回響應
        res.status(response.status).json(response.data);
        
    } catch (error) {
        console.error('Proxy error:', error.message);
        
        if (error.response) {
            // API 返回錯誤
            console.error('API Error Response:', error.response.data);
            console.error('API Error Status:', error.response.status);
            console.error('API Error Headers:', error.response.headers);
            
            // 嘗試解析錯誤內容
            let errorData = error.response.data;
            if (typeof errorData === 'string') {
                // 如果是字符串，可能需要特殊處理
                errorData = { message: errorData };
            }
            
            res.status(error.response.status).json({
                result: errorData.result || error.response.status,
                error: errorData.error || 'API Error',
                message: errorData.message || error.response.statusText || error.message,
                data: errorData,
                details: error.response.data
            });
        } else if (error.request) {
            // 請求發送失敗
            res.status(503).json({
                result: 503,
                error: 'Service Unavailable',
                message: 'Unable to reach UltronSMART API'
            });
        } else {
            // 其他錯誤
            res.status(500).json({
                result: 500,
                error: 'Internal Server Error',
                message: error.message
            });
        }
    }
});

// 404 處理
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
    console.log('Ready to proxy requests to UltronSMART API');
});