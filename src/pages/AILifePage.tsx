import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Menu, ChevronLeft, ChevronDown, ChevronUp, Home, Sparkles, Brain, Zap, Thermometer, Droplets, Wind, Wifi, WifiOff, Power, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useSmartHomeStore from '../store';
import RoomNameEditor from '../components/RoomNameEditor';
import WeatherIcon from '../components/WeatherIcon';
import weatherService from '../services/weather';
import { generateSuggestions } from '../services/ai-suggestion-engine';
import { Device, Room } from '../types';
import './AILifePage.css';

interface WeatherData {
  temperature: number;
  location: string;
  description: string;
  weatherCode: number;
  humidity?: number;
  windSpeed?: number;
}

const AILifePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    devices,
    rooms,
    roomOrder,
    api,
    apiConfig,
    setApiConfig,
    loadGroups,
    isLoading,
  } = useSmartHomeStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [roomsCollapsed, setRoomsCollapsed] = useState(false);
  const [outdoorWeather, setOutdoorWeather] = useState<WeatherData | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const orderedRooms = roomOrder
    .map(id => rooms.find(r => r.id === id))
    .filter((room): room is Room => room !== undefined);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      if (apiConfig && !api) {
        setApiConfig(apiConfig);
      }
      await loadGroups();
      const store = useSmartHomeStore.getState();
      if (store.currentGroupId && store.api) {
        await store.selectGroup(store.currentGroupId);
      }
    };
    initializeData();
  }, [apiConfig, api, setApiConfig, loadGroups]);

  // Fetch weather
  useEffect(() => {
    const fetchWeather = async () => {
      const weather = await weatherService.getWeather();
      if (weather) {
        setOutdoorWeather(weather);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Group devices by room
  const devicesByRoom = useMemo(() => {
    const result: Record<string, Device[]> = {};
    Object.values(devices).forEach(device => {
      if (device.roomId) {
        if (!result[device.roomId]) {
          result[device.roomId] = [];
        }
        result[device.roomId].push(device);
      }
    });
    return result;
  }, [devices]);

  // Generate AI suggestions
  const suggestions = useMemo(() => {
    const currentHour = new Date().getHours();
    return generateSuggestions({
      devices,
      rooms,
      devicesByRoom,
      weather: outdoorWeather,
      currentHour,
    });
  }, [devices, rooms, devicesByRoom, outdoorWeather]);

  const visibleSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.id));

  const dismissSuggestion = useCallback((id: string) => {
    setDismissedSuggestions(prev => new Set(prev).add(id));
  }, []);

  // Compute summary stats
  const summaryStats = useMemo(() => {
    const allDevices = Object.values(devices);
    const activeDevices = allDevices.filter(d => d.state?.power === true);
    const offlineDevices = allDevices.filter(d => !d.online);
    const sensors = allDevices.filter(d => d.type === 'sensor');

    const temps = sensors.map(s => s.state?.temperature).filter((t): t is number => t !== undefined);
    const humidities = sensors.map(s => s.state?.humidity).filter((h): h is number => h !== undefined);
    const avgTemp = temps.length > 0 ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length * 10) / 10 : null;
    const avgHumidity = humidities.length > 0 ? Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length) : null;

    const totalWatts = allDevices.reduce((sum, d) => sum + (d.state?.watt || 0), 0);

    return {
      totalDevices: allDevices.length,
      activeDevices: activeDevices.length,
      offlineDevices: offlineDevices.length,
      avgTemp,
      avgHumidity,
      totalWatts: Math.round(totalWatts),
    };
  }, [devices]);

  // Room comfort data
  const roomComfortData = useMemo(() => {
    return orderedRooms.map(room => {
      const roomDevices = devicesByRoom[room.id] || [];
      const sensors = roomDevices.filter(d => d.type === 'sensor');
      const activeCount = roomDevices.filter(d => d.state?.power === true).length;

      let temp: number | null = null;
      let humidity: number | null = null;
      let co2: number | null = null;
      let pm25: number | null = null;

      for (const sensor of sensors) {
        if (sensor.state?.temperature !== undefined && temp === null) temp = sensor.state.temperature;
        if (sensor.state?.humidity !== undefined && humidity === null) humidity = sensor.state.humidity;
        if (sensor.state?.co2 !== undefined && co2 === null) co2 = sensor.state.co2;
        if (sensor.state?.pm25 !== undefined && pm25 === null) pm25 = sensor.state.pm25;
      }

      // Comfort level
      let issues = 0;
      if (temp !== null && (temp < 18 || temp > 30)) issues++;
      if (humidity !== null && (humidity < 30 || humidity > 75)) issues++;
      if (co2 !== null && co2 > 1000) issues++;
      if (pm25 !== null && pm25 > 35) issues++;

      const comfortLevel: 'good' | 'fair' | 'poor' = issues >= 2 ? 'poor' : issues >= 1 ? 'fair' : 'good';
      const hasSensorData = temp !== null || humidity !== null || co2 !== null || pm25 !== null;

      return {
        room,
        temp,
        humidity,
        co2,
        pm25,
        comfortLevel,
        hasSensorData,
        activeCount,
        totalCount: roomDevices.length,
      };
    });
  }, [orderedRooms, devicesByRoom]);

  const handleScroll = () => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
  };

  // Default scenes
  const defaultScenes = [
    { id: 'morning', name: '早安', icon: '☀️', className: 'morning' },
    { id: 'night', name: '晚安', icon: '🌙', className: 'night' },
    { id: 'away', name: '外出', icon: '🚪', className: 'away' },
    { id: 'home', name: '回家', icon: '🏠', className: 'home' },
    { id: 'movie', name: '電影', icon: '🎬', className: 'movie' },
    { id: 'reading', name: '閱讀', icon: '📚', className: 'reading' },
  ];

  return (
    <div className="home-page">
      {/* Mobile Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${showMobileSidebar ? 'visible' : ''}`}
        onClick={() => setShowMobileSidebar(false)}
      />

      {/* Sidebar — same structure as HomePage */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${showMobileSidebar ? 'show-mobile' : ''}`}>
        <div className="sidebar-top-controls">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
          <button
            onClick={() => navigate('/config')}
            className="settings-top-button"
            title="設定"
          >
            <Settings size={20} />
          </button>
        </div>
        <div className="sidebar-content">
          <div className="nav-list">
            <button
              onClick={() => navigate('/')}
              className="nav-item"
            >
              <Home size={18} className="nav-icon" />
              <span className="nav-text">家</span>
            </button>

            <button className="nav-item active">
              <Sparkles size={18} className="nav-icon" />
              <span className="nav-text">AI Life</span>
            </button>
          </div>

          <div className="nav-divider"></div>

          <div className="nav-section">
            <div className="nav-section-header">
              <span className="nav-section-title">房間</span>
              <div className="section-controls">
                <button
                  className="section-control-btn"
                  onClick={() => setRoomsCollapsed(!roomsCollapsed)}
                  title={roomsCollapsed ? '展開房間列表' : '收摺房間列表'}
                >
                  {roomsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
              </div>
            </div>
            <div className={`nav-list ${roomsCollapsed ? 'collapsed' : ''}`}>
              {orderedRooms.map((room) => (
                <button
                  key={room.id}
                  className="nav-item"
                  onClick={() => navigate('/', { state: { roomId: room.id } })}
                >
                  <RoomNameEditor
                    roomId={room.id}
                    roomName={room.name}
                    roomIcon={room.icon}
                    isCollapsed={sidebarCollapsed}
                  />
                  {devicesByRoom[room.id] && (
                    <span className="device-count">{devicesByRoom[room.id].length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <a
            href="https://www.ultronsmart.com"
            target="_blank"
            rel="noopener noreferrer"
            className="powered-by"
          >
            <span className="powered-text">Powered by </span>ULTRON
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${isScrolling ? 'scrolling' : ''}`}
        onScroll={handleScroll}
      >
        {/* Mobile Header */}
        <div className="mobile-header">
          <button className="mobile-menu-btn" onClick={() => setShowMobileSidebar(true)}>
            <Menu size={22} />
          </button>
          <span className="mobile-header-title">AI Life</span>
          <button className="mobile-header-action" onClick={() => navigate('/config')}>
            <Settings size={20} />
          </button>
        </div>

        <header className="page-header">
          <div className="header-content">
            <h1 className="ai-life-title">
              <Sparkles size={28} className="ai-title-icon" />
              AI Life
            </h1>
          </div>
        </header>

        {/* Home Summary Card */}
        <motion.section
          className="ai-summary-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="section-title">家庭總覽</h2>
          <div className="ai-summary-card">
            <div className="summary-stats-grid">
              {/* Active Devices */}
              <div className="summary-stat">
                <div className="stat-icon-wrapper stat-icon-active">
                  <Power size={20} />
                </div>
                <div className="stat-content">
                  <span className="stat-value">{summaryStats.activeDevices}</span>
                  <span className="stat-label">運行中 / {summaryStats.totalDevices} 台設備</span>
                </div>
              </div>

              {/* Indoor Temperature */}
              <div className="summary-stat">
                <div className="stat-icon-wrapper stat-icon-temp">
                  <Thermometer size={20} />
                </div>
                <div className="stat-content">
                  <span className="stat-value">
                    {summaryStats.avgTemp !== null ? `${summaryStats.avgTemp}°C` : '--'}
                  </span>
                  <span className="stat-label">室內平均溫度</span>
                </div>
              </div>

              {/* Indoor Humidity */}
              <div className="summary-stat">
                <div className="stat-icon-wrapper stat-icon-humidity">
                  <Droplets size={20} />
                </div>
                <div className="stat-content">
                  <span className="stat-value">
                    {summaryStats.avgHumidity !== null ? `${summaryStats.avgHumidity}%` : '--'}
                  </span>
                  <span className="stat-label">室內平均濕度</span>
                </div>
              </div>

              {/* Outdoor Weather */}
              <div className="summary-stat">
                <div className="stat-icon-wrapper stat-icon-weather">
                  {outdoorWeather ? (
                    <WeatherIcon weatherCode={outdoorWeather.weatherCode} size={20} />
                  ) : (
                    <Wind size={20} />
                  )}
                </div>
                <div className="stat-content">
                  <span className="stat-value">
                    {outdoorWeather ? `${outdoorWeather.temperature}°C` : '--'}
                  </span>
                  <span className="stat-label">
                    {outdoorWeather ? `${outdoorWeather.description} · ${outdoorWeather.location}` : '室外天氣'}
                  </span>
                </div>
              </div>

              {/* Energy */}
              <div className="summary-stat">
                <div className="stat-icon-wrapper stat-icon-energy">
                  <Zap size={20} />
                </div>
                <div className="stat-content">
                  <span className="stat-value">{summaryStats.totalWatts}W</span>
                  <span className="stat-label">目前總耗電</span>
                </div>
              </div>

              {/* Offline */}
              {summaryStats.offlineDevices > 0 && (
                <div className="summary-stat">
                  <div className="stat-icon-wrapper stat-icon-offline">
                    <WifiOff size={20} />
                  </div>
                  <div className="stat-content">
                    <span className="stat-value stat-value-warning">{summaryStats.offlineDevices}</span>
                    <span className="stat-label">設備離線</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Smart Suggestions */}
        <motion.section
          className="ai-suggestions-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="section-title">
            <Brain size={22} className="section-title-icon" />
            智慧建議
          </h2>
          {visibleSuggestions.length > 0 ? (
            <div className="suggestion-list">
              <AnimatePresence>
                {visibleSuggestions.map((suggestion) => (
                  <motion.div
                    key={suggestion.id}
                    className={`suggestion-card suggestion-${suggestion.type}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.3 }}
                    layout
                  >
                    <span className="suggestion-icon">{suggestion.icon}</span>
                    <div className="suggestion-content">
                      <span className="suggestion-title">{suggestion.title}</span>
                      <span className="suggestion-desc">{suggestion.description}</span>
                    </div>
                    <div className="suggestion-actions">
                      {suggestion.actionLabel && (
                        <button className="suggestion-action-btn">
                          {suggestion.actionLabel}
                        </button>
                      )}
                      {suggestion.dismissible && (
                        <button
                          className="suggestion-dismiss-btn"
                          onClick={() => dismissSuggestion(suggestion.id)}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="no-suggestions">
              <span className="no-suggestions-icon">✨</span>
              <span className="no-suggestions-text">一切良好！目前沒有建議</span>
            </div>
          )}
        </motion.section>

        {/* Room Environment Overview */}
        <motion.section
          className="ai-rooms-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="section-title">房間環境</h2>
          <div className="room-comfort-grid">
            {roomComfortData.map(({ room, temp, humidity, co2, pm25, comfortLevel, hasSensorData, activeCount, totalCount }) => (
              <motion.div
                key={room.id}
                className="room-comfort-card"
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate('/', { state: { roomId: room.id } })}
              >
                <div className="comfort-header">
                  <span className="comfort-room-icon">{room.icon}</span>
                  <span className="comfort-room-name">{room.name}</span>
                  {hasSensorData && (
                    <span className={`comfort-indicator comfort-${comfortLevel}`} />
                  )}
                </div>

                {hasSensorData ? (
                  <div className="comfort-data">
                    {temp !== null && (
                      <div className="comfort-item">
                        <Thermometer size={14} />
                        <span>{temp}°C</span>
                      </div>
                    )}
                    {humidity !== null && (
                      <div className="comfort-item">
                        <Droplets size={14} />
                        <span>{humidity}%</span>
                      </div>
                    )}
                    {co2 !== null && (
                      <div className="comfort-item">
                        <Wind size={14} />
                        <span>{co2} ppm</span>
                      </div>
                    )}
                    {pm25 !== null && (
                      <div className="comfort-item comfort-item-small">
                        <span className="comfort-pm-label">PM2.5</span>
                        <span>{pm25}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="comfort-no-data">
                    <span>無感應器資料</span>
                  </div>
                )}

                <div className="comfort-footer">
                  <span className="comfort-device-count">
                    {activeCount > 0 ? (
                      <><Wifi size={12} /> {activeCount}/{totalCount} 運行中</>
                    ) : (
                      <>{totalCount} 台設備</>
                    )}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Quick Scenes */}
        <motion.section
          className="ai-scenes-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="section-title">快速情境</h2>
          <div className="ai-scenes-grid">
            {defaultScenes.map(scene => (
              <motion.button
                key={scene.id}
                className={`ai-scene-button ${scene.className}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="ai-scene-icon">{scene.icon}</span>
                <span className="ai-scene-name">{scene.name}</span>
              </motion.button>
            ))}
          </div>
        </motion.section>
      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">載入中...</div>
        </div>
      )}

      {/* Bottom Tab Bar (Mobile) */}
      <nav className="bottom-tab-bar">
        <button className="tab-item" onClick={() => navigate('/')}>
          <span className="tab-icon"><Home size={22} /></span>
          <span className="tab-label">首頁</span>
        </button>
        <button className="tab-item active">
          <span className="tab-icon"><Sparkles size={22} /></span>
          <span className="tab-label">AI Life</span>
        </button>
        <button className="tab-item" onClick={() => navigate('/config')}>
          <span className="tab-icon"><Settings size={22} /></span>
          <span className="tab-label">設定</span>
        </button>
      </nav>
    </div>
  );
};

export default AILifePage;
