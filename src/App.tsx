import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AILifePage from './pages/AILifePage';
import ConfigPage from './pages/ConfigPage';
import useSmartHomeStore from './store';
import './styles/global.css';

function App() {
  const { apiConfig, api, setApiConfig } = useSmartHomeStore();

  useEffect(() => {
    // 如果有 API 配置但還沒初始化 API，則初始化
    if (apiConfig && !api) {
      setApiConfig(apiConfig);
    }
  }, [apiConfig, api, setApiConfig]);

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={apiConfig ? <HomePage /> : <Navigate to="/config" />} 
        />
        <Route
          path="/ai-life"
          element={apiConfig ? <AILifePage /> : <Navigate to="/config" />}
        />
        <Route path="/config" element={<ConfigPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;