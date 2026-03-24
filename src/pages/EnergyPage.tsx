import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Zap, TrendingUp, TrendingDown, Plug, Activity } from 'lucide-react';
import useSmartHomeStore from '../store';
import { EnergyInsights } from '../types';
import './EnergyPage.css';

type Period = 'today' | 'week' | 'month';

const EnergyPage: React.FC = () => {
  const { api, currentGroupId, devices } = useSmartHomeStore();
  const [period, setPeriod] = useState<Period>('today');
  const [insights, setInsights] = useState<EnergyInsights | null>(null);
  // Reserved for future device-specific usage detail view
  const [realtimePower, setRealtimePower] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const loadEnergyData = useCallback(async () => {
    if (!api || !currentGroupId) return;
    setLoading(true);
    try {
      const [powerResult, insightsResult] = await Promise.allSettled([
        api.getRealtimePower(currentGroupId),
        api.getEnergyInsights(currentGroupId, period),
      ]);

      if (powerResult.status === 'fulfilled' && powerResult.value != null) {
        setRealtimePower(typeof powerResult.value === 'number' ? powerResult.value : null);
      }
      if (insightsResult.status === 'fulfilled' && insightsResult.value) {
        setInsights(insightsResult.value as EnergyInsights);
      }
    } catch (e) {
      console.error('Failed to load energy data:', e);
    } finally {
      setLoading(false);
    }
  }, [api, currentGroupId, period]);

  useEffect(() => {
    loadEnergyData();
    const interval = setInterval(loadEnergyData, 60000);
    return () => clearInterval(interval);
  }, [loadEnergyData]);

  // Count devices with power monitoring
  const powerDevices = Object.values(devices).filter(
    d => d.online && (d.state?.watt != null || d.type === 'outlet')
  );

  const totalWatts = powerDevices.reduce((sum, d) => sum + (d.state?.watt || 0), 0);

  return (
    <div className="page-content">
      <header className="home-header">
        <h1 className="page-title">能源</h1>
        <div className="period-tabs">
          {(['today', 'week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              className={`period-tab ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'today' ? '今日' : p === 'week' ? '本週' : '本月'}
            </button>
          ))}
        </div>
      </header>

      {/* Real-time Summary */}
      <div className="energy-summary">
        <div className="energy-stat-card primary">
          <div className="stat-icon">
            <Zap size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">
              {realtimePower != null ? `${realtimePower}` : totalWatts > 0 ? `${totalWatts}` : '--'}
            </span>
            <span className="stat-unit">W</span>
            <span className="stat-label">即時功率</span>
          </div>
        </div>

        <div className="energy-stat-card">
          <div className="stat-icon">
            <Activity size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">
              {insights?.totalConsumption != null
                ? insights.totalConsumption.toFixed(1)
                : '--'}
            </span>
            <span className="stat-unit">kWh</span>
            <span className="stat-label">
              {period === 'today' ? '今日用電' : period === 'week' ? '本週用電' : '本月用電'}
            </span>
          </div>
        </div>

        <div className="energy-stat-card">
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">
              {insights?.totalCost != null ? `$${insights.totalCost.toFixed(0)}` : '--'}
            </span>
            <span className="stat-label">預估電費</span>
          </div>
        </div>

        <div className="energy-stat-card">
          <div className="stat-icon">
            <Plug size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{powerDevices.length}</span>
            <span className="stat-label">監控中裝置</span>
          </div>
        </div>
      </div>

      {/* Device Breakdown */}
      <section className="energy-breakdown">
        <h2 className="section-title" style={{ marginBottom: 'var(--space-4)' }}>裝置用電</h2>
        {loading && powerDevices.length === 0 ? (
          <div className="auto-loading">
            <div className="loading-spinner" />
          </div>
        ) : powerDevices.length === 0 ? (
          <div className="empty-state">
            <BarChart3 size={48} />
            <h3>尚無能源資料</h3>
            <p>連接支援電力監控的裝置後，即可在此查看用電資訊。</p>
          </div>
        ) : (
          <div className="breakdown-list">
            {powerDevices
              .sort((a, b) => (b.state?.watt || 0) - (a.state?.watt || 0))
              .map((device) => {
                const watt = device.state?.watt || 0;
                const maxWatt = Math.max(...powerDevices.map(d => d.state?.watt || 0), 1);
                const pct = (watt / maxWatt) * 100;
                return (
                  <div key={device.sn} className="breakdown-item">
                    <div className="breakdown-info">
                      <span className="breakdown-name">
                        {device.displayName || device.name}
                      </span>
                      <span className="breakdown-value">{watt}W</span>
                    </div>
                    <div className="breakdown-bar-bg">
                      <div
                        className="breakdown-bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {device.state?.kwh != null && (
                      <span className="breakdown-kwh">{device.state.kwh} kWh</span>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* Insights / Recommendations */}
      {insights?.recommendations && insights.recommendations.length > 0 && (
        <section className="energy-tips">
          <h2 className="section-title" style={{ marginBottom: 'var(--space-3)' }}>節能建議</h2>
          <div className="tips-list">
            {insights.recommendations.map((tip, i) => (
              <div key={i} className="tip-card">
                <TrendingDown size={16} className="tip-icon" />
                <span className="tip-text">{tip}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default EnergyPage;
