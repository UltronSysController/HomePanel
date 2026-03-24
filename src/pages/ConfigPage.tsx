import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import useSmartHomeStore from '../store';
import './ConfigPage.css';

const ConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const { apiConfig, setApiConfig } = useSmartHomeStore();

  const [formData, setFormData] = useState({
    appId: apiConfig?.appId || '',
    apiKey: apiConfig?.apiKey || '',
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.appId || !formData.apiKey) {
      setErrorMessage('請填寫完整的 API 設定');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setErrorMessage('');

    try {
      const config = {
        apiType: 'personal' as const,
        appId: formData.appId,
        apiKey: formData.apiKey,
      };

      setApiConfig(config);

      const { default: UltronSmartAPI } = await import('../services/api');
      const api = new UltronSmartAPI(config);
      const isConnected = await api.testConnection();

      if (isConnected) {
        setTestResult('success');
        setTimeout(() => navigate('/'), 1500);
      } else {
        throw new Error('API 憑證無效或連線失敗');
      }
    } catch (error) {
      setTestResult('error');
      setErrorMessage(error instanceof Error ? error.message : '連線測試失敗');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="config-page">
      <div className="config-card">
        {apiConfig && (
          <button className="config-back" onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
            <span>返回</span>
          </button>
        )}

        <div className="config-header">
          <h1 className="config-title">API 設定</h1>
          <p className="config-subtitle">
            請輸入您的 UltronSMART Personal API 憑證
          </p>
        </div>

        <form onSubmit={handleSubmit} className="config-form">
          <div className="form-group">
            <label htmlFor="appId">App ID</label>
            <input
              id="appId"
              type="text"
              value={formData.appId}
              onChange={e => setFormData({ ...formData, appId: e.target.value })}
              placeholder="輸入您的 App ID"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="apiKey">API Key</label>
            <input
              id="apiKey"
              type="password"
              value={formData.apiKey}
              onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder="輸入您的 API Key"
              required
            />
          </div>

          {errorMessage && (
            <div className="config-message error">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {testResult === 'success' && (
            <div className="config-message success">
              <CheckCircle size={18} />
              <span>連線成功！正在跳轉...</span>
            </div>
          )}

          <button type="submit" className="config-submit" disabled={testing}>
            {testing ? (
              <span>測試連線中...</span>
            ) : (
              <>
                <Save size={18} />
                <span>儲存並測試連線</span>
              </>
            )}
          </button>
        </form>

        <div className="config-help">
          <h3>開始使用前的準備</h3>
          <div className="config-notice">
            <strong>重要：</strong>請確保 proxy server 正在運行
            <code>cd proxy-server && npm start</code>
          </div>

          <h3>如何取得 API 憑證？</h3>
          <ol>
            <li>登入 UltronSMART Cloud 開發者平台</li>
            <li>前往「個人 API」頁面</li>
            <li>複製您的 App ID 和 API Key</li>
            <li>將憑證貼到上方表單中</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ConfigPage;
