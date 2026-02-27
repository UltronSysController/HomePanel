import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Menu, ChevronLeft, Plus, ChevronDown, ChevronUp, Home, GitBranch, Sparkles, GripVertical, RefreshCw } from 'lucide-react';
import useSmartHomeStore from '../store';
import DeviceCard from '../components/DeviceCard';
import DeviceControl from '../components/DeviceControl';
import GroupControl from '../components/GroupControl';
import GroupSelector from '../components/GroupSelector';
import AddRoomModal from '../components/AddRoomModal';
import RoomDeviceGrid from '../components/RoomDeviceGrid';
import RoomNameEditor from '../components/RoomNameEditor';
import WeatherIcon from '../components/WeatherIcon';
import weatherService from '../services/weather';
import { Device, Room, DeviceGroup } from '../types';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
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
    selectGroup,
    clearError,
    updateDeviceRoom,
    updateRoomOrder,
    updateDeviceOrder,
    toggleDevice
  } = useSmartHomeStore();

  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<DeviceGroup | null>(null);
  const [dragOverRoom, setDragOverRoom] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [roomsCollapsed, setRoomsCollapsed] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [outdoorWeather, setOutdoorWeather] = useState<{
    temperature: number;
    location: string;
    description: string;
    weatherCode: number;
  } | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentGroup = groups.find(g => g.groupId === currentGroupId);
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // Get ordered rooms
  const orderedRooms = roomOrder
    .map(id => rooms.find(r => r.id === id))
    .filter((room): room is Room => room !== undefined);

  // Drag and drop for rooms
  const roomDragAndDrop = useDragAndDrop({
    items: orderedRooms,
    onReorder: (newRooms) => {
      const newOrder = newRooms.map(room => room.id);
      updateRoomOrder(newOrder);
    },
    itemKey: (room) => room.id
  });

  useEffect(() => {
    const initializeData = async () => {
      // 如果有保存的 API 配置但沒有 API 實例，重新初始化
      if (apiConfig && !api) {
        setApiConfig(apiConfig);
      }
      
      // 載入群組
      await loadGroups();
      
      // 如果有已保存的群組ID，自動載入該群組的設備
      const store = useSmartHomeStore.getState();
      if (store.currentGroupId && store.api) {
        await store.selectGroup(store.currentGroupId);
      }
    };
    initializeData();
  }, [apiConfig, api, setApiConfig, loadGroups]);
  
  // 獲取室外天氣
  useEffect(() => {
    const fetchWeather = async () => {
      const weather = await weatherService.getWeather();
      if (weather) {
        setOutdoorWeather({
          temperature: weather.temperature,
          location: weather.location,
          description: weather.description,
          weatherCode: weather.weatherCode
        });
      }
    };
    
    // 初次載入
    fetchWeather();
    
    // 每 1 小時更新一次
    const interval = setInterval(fetchWeather, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // 手動更新設備狀態
  const updateDeviceStates = async () => {
    const store = useSmartHomeStore.getState();
    if (store.currentGroupId && store.api) {
      setIsRefreshing(true);
      try {
        await store.refreshDeviceStates(store.currentGroupId);
      } catch (error) {
        console.error('Failed to refresh device states:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // 自動更新設備狀態（當開啟時）
  useEffect(() => {
    if (!currentGroupId || !api || !autoRefresh) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    // 立即更新一次
    updateDeviceStates();

    // 設定定時器
    refreshIntervalRef.current = setInterval(updateDeviceStates, 30000); // 30秒

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [currentGroupId, api, autoRefresh]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 3000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleDeviceClick = (device: Device) => {
    setSelectedDevice(device);
  };
  
  const handleGroupClick = (group: DeviceGroup) => {
    setSelectedGroup(group);
  };

  const handleDeviceToggle = (device: Device, e: React.MouseEvent) => {
    e.stopPropagation();
    if (device.online && device.type !== 'sensor' && device.type !== 'camera') {
      toggleDevice(device.sn);
    }
  };

  const handleDrop = (e: React.DragEvent, roomId: string) => {
    e.preventDefault();
    setDragOverRoom(null);
    const deviceSn = e.dataTransfer.getData('deviceSn');
    if (deviceSn) {
      updateDeviceRoom(deviceSn, roomId);
    }
  };

  const handleDragOver = (e: React.DragEvent, roomId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverRoom(roomId);
  };

  const handleDragLeave = () => {
    setDragOverRoom(null);
  };

  const handleScroll = () => {
    setIsScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Hide scrollbar after 1 second of no scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
  };

  // Group devices by room
  const devicesByRoom: { [key: string]: Device[] } = {};
  const unassignedDevices: Device[] = [];

  Object.values(devices).forEach(device => {
    if (device.roomId) {
      if (!devicesByRoom[device.roomId]) {
        devicesByRoom[device.roomId] = [];
      }
      devicesByRoom[device.roomId].push(device);
    } else {
      unassignedDevices.push(device);
    }
  });

  return (
    <div className="home-page">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Top Controls */}
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
            {/* Home and Automation */}
            <button
              onClick={() => setSelectedRoomId(null)}
              className={`nav-item ${!selectedRoomId ? 'active' : ''}`}
            >
              <Home size={18} className="nav-icon" />
              <span className="nav-text">家</span>
            </button>
            
            <button className="nav-item">
              <GitBranch size={18} className="nav-icon" />
              <span className="nav-text">自動化</span>
            </button>
            
            <button className="nav-item" onClick={() => navigate('/ai-life')}>
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
                  onClick={() => setShowAddRoom(true)}
                  title="新增房間"
                >
                  <Plus size={14} />
                </button>
                <button 
                  className="section-control-btn"
                  onClick={() => setRoomsCollapsed(!roomsCollapsed)}
                  title={roomsCollapsed ? "展開房間列表" : "收摺房間列表"}
                >
                  {roomsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
              </div>
            </div>
            <div className={`nav-list ${roomsCollapsed ? 'collapsed' : ''}`}>
              {orderedRooms.map((room, index) => (
                <button
                  key={room.id}
                  className={`nav-item room-drop-zone ${dragOverRoom === room.id ? 'drag-over' : ''} ${selectedRoomId === room.id ? 'active' : ''} ${roomDragAndDrop.draggedIndex === index ? 'dragging' : ''} ${roomDragAndDrop.dragOverIndex === index ? 'drag-over-reorder' : ''}`}
                  onClick={() => setSelectedRoomId(room.id)}
                  onDrop={(e) => {
                    handleDrop(e, room.id);
                    roomDragAndDrop.handleDrop(index)(e);
                  }}
                  onDragOver={(e) => {
                    handleDragOver(e, room.id);
                    roomDragAndDrop.handleDragOver(e);
                  }}
                  onDragEnter={roomDragAndDrop.handleDragEnter(index)}
                  onDragLeave={() => {
                    handleDragLeave();
                    roomDragAndDrop.handleDragLeave();
                  }}
                  draggable
                  onDragStart={roomDragAndDrop.handleDragStart(index)}
                  onDragEnd={roomDragAndDrop.handleDragEnd}
                >
                  <span className="drag-handle">
                    <GripVertical size={14} />
                  </span>
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
        
        {/* Powered by ULTRON */}
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
        <header className="page-header">
          <div className="header-content">
            {selectedRoom ? (
              <div className="room-header-editor">
              <h1 
                className="room-header-with-back"
                onClick={() => setSelectedRoomId(null)}
              >
                <span className="back-chevron">‹</span>
                <RoomNameEditor
                  roomId={selectedRoom.id}
                  roomName={selectedRoom.name}
                  roomIcon={selectedRoom.icon}
                  className="room-header-icon"
                  isCollapsed={sidebarCollapsed}
                />
              </h1>
              </div>
            ) : (
            <button 
              className="title-button"
              onClick={() => setShowGroupSelector(true)}
            >
              <h1>{currentGroup?.name || '我的家'}</h1>
              <span className="dropdown-arrow">⌵</span>
            </button>
            )}
          </div>
          <div className="header-controls">
            <button
              className={`refresh-button ${autoRefresh ? 'active' : ''} ${isRefreshing ? 'refreshing' : ''}`}
              onClick={() => {
                if (!autoRefresh) {
                  // 如果從關閉狀態開啟，立即執行一次更新
                  updateDeviceStates();
                }
                setAutoRefresh(!autoRefresh);
              }}
              title={autoRefresh ? '關閉自動更新' : '開啟自動更新'}
              disabled={isRefreshing}
            >
              <RefreshCw size={18} className={isRefreshing ? 'spin' : ''} />
              <span className="refresh-text">{autoRefresh ? '自動更新' : '手動更新'}</span>
            </button>
            {!autoRefresh && (
              <button
                className="refresh-now-button"
                onClick={updateDeviceStates}
                title="立即更新"
                disabled={isRefreshing}
              >
                <RefreshCw size={18} className={isRefreshing ? 'spin' : ''} />
              </button>
            )}
          </div>
        </header>

        {selectedRoom ? (
          // Room-specific view
          <>
            {/* Environmental Data Section */}
            {(() => {
              const roomDevices = devicesByRoom[selectedRoom.id] || [];
              const sensors = roomDevices.filter(d => d.type === 'sensor');
              const hasEnvironmentalData = sensors.length > 0;
              
              // 診斷日誌
              console.log('Room devices:', roomDevices);
              console.log('Sensors found:', sensors);
              sensors.forEach(sensor => {
                console.log(`Sensor ${sensor.name} state:`, sensor.state);
              });
              
              return hasEnvironmentalData ? (
                <section className="environmental-section">
                  <h2 className="section-title">環境</h2>
                  <div className="environmental-grid">
                    {sensors.map(sensor => (
                      <div key={sensor.sn} className="environmental-card">
                        {sensor.state?.temperature !== undefined && (
                          <div className="env-item">
                            <div className="env-value">
                              <span className="env-number">{sensor.state.temperature}°</span>
                              <span className="env-label">溫度</span>
                            </div>
                          </div>
                        )}
                        {sensor.state?.humidity !== undefined && (
                          <div className="env-item">
                            <div className="env-value">
                              <span className="env-number">{sensor.state.humidity}%</span>
                              <span className="env-label">濕度</span>
                            </div>
                          </div>
                        )}
                        {sensor.state?.pm25 !== undefined && (
                          <div className="env-item">
                            <div className="env-value">
                              <span className="env-number">{sensor.state.pm25}</span>
                              <span className="env-label">PM2.5</span>
                            </div>
                          </div>
                        )}
                        {sensor.state?.co2 !== undefined && (
                          <div className="env-item">
                            <div className="env-value">
                              <span className="env-number">{sensor.state.co2}</span>
                              <span className="env-label">CO₂ ppm</span>
                            </div>
                          </div>
                        )}
                        {sensor.state?.illuminance !== undefined && (
                          <div className="env-item">
                            <div className="env-value">
                              <span className="env-number">{sensor.state.illuminance}</span>
                              <span className="env-label">Lux</span>
                            </div>
                          </div>
                        )}
                        <div className="env-name">{sensor.name}</div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null;
            })()}

            {/* Scenes Section */}
            <section className="scenes-section">
              <h2 className="section-title">情境</h2>
              <div className="scenes-grid">
                <button className="scene-button morning">
                  <span className="scene-icon">☀️</span>
                  <span className="scene-name">早安</span>
                </button>
                <button className="scene-button night">
                  <span className="scene-icon">🌙</span>
                  <span className="scene-name">晚安</span>
                </button>
              </div>
            </section>

            {/* Categorized Devices */}
            {(() => {
              const roomDevices = devicesByRoom[selectedRoom.id] || [];
              const lights = roomDevices.filter(d => d.type === 'light');
              const airConditioners = roomDevices.filter(d => d.type === 'airConditioner');
              const others = roomDevices.filter(d => !['light', 'airConditioner', 'sensor'].includes(d.type));
              
              return (
                <>
                  {airConditioners.length > 0 && (
                    <section className="devices-section">
                      <h2 className="section-title">環境電器</h2>
                      <RoomDeviceGrid
                        roomId={selectedRoom.id}
                        devices={airConditioners}
                        deviceOrder={deviceOrder[selectedRoom.id] || []}
                        onDeviceClick={handleDeviceClick}
                        onGroupClick={handleGroupClick}
                        onDeviceToggle={handleDeviceToggle}
                        onReorderDevices={updateDeviceOrder}
                      />
                    </section>
                  )}
                  
                  {lights.length > 0 && (
                    <section className="devices-section">
                      <h2 className="section-title">電燈</h2>
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
                    <section className="devices-section">
                      <h2 className="section-title">其他</h2>
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
          // General home view
          <>
            <section className="favorites-section">
              <h2 className="section-title">喜好項目</h2>
              <div className="favorites-grid">
                {/* Temperature Control */}
                <div className="temperature-card">
                  <div className="temp-info">
                    <span className="temp-label">室外溫度</span>
                    <div className="temp-main">
                      {outdoorWeather && (
                        <WeatherIcon weatherCode={outdoorWeather.weatherCode} size={36} />
                      )}
                      <div className="temp-value">
                        {outdoorWeather ? `${outdoorWeather.temperature}°` : '--°'}
                      </div>
                    </div>
                    {outdoorWeather && (
                      <div className="temp-details">
                        <span className="temp-description">{outdoorWeather.description}</span>
                        <span className="temp-location">{outdoorWeather.location}</span>
                      </div>
                    )}
                  </div>
                  <div className="temp-circle-bg"></div>
                </div>

                {/* Scene Buttons */}
                <button className="scene-button morning">
                  <span className="scene-icon">☀️</span>
                  <span className="scene-name">早安</span>
                </button>

                <button className="scene-button night">
                  <span className="scene-icon">🌙</span>
                  <span className="scene-name">晚安</span>
                </button>
              </div>
            </section>

            {/* Rooms with devices */}
            {orderedRooms.map(room => {
              const roomDevices = devicesByRoom[room.id] || [];
              if (roomDevices.length === 0) return null;

              return (
                <section key={room.id} className="room-section">
                  <h2 
                    className="section-title clickable-room-title"
                    onClick={() => setSelectedRoomId(room.id)}
                  >
                    {room.name} <span className="room-chevron">›</span>
                  </h2>
                  <RoomDeviceGrid
                    roomId={room.id}
                    devices={roomDevices}
                    deviceOrder={deviceOrder[room.id] || []}
                    onDeviceClick={handleDeviceClick}
                    onGroupClick={handleGroupClick}
                    onDeviceToggle={handleDeviceToggle}
                    onReorderDevices={updateDeviceOrder}
                  />
                </section>
              );
            })}

            {/* Unassigned Devices */}
            {unassignedDevices.length > 0 && (
              <section className="room-section">
                <h2 className="section-title">其他</h2>
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
      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">載入中...</div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="error-toast">{error}</div>
      )}

      {/* Device Control Modal */}
      {selectedDevice && (
        <DeviceControl
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
        />
      )}
      
      {/* Group Control Modal */}
      {selectedGroup && (
        <GroupControl
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      )}

      {/* Group Selector Modal */}
      {showGroupSelector && (
        <GroupSelector onClose={() => setShowGroupSelector(false)} />
      )}

      {/* Add Room Modal */}
      {showAddRoom && (
        <AddRoomModal onClose={() => setShowAddRoom(false)} />
      )}
    </div>
  );
};

export default HomePage;