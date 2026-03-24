import React, { useState, useEffect } from 'react';
import { Plus, Zap, Clock, Thermometer, Power, Bell, Trash2, ChevronRight } from 'lucide-react';
import useSmartHomeStore from '../store';
import { Automation } from '../types';
import './AutomationPage.css';

const AUTOMATION_TEMPLATES = [
  { name: '溫度控制', icon: '🌡️', desc: '當溫度超過閾值時自動控制空調' },
  { name: '定時開關', icon: '⏰', desc: '設定時間自動開啟/關閉設備' },
  { name: '離家模式', icon: '🚪', desc: '離開家時自動關閉所有設備' },
  { name: '濕度控制', icon: '💧', desc: '根據濕度自動控制除溼機' },
  { name: '日出日落', icon: '🌅', desc: '根據日出日落自動調整燈光' },
  { name: '空氣品質', icon: '🌿', desc: '空氣品質不佳時啟動空氣清淨機' },
  { name: '睡眠模式', icon: '😴', desc: '就寢時自動調暗燈光並調整溫度' },
  { name: '動態感應', icon: '👋', desc: '偵測到動態時自動開燈' },
];

const AutomationPage: React.FC = () => {
  const { api, currentGroupId } = useSmartHomeStore();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (api && currentGroupId) {
      loadAutomations();
    }
  }, [api, currentGroupId]);

  const loadAutomations = async () => {
    if (!api || !currentGroupId) return;
    setLoading(true);
    try {
      const result = await api.listAutomations(currentGroupId);
      if (Array.isArray(result)) {
        setAutomations(result as unknown as Automation[]);
      }
    } catch (e) {
      console.error('Failed to load automations:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomation = async (id: string, enabled: boolean) => {
    if (!api) return;
    try {
      await api.updateAutomation(id, { enabled: !enabled });
      setAutomations(prev =>
        prev.map(a => (a.id === id ? { ...a, enabled: !enabled } : a))
      );
    } catch (e) {
      console.error('Failed to toggle automation:', e);
    }
  };

  const deleteAutomation = async (id: string) => {
    if (!api) return;
    try {
      await api.deleteAutomation(id);
      setAutomations(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error('Failed to delete automation:', e);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sensor_range': return <Thermometer size={18} />;
      case 'timebased': return <Clock size={18} />;
      case 'state': return <Power size={18} />;
      case 'activity': return <Bell size={18} />;
      default: return <Zap size={18} />;
    }
  };

  return (
    <div className="page-content">
      <header className="home-header">
        <h1 className="page-title">自動化</h1>
        <button
          className="action-btn"
          onClick={() => setShowTemplates(!showTemplates)}
          title="新增自動化"
        >
          <Plus size={20} />
        </button>
      </header>

      {/* Templates */}
      {showTemplates && (
        <section className="auto-templates">
          <h2 className="section-title" style={{ marginBottom: 'var(--space-3)' }}>建議的自動化</h2>
          <div className="template-grid">
            {AUTOMATION_TEMPLATES.map((tpl) => (
              <button key={tpl.name} className="template-card">
                <span className="template-icon">{tpl.icon}</span>
                <div className="template-info">
                  <span className="template-name">{tpl.name}</span>
                  <span className="template-desc">{tpl.desc}</span>
                </div>
                <ChevronRight size={16} className="template-chevron" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Active Automations */}
      <section className="auto-list-section">
        {loading ? (
          <div className="auto-loading">
            <div className="loading-spinner" />
          </div>
        ) : automations.length === 0 ? (
          <div className="empty-state">
            <Zap size={48} />
            <h3>尚未設定自動化</h3>
            <p>點擊右上角的 + 按鈕建立自動化規則，讓您的智慧家庭自動運作。</p>
          </div>
        ) : (
          <div className="auto-list">
            {automations.map((auto) => (
              <div key={auto.id} className={`auto-card ${auto.enabled ? 'enabled' : 'disabled'}`}>
                <div className="auto-card-icon">{getTypeIcon(auto.type)}</div>
                <div className="auto-card-info">
                  <span className="auto-card-name">{auto.name}</span>
                  <span className="auto-card-desc">
                    {auto.description || auto.type}
                    {auto.lastTriggered && (
                      <> · 上次觸發：{new Date(auto.lastTriggered).toLocaleDateString()}</>
                    )}
                  </span>
                </div>
                <div className="auto-card-actions">
                  <button
                    className={`toggle-switch ${auto.enabled ? 'active' : ''}`}
                    onClick={() => toggleAutomation(auto.id, auto.enabled)}
                    aria-label={auto.enabled ? '停用' : '啟用'}
                  />
                  <button
                    className="auto-delete-btn"
                    onClick={() => deleteAutomation(auto.id)}
                    title="刪除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AutomationPage;
