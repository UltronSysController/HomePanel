import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ChevronRight } from 'lucide-react';
import useSmartHomeStore from '../store';
import Sidebar from '../components/Sidebar';
import DeviceControl from '../components/DeviceControl';
import GroupControl from '../components/GroupControl';
import GroupSelector from '../components/GroupSelector';
import AddRoomModal from '../components/AddRoomModal';
import RoomDeviceGrid from '../components/RoomDeviceGrid';
import WeatherIcon from '../components/WeatherIcon';
import AutomationPage from './AutomationPage';
import EnergyPage from './EnergyPage';
import weatherService from '../services/weather';
import { Device, Room, DeviceGroup, TabId } from '../types';
import './HomePage.css';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    groups,
    currentGroupId,
    devices,
    rooms,
    roomOrder,
    deviceOrder,
    isLoading,
    error,
    api,
    apiConfig,
    setApiConfig,
    loadGroups,
    clearError,
    updateRoom,
    deleteRoom,
    updateDeviceOrder,
    toggleDevice,
  } = useSmartHomeStore();

  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<DeviceGroup | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [outdoorWeather, setOutdoorWeather] = useState<{
    temperature: number;
    location: string;
    description: string;
    weatherCode: number;
  } | null>(null);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentGroup = groups.find(g => g.groupId === currentGroupId);
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  const orderedRooms = roomOrder
    .map(id => rooms.find(r => r.id === id))
    .filter((room): room is Room => room !== undefined);

  // Initialize data
  useEffect(() => {
    const init = async () => {
      if (apiConfig && !api) setApiConfig(apiConfig);
      await loadGroups();
      const store = useSmartHomeStore.getState();
      if (store.currentGroupId && store.api) {
        await store.selectGroup(store.currentGroupId);
      }
    };
    init();
  }, [apiConfig, api, setApiConfig, loadGroups]);

  // Weather
  useEffect(() => {
    const fetchWeather = async () => {
      const weather = await weatherService.getWeather();
      if (weather) {
        setOutdoorWeather({
          temperature: weather.temperature,
          location: weather.location,
          description: weather.description,
          weatherCode: weather.weatherCode,
        });
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh
  const refreshDevices = useCallback(async () => {
    const store = useSmartHomeStore.getState();
    if (store.currentGroupId && store.api) {
      setIsRefreshing(true);
      try {
        await store.refreshDeviceStates(store.currentGroupId);
      } catch (e) {
        console.error('Refresh failed:', e);
      } finally {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!currentGroupId || !api || !autoRefresh) {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      return;
    }
    refreshDevices();
    refreshIntervalRef.current = setInterval(refreshDevices, 30000);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [currentGroupId, api, autoRefresh, refreshDevices]);

  // Clear error
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => clearError(), 3000);
      return () => clearTimeout(t);
    }
  }, [error, clearError]);

  // Group devices by room
  const devicesByRoom: Record<string, Device[]> = {};
  const unassignedDevices: Device[] = [];
  Object.values(devices).forEach(device => {
    if (device.roomId) {
      if (!devicesByRoom[device.roomId]) devicesByRoom[device.roomId] = [];
      devicesByRoom[device.roomId].push(device);
    } else {
      unassignedDevices.push(device);
    }
  });

  // Device counts summary
  const allDevices = Object.values(devices);
  const onlineCount = allDevices.filter(d => d.online).length;
  const onCount = allDevices.filter(d => d.state?.power).length;

  const handleDeviceClick = (device: Device) => setSelectedDevice(device);
  const handleGroupClick = (group: DeviceGroup) => setSelectedGroup(group);
  const handleDeviceToggle = (device: Device, e: React.MouseEvent) => {
    e.stopPropagation();
    if (device.online && device.type !== 'sensor' && device.type !== 'camera') {
      toggleDevice(device.sn);
    }
  };

  const handleDeviceDropToRoom = (roomId: string) => {
    // Handle from dataTransfer if available
  };

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        rooms={orderedRooms}
        selectedRoomId={selectedRoomId}
        onSelectRoom={setSelectedRoomId}
        onAddRoom={() => setShowAddRoom(true)}
        onUpdateRoom={updateRoom}
        onDeleteRoom={deleteRoom}
        onDeviceDropToRoom={handleDeviceDropToRoom}
        dragOverRoomId={null}
      />

      <main className="app-main">
        {/* === HOME TAB === */}
        {activeTab === 'home' && (
          <div className="page-content">
            {/* Header */}
            <header className="home-header">
              <div className="header-left">
                {selectedRoom ? (
                  <button className="back-btn" onClick={() => setSelectedRoomId(null)}>
                    <span className="back-icon">‹</span>
                    <h1 className="page-title">
                      <span className="title-icon">{selectedRoom.icon}</span>
                      {selectedRoom.name}
                    </h1>
                  </button>
                ) : (
                  <button className="home-title-btn" onClick={() => setShowGroupSelector(true)}>
                    <h1 className="page-title">{currentGroup?.name || '我的家'}</h1>
                    <span className="title-chevron">⌵</span>
                  </button>
                )}
              </div>
              <div className="header-actions">
                <button
                  className={`action-btn ${autoRefresh ? 'active' : ''}`}
                  onClick={() => {
                    if (!autoRefresh) refreshDevices();
                    setAutoRefresh(!autoRefresh);
                  }}
                  title={autoRefresh ? '停止自動更新' : '開始自動更新'}
                >
                  <RefreshCw size={18} className={isRefreshing ? 'spinning' : ''} />
                </button>
                {!autoRefresh && (
                  <button
                    className="action-btn"
                    onClick={refreshDevices}
                    disabled={isRefreshing}
                    title="立即重新整理"
                  >
                    <RefreshCw size={18} className={isRefreshing ? 'spinning' : ''} />
                  </button>
                )}
              </div>
            </header>

            {/* Status Summary */}
            {!selectedRoom && (
              <div className="home-status">
                <div className="status-weather">
                  {outdoorWeather && (
                    <>
                      <WeatherIcon weatherCode={outdoorWeather.weatherCode} size={20} />
                      <span className="weather-temp">{outdoorWeather.temperature}°</span>
                      <span className="weather-desc">{outdoorWeather.description}</span>
                      <span className="weather-loc">{outdoorWeather.location}</span>
                    </>
                  )}
                </div>
                <div className="status-devices">
                  <span className="status-pill">
                    {onCount > 0 ? `${onCount} 個裝置開啟` : '所有裝置已關閉'}
                  </span>
                  <span className="status-pill subtle">
                    {onlineCount}/{allDevices.length} 上線
                  </span>
                </div>
              </div>
            )}

            {/* Scenes */}
            {!selectedRoom && (
              <section className="home-scenes">
                <div className="scenes-scroll">
                  <button className="scene-pill">
                    <span className="scene-pill-icon">☀️</span>
                    <span>早安</span>
                  </button>
                  <button className="scene-pill">
                    <span className="scene-pill-icon">🌙</span>
                    <span>晚安</span>
                  </button>
                  <button className="scene-pill">
                    <span className="scene-pill-icon">🏠</span>
                    <span>回家</span>
                  </button>
                  <button className="scene-pill">
                    <span className="scene-pill-icon">🚪</span>
                    <span>離家</span>
                  </button>
                  <button className="scene-pill">
                    <span className="scene-pill-icon">🎬</span>
                    <span>電影模式</span>
                  </button>
                  <button className="scene-pill">
                    <span className="scene-pill-icon">📖</span>
                    <span>閱讀模式</span>
                  </button>
                </div>
              </section>
            )}

            {/* Room View */}
            {selectedRoom ? (
              <>
                {/* Environmental sensors */}
                {(() => {
                  const roomDevs = devicesByRoom[selectedRoom.id] || [];
                  const sensors = roomDevs.filter(d => d.type === 'sensor');
                  if (sensors.length === 0) return null;
                  return (
                    <section className="env-section">
                      <div className="env-grid">
                        {sensors.map(sensor => (
                          <React.Fragment key={sensor.sn}>
                            {sensor.state?.temperature != null && (
                              <div className="env-card">
                                <span className="env-value">{sensor.state.temperature}°C</span>
                                <span className="env-label">溫度</span>
                              </div>
                            )}
                            {sensor.state?.humidity != null && (
                              <div className="env-card">
                                <span className="env-value">{sensor.state.humidity}%</span>
                                <span className="env-label">濕度</span>
                              </div>
                            )}
                            {sensor.state?.pm25 != null && (
                              <div className="env-card">
                                <span className="env-value">{sensor.state.pm25}</span>
                                <span className="env-label">PM2.5</span>
                              </div>
                            )}
                            {sensor.state?.co2 != null && (
                              <div className="env-card">
                                <span className="env-value">{sensor.state.co2}</span>
                                <span className="env-label">CO₂</span>
                              </div>
                            )}
                            {sensor.state?.illuminance != null && (
                              <div className="env-card">
                                <span className="env-value">{sensor.state.illuminance}</span>
                                <span className="env-label">Lux</span>
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </section>
                  );
                })()}

                {/* Room devices by category */}
                {(() => {
                  const roomDevs = devicesByRoom[selectedRoom.id] || [];
                  const lights = roomDevs.filter(d => d.type === 'light');
                  const acs = roomDevs.filter(d => d.type === 'airConditioner');
                  const others = roomDevs.filter(d => !['light', 'airConditioner', 'sensor'].includes(d.type));

                  return (
                    <>
                      {acs.length > 0 && (
                        <section className="device-section">
                          <h2 className="section-title">空調</h2>
                          <RoomDeviceGrid
                            roomId={selectedRoom.id}
                            devices={acs}
                            deviceOrder={deviceOrder[selectedRoom.id] || []}
                            onDeviceClick={handleDeviceClick}
                            onGroupClick={handleGroupClick}
                            onDeviceToggle={handleDeviceToggle}
                            onReorderDevices={updateDeviceOrder}
                          />
                        </section>
                      )}
                      {lights.length > 0 && (
                        <section className="device-section">
                          <h2 className="section-title">燈光</h2>
                          <RoomDeviceGrid
                            roomId={selectedRoom.id}
                            devices={lights}
                            deviceOrder={deviceOrder[selectedRoom.id] || []}
                            onDeviceClick={handleDeviceClick}
                            onGroupClick={handleGroupClick}
                            onDeviceToggle={handleDeviceToggle}
                            onReorderDevices={updateDeviceOrder}
                          />
                        </section>
                      )}
                      {others.length > 0 && (
                        <section className="device-section">
                          <h2 className="section-title">其他裝置</h2>
                          <RoomDeviceGrid
                            roomId={selectedRoom.id}
                            devices={others}
                            deviceOrder={deviceOrder[selectedRoom.id] || []}
                            onDeviceClick={handleDeviceClick}
                            onGroupClick={handleGroupClick}
                            onDeviceToggle={handleDeviceToggle}
                            onReorderDevices={updateDeviceOrder}
                          />
                        </section>
                      )}
                    </>
                  );
                })()}
              </>
            ) : (
              /* Home overview — rooms with devices */
              <>
                {orderedRooms.map(room => {
                  const roomDevs = devicesByRoom[room.id] || [];
                  if (roomDevs.length === 0) return null;
                  return (
                    <section key={room.id} className="device-section">
                      <div className="section-header">
                        <h2
                          className="section-title clickable"
                          onClick={() => setSelectedRoomId(room.id)}
                        >
                          <span className="section-icon">{room.icon}</span>
                          {room.name}
                          <ChevronRight size={16} className="section-chevron" />
                        </h2>
                      </div>
                      <RoomDeviceGrid
                        roomId={room.id}
                        devices={roomDevs}
                        deviceOrder={deviceOrder[room.id] || []}
                        onDeviceClick={handleDeviceClick}
                        onGroupClick={handleGroupClick}
                        onDeviceToggle={handleDeviceToggle}
                        onReorderDevices={updateDeviceOrder}
                      />
                    </section>
                  );
                })}

                {unassignedDevices.length > 0 && (
                  <section className="device-section">
                    <h2 className="section-title">未分配</h2>
                    <RoomDeviceGrid
                      roomId="unassigned"
                      devices={unassignedDevices}
                      deviceOrder={deviceOrder['unassigned'] || []}
                      onDeviceClick={handleDeviceClick}
                      onGroupClick={handleGroupClick}
                      onDeviceToggle={handleDeviceToggle}
                      onReorderDevices={updateDeviceOrder}
                    />
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {/* === AUTOMATION TAB === */}
        {activeTab === 'automation' && <AutomationPage />}

        {/* === ENERGY TAB === */}
        {activeTab === 'energy' && <EnergyPage />}

        {/* === SETTINGS TAB === */}
        {activeTab === 'settings' && (
          <div className="page-content">
            <header className="home-header">
              <h1 className="page-title">設定</h1>
            </header>
            <div className="settings-grid">
              <button className="settings-card" onClick={() => navigate('/config')}>
                <span className="settings-card-icon">🔑</span>
                <div className="settings-card-info">
                  <span className="settings-card-title">API 設定</span>
                  <span className="settings-card-desc">管理 UltronSMART API 連線</span>
                </div>
                <ChevronRight size={18} />
              </button>
              <button className="settings-card" onClick={() => setShowGroupSelector(true)}>
                <span className="settings-card-icon">🏠</span>
                <div className="settings-card-info">
                  <span className="settings-card-title">選擇家居</span>
                  <span className="settings-card-desc">{currentGroup?.name || '未選擇'}</span>
                </div>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Loading */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner" />
            <span className="loading-text">載入中...</span>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && <div className="error-toast">{error}</div>}

      {/* Modals */}
      {selectedDevice && (
        <DeviceControl device={selectedDevice} onClose={() => setSelectedDevice(null)} />
      )}
      {selectedGroup && (
        <GroupControl group={selectedGroup} onClose={() => setSelectedGroup(null)} />
      )}
      {showGroupSelector && (
        <GroupSelector onClose={() => setShowGroupSelector(false)} />
      )}
      {showAddRoom && (
        <AddRoomModal onClose={() => setShowAddRoom(false)} />
      )}
    </div>
  );
};

export default HomePage;
