import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Lightbulb, Palette, Power, Plug, Fan, Circle, Wind, Lock, Settings, Sliders, Zap, Activity } from 'lucide-react';
import { Device } from '../types';
import useSmartHomeStore from '../store';
import DeviceSettings from './DeviceSettings';
import './DeviceControl.css';

// Apple Home Style Vertical Switch with Sliding Effect
const AppleVerticalSwitch: React.FC<{ 
  isOn: boolean; 
  onToggle: () => void;
  deviceType?: string;
}> = ({ isOn, onToggle, deviceType = 'outlet' }) => {
  // 根據設備類型選擇圖標
  const getIcon = (size: number = 36, color: string) => {
    const props = { size, strokeWidth: 1.5, color };
    switch (deviceType) {
      case 'light':
        return <Lightbulb {...props} />;
      case 'outlet':
        return <Plug {...props} />;
      case 'fan':
        return <Fan {...props} />;
      case 'switch':
        return <Power {...props} />;
      case 'airConditioner':
        return <Wind {...props} />;
      case 'lock':
        return <Lock {...props} />;
      default:
        return <Power {...props} />;
    }
  };

  return (
    <button 
      className={`apple-vertical-switch ${isOn ? 'on' : 'off'}`}
      onClick={onToggle}
    >
      {/* 滑動背景與圖標 */}
      <div className="switch-indicator">
        <div className="indicator-icon">
          {getIcon(32, isOn ? 'white' : 'rgba(0, 0, 0, 0.85)')}
        </div>
      </div>
    </button>
  );
};

interface DeviceControlProps {
  device: Device;
  onClose: () => void;
}

const DeviceControl: React.FC<DeviceControlProps> = ({ device, onClose }) => {
  const { devices, toggleDevice, updateDeviceState, getDeviceState } = useSmartHomeStore();
  
  // Get live device from store
  const liveDevice = devices[device.sn] || device;
  
  // Debug logging for UT3702
  useEffect(() => {
    if (device.sn.includes('UT3702')) {
      console.log('=== UT3702 Debug Info ===');
      console.log('Device SN:', device.sn);
      console.log('Device:', device);
      console.log('Live Device:', liveDevice);
      console.log('Device State:', liveDevice.state);
      console.log('Has watt?', liveDevice.state?.watt);
      console.log('Has voltage?', liveDevice.state?.voltage);
      console.log('Has current?', liveDevice.state?.current);
      console.log('Has kwh?', liveDevice.state?.kwh);
      console.log('Device Type:', device.type);
      console.log('========================');
    }
  }, [device.sn, liveDevice]);
  
  // 使用初始值，避免重複更新
  const [isOn, setIsOn] = useState(device.state?.power || false);
  const [brightness, setBrightness] = useState(device.state?.brightness || 100);
  const [temperature, setTemperature] = useState(device.state?.temperature || 26);
  const [colorTemp, setColorTemp] = useState(device.state?.colorTemperature || 4000);
  const [selectedColor, setSelectedColor] = useState('#FFA726');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showColorTempPicker, setShowColorTempPicker] = useState(false);
  const [customColorTemp, setCustomColorTemp] = useState(device.state?.colorTemperature || 4000);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // 用於防抖的 ref
  const brightnessTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const colorTempTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBrightnessRef = useRef(device.state?.brightness || 100);
  const lastColorTempRef = useRef(device.state?.colorTemperature || 4000);
  const isMountedRef = useRef(true);

  const isLight = device.type === 'light';
  
  // 從 traits 或實際狀態判斷功能
  const hasBrightness = (device.traits?.includes('Brightness')) || 
                       device.state?.brightness !== undefined || 
                       liveDevice.state?.brightness !== undefined;
  
  // Check for color temperature - be more flexible since traits might not be provided
  const hasColorTemp = (device.traits?.includes('ColorSetting') || 
                       device.traits?.includes('ColorTemperature') ||
                       device.traits?.includes('ColorControl')) || 
                      device.state?.colorTemperature !== undefined || 
                      liveDevice.state?.colorTemperature !== undefined ||
                      // Also check if it's a light with brightness (likely supports color temp)
                      (isLight && hasBrightness);
                      
  const isColorLight = (device.traits?.includes('ColorSetting')) || 
                      device.state?.color !== undefined || 
                      liveDevice.state?.color !== undefined;
  
  const isAC = device.type === 'airConditioner' || (device.traits && device.traits.includes('TemperatureSetting'));
  const isDehumidifier = device.type === 'dehumidifier';
  const isSimpleSwitch = device.type === 'switch' || device.type === 'outlet' || device.type === 'fan';
  
  // 所有可以開關的設備都使用 toggle switch
  const canToggle = device.type !== 'sensor' && device.type !== 'camera';
  
  // 從設備屬性中獲取色溫範圍
  const colorTempMin = device.state?.colorTemperatureRange?.min || 2700; // 暖白
  const colorTempMax = device.state?.colorTemperatureRange?.max || 6500; // 冷白

  // 組件卸載時清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // 清理 timeouts
  useEffect(() => {
    return () => {
      if (brightnessTimeoutRef.current) {
        clearTimeout(brightnessTimeoutRef.current);
      }
      if (colorTempTimeoutRef.current) {
        clearTimeout(colorTempTimeoutRef.current);
      }
    };
  }, []);
  
  // 只在非操作時同步關鍵狀態（電源狀態）
  useEffect(() => {
    if (!isDragging && !isUpdating && liveDevice.state) {
      // 只更新電源狀態，避免影響用戶正在調整的參數
      if (liveDevice.state.power !== undefined && liveDevice.state.power !== isOn) {
        setIsOn(liveDevice.state.power);
      }
    }
  }, [liveDevice.state?.power]);

  // 預設顏色選項
  const colorPresets = [
    { color: '#FFA726', name: '暖黃' },
    { color: '#FFFFFF', name: '白色' },
    { color: '#FFE082', name: '暖白' },
    { color: '#FFEB3B', name: '黃色' },
    { color: '#B3E5FC', name: '冷白' }
  ];

  const handlePowerToggle = async () => {
    try {
      await toggleDevice(device.sn);
      // State will be updated automatically via the live device sync
    } catch (error) {
      console.error('Toggle failed:', error);
    }
  };

  // 根據色溫獲取顏色
  const getColorForTemp = (temp: number) => {
    if (temp <= 3000) return '#FFB74D'; // 暖黃
    if (temp <= 4000) return '#FFD54F'; // 淺黃
    if (temp <= 5000) return '#FFF9C4'; // 自然白
    if (temp <= 5500) return '#F5F5F5'; // 純白
    return '#E1F5FE'; // 冷白
  };

  // 處理亮度拖動
  const handleBrightnessStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    let currentBrightness = brightness;
    
    const updateBrightness = (clientY: number) => {
      const y = clientY - rect.top;
      const height = rect.height;
      const newBrightness = Math.max(0, Math.min(100, Math.round((1 - y / height) * 100)));
      currentBrightness = newBrightness;
      setBrightness(newBrightness);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      updateBrightness(clientY);
    };

    const handleEnd = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      setIsDragging(false);
      
      // Send final brightness value after drag ends
      handleBrightnessChange(currentBrightness);
    };

    // 初始更新
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    updateBrightness(clientY);

    // 添加事件監聽
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  };

  const handleBrightnessChange = useCallback(async (value: number) => {
    // Only send update if value actually changed significantly (避免微小變化)
    if (Math.abs(value - lastBrightnessRef.current) < 2) return;
    
    lastBrightnessRef.current = value;
    setIsUpdating(true);
    
    // Handle power state based on brightness
    if (value === 0 && isOn) {
      setIsOn(false);
      await toggleDevice(device.sn);
    } else if (value > 0 && !isOn) {
      setIsOn(true);
      await toggleDevice(device.sn);
      // Wait a bit for power on before setting brightness
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Send brightness update
    if (value > 0) {
      try {
        await updateDeviceState(device.sn, { brightness: value });
      } catch (error) {
        console.error('Failed to update brightness:', error);
      }
    }
    
    // 延遲解除更新狀態，避免立即被覆蓋
    setTimeout(() => {
      if (isMountedRef.current) {
        setIsUpdating(false);
      }
    }, 1000);
  }, [device.sn, isOn, updateDeviceState, toggleDevice]);

  const handleColorTempChange = useCallback((value: number) => {
    // 避免重複設置相同值
    if (value === lastColorTempRef.current) return;
    
    setColorTemp(value);
    lastColorTempRef.current = value;
    setIsUpdating(true);
    
    // 如果燈是關閉的，自動開啟
    if (!isOn) {
      setIsOn(true);
      // 先發送開啟指令
      toggleDevice(device.sn);
    }
    
    // 清除之前的 timeout
    if (colorTempTimeoutRef.current) {
      clearTimeout(colorTempTimeoutRef.current);
    }
    
    // 設置新的 timeout，延遲 500ms 發送請求（增加延遲避免頻繁更新）
    colorTempTimeoutRef.current = setTimeout(async () => {
      try {
        await updateDeviceState(device.sn, { colorTemperature: value });
      } catch (error) {
        console.error('Failed to update color temperature:', error);
      } finally {
        // 延遲解除更新狀態
        setTimeout(() => {
          if (isMountedRef.current) {
            setIsUpdating(false);
          }
        }, 1000);
      }
    }, 500);
  }, [device.sn, isOn, updateDeviceState, toggleDevice]);

  // 獲取房間名稱
  const { rooms } = useSmartHomeStore();
  const roomName = rooms.find(r => r.id === device.roomId)?.name || '未分配';

  return (
    <div className="device-control-overlay" onClick={onClose}>
      <div className="device-control-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{liveDevice.name}</h2>
          <p className="device-status">{isLoading ? '載入中...' : (isOn ? '開啟' : '關閉')}</p>
        </div>

        {/* Universal Toggle Switch for all devices except lights and dehumidifiers */}
        {canToggle && !isLight && !isDehumidifier && (
          <div className="simple-switch-controls">
            <div className="power-section">
              <AppleVerticalSwitch 
                isOn={isOn} 
                onToggle={handlePowerToggle}
                deviceType={device.type}
              />
            </div>
            
            {/* Compact Power Meter for Smart Outlets */}
            {device.type === 'outlet' && liveDevice.state && 
             (liveDevice.state.watt !== undefined || 
              liveDevice.state.voltage !== undefined || 
              liveDevice.state.current !== undefined || 
              liveDevice.state.powerMeter !== undefined) && (
              <div className="power-meter-compact">
                <div className="power-meter-row">
                  {(liveDevice.state.watt !== undefined || liveDevice.state.powerMeter?.watt !== undefined) && (
                    <div className="power-metric">
                      <span className="metric-value">
                        {Math.round(liveDevice.state.watt || liveDevice.state.powerMeter?.watt || 0)}
                      </span>
                      <span className="metric-unit">W</span>
                    </div>
                  )}
                  {(liveDevice.state.voltage !== undefined || liveDevice.state.powerMeter?.voltage !== undefined) && (
                    <div className="power-metric">
                      <span className="metric-value">
                        {Math.round(liveDevice.state.voltage || liveDevice.state.powerMeter?.voltage || 0)}
                      </span>
                      <span className="metric-unit">V</span>
                    </div>
                  )}
                  {(liveDevice.state.current !== undefined || liveDevice.state.powerMeter?.current !== undefined) && (
                    <div className="power-metric">
                      <span className="metric-value">
                        {(liveDevice.state.current || liveDevice.state.powerMeter?.current || 0).toFixed(1)}
                      </span>
                      <span className="metric-unit">A</span>
                    </div>
                  )}
                </div>
                {(liveDevice.state.kwh !== undefined || liveDevice.state.powerMeter?.kwh !== undefined) && (
                  <div className="power-meter-kwh">
                    <Zap size={14} className="kwh-icon" />
                    <span className="kwh-value">
                      {(liveDevice.state.kwh || liveDevice.state.powerMeter?.kwh || 0).toFixed(2)}
                    </span>
                    <span className="kwh-unit">kWh</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Light Controls - Apple Style */}
        {isLight && (
          <div className="light-controls-apple">
            {/* Brightness Bar - only show if device supports it */}
            {hasBrightness ? (
              <div 
                className={`brightness-bar-container ${isOn ? '' : 'off'}`}
                onMouseDown={(e) => handleBrightnessStart(e)}
                onTouchStart={(e) => handleBrightnessStart(e)}
              >
                <div className="brightness-bar">
                  <div 
                    className="brightness-fill" 
                    style={{ height: `${brightness}%` }}
                  />
                  <div className={`brightness-icon ${isOn ? 'on' : 'off'}`}>
                    <Lightbulb size={24} strokeWidth={1.5} />
                  </div>
                </div>
              </div>
            ) : (
              // 如果沒有亮度控制，顯示簡單的開關按鈕
              <div className="simple-light-toggle">
                <button 
                  className={`light-toggle-button ${isOn ? 'on' : 'off'}`}
                  onClick={handlePowerToggle}
                >
                  <Lightbulb size={40} strokeWidth={1.5} />
                </button>
              </div>
            )}

            {/* Color Temperature - Apple Home Style */}
            {hasColorTemp && (
              <div className="color-section">
                <div className="color-presets">
                  <button
                    className={`color-preset temp-preset ${colorTemp <= 3000 ? 'selected' : ''}`}
                    onClick={() => handleColorTempChange(2700)}
                  >
                    <div 
                      className="color-circle" 
                      style={{ backgroundColor: '#FFB74D' }}
                    />
                  </button>
                  <button
                    className={`color-preset temp-preset ${colorTemp > 3000 && colorTemp <= 3500 ? 'selected' : ''}`}
                    onClick={() => handleColorTempChange(3200)}
                  >
                    <div 
                      className="color-circle" 
                      style={{ backgroundColor: '#FFD54F' }}
                    />
                  </button>
                  <button
                    className={`color-preset temp-preset ${colorTemp > 3500 && colorTemp <= 4500 ? 'selected' : ''}`}
                    onClick={() => handleColorTempChange(4000)}
                  >
                    <div 
                      className="color-circle" 
                      style={{ backgroundColor: '#FFF9C4' }}
                    />
                  </button>
                  <button
                    className={`color-preset temp-preset ${colorTemp > 4500 && colorTemp <= 5500 ? 'selected' : ''}`}
                    onClick={() => handleColorTempChange(5000)}
                  >
                    <div 
                      className="color-circle" 
                      style={{ backgroundColor: '#F5F5F5' }}
                    />
                  </button>
                  <button
                    className={`color-preset temp-preset ${colorTemp > 5500 ? 'selected' : ''}`}
                    onClick={() => handleColorTempChange(6500)}
                  >
                    <div 
                      className="color-circle" 
                      style={{ backgroundColor: '#E1F5FE' }}
                    />
                  </button>
                  <button 
                    className="color-preset color-picker-btn"
                    onClick={() => {
                      setShowColorTempPicker(true);
                      setCustomColorTemp(colorTemp);
                    }}
                  >
                    <Sliders size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Color Options */}
            {isColorLight && (
              <div className="color-section">
                <div className="color-presets">
                  {colorPresets.map(({ color, name }) => (
                    <button
                      key={color}
                      className={`color-preset ${selectedColor === color ? 'selected' : ''}`}
                      onClick={() => setSelectedColor(color)}
                      title={name}
                    >
                      <div 
                        className="color-circle" 
                        style={{ backgroundColor: color }}
                      />
                    </button>
                  ))}
                  <button 
                    className="color-preset color-picker-btn"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                  >
                    <Palette size={24} />
                  </button>
                </div>
              </div>
            )}
            
            {/* Device Info - Hidden for now to match Apple Home */}
          </div>
        )}

        {/* AC Additional Controls */}
        {isAC && isOn && (
          <div className="ac-controls">
            <div className="ac-display">
              <div className="temp-main">
                <span className="temp-number">{temperature}</span>
                <span className="temp-unit">°C</span>
              </div>
              <div className="temp-buttons">
                <button 
                  className="temp-adjust"
                  onClick={() => setTemperature(Math.max(16, temperature - 1))}
                >
                  −
                </button>
                <button 
                  className="temp-adjust"
                  onClick={() => setTemperature(Math.min(30, temperature + 1))}
                >
                  +
                </button>
              </div>
            </div>
            
            <div className="ac-modes">
              <button className="mode-btn active">冷氣</button>
              <button className="mode-btn">暖氣</button>
              <button className="mode-btn">除濕</button>
              <button className="mode-btn">送風</button>
            </div>
          </div>
        )}
        
        
        {/* Dehumidifier Controls - Apple Style */}
        {isDehumidifier && (
          <div className="dehumidifier-controls-apple">
            {/* Power Switch with Icon */}
            <div className="dehumidifier-power-section">
              <button 
                className={`dehumidifier-power-button ${isOn ? 'on' : 'off'}`}
                onClick={handlePowerToggle}
              >
                <Power size={32} strokeWidth={1.5} />
              </button>
            </div>
            
            {/* Current Status Display */}
            {(liveDevice.state?.humidity !== undefined || liveDevice.state?.temperature !== undefined) && (
              <div className="dehumidifier-status-section">
                {liveDevice.state?.humidity !== undefined && (
                  <div className="status-item">
                    <span className="status-label">當前濕度</span>
                    <span className="status-value">{liveDevice.state.humidity}%</span>
                  </div>
                )}
                {liveDevice.state?.temperature !== undefined && (
                  <div className="status-item">
                    <span className="status-label">室溫</span>
                    <span className="status-value">{liveDevice.state.temperature}°C</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Humidity Control */}
            <div className="dehumidifier-humidity-section">
              <div className="humidity-target-control">
                <button 
                  className="humidity-adjust-btn"
                  onClick={async () => {
                    const newValue = Math.max(30, (liveDevice.state?.targetHumidity || 60) - 5);
                    await updateDeviceState(device.sn, { targetHumidity: newValue });
                  }}
                  disabled={!isOn}
                >
                  <span>−</span>
                </button>
                
                <div className="humidity-target-display">
                  <span className="target-label">目標濕度</span>
                  <span className="target-value">{liveDevice.state?.targetHumidity || 60}%</span>
                </div>
                
                <button 
                  className="humidity-adjust-btn"
                  onClick={async () => {
                    const newValue = Math.min(80, (liveDevice.state?.targetHumidity || 60) + 5);
                    await updateDeviceState(device.sn, { targetHumidity: newValue });
                  }}
                  disabled={!isOn}
                >
                  <span>+</span>
                </button>
              </div>
            </div>
            
            {/* Fan Speed Control */}
            <div className="dehumidifier-fan-section">
              <span className="fan-label">風速</span>
              <div className="fan-speed-selector">
                <button 
                  className={`fan-option ${(liveDevice.state?.fanSpeed === 'low' || !liveDevice.state?.fanSpeed) ? 'active' : ''}`} 
                  onClick={async () => await updateDeviceState(device.sn, { fanSpeed: 'low' })}
                  disabled={!isOn}
                >
                  <Wind size={16} strokeWidth={1} />
                  <span>低</span>
                </button>
                <button 
                  className={`fan-option ${liveDevice.state?.fanSpeed === 'medium' ? 'active' : ''}`}
                  onClick={async () => await updateDeviceState(device.sn, { fanSpeed: 'medium' })}
                  disabled={!isOn}
                >
                  <Wind size={16} strokeWidth={1.5} />
                  <span>中</span>
                </button>
                <button 
                  className={`fan-option ${liveDevice.state?.fanSpeed === 'high' ? 'active' : ''}`}
                  onClick={async () => await updateDeviceState(device.sn, { fanSpeed: 'high' })}
                  disabled={!isOn}
                >
                  <Wind size={16} strokeWidth={2} />
                  <span>高</span>
                </button>
                <button 
                  className={`fan-option ${liveDevice.state?.fanSpeed === 'auto' ? 'active' : ''}`}
                  onClick={async () => await updateDeviceState(device.sn, { fanSpeed: 'auto' })}
                  disabled={!isOn}
                >
                  <span>自動</span>
                </button>
              </div>
            </div>
            
            {/* Mode Selection */}
            <div className="dehumidifier-mode-section">
              <span className="mode-label">運轉模式</span>
              <div className="mode-selector">
                <button 
                  className={`mode-option ${(liveDevice.state?.mode === 'auto' || !liveDevice.state?.mode) ? 'active' : ''}`} 
                  onClick={async () => await updateDeviceState(device.sn, { mode: 'auto' })}
                  disabled={!isOn}
                >
                  自動
                </button>
                <button 
                  className={`mode-option ${liveDevice.state?.mode === 'continuous' ? 'active' : ''}`}
                  onClick={async () => await updateDeviceState(device.sn, { mode: 'continuous' })}
                  disabled={!isOn}
                >
                  連續
                </button>
                <button 
                  className={`mode-option ${liveDevice.state?.mode === 'laundry' ? 'active' : ''}`}
                  onClick={async () => await updateDeviceState(device.sn, { mode: 'laundry' })}
                  disabled={!isOn}
                >
                  乾衣
                </button>
                <button 
                  className={`mode-option ${liveDevice.state?.mode === 'quiet' ? 'active' : ''}`}
                  onClick={async () => await updateDeviceState(device.sn, { mode: 'quiet' })}
                  disabled={!isOn}
                >
                  靜音
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Settings Button - Bottom Right */}
        <button 
          className="device-control-settings"
          onClick={() => setShowSettings(true)}
          title="設備設定"
        >
          <Settings size={20} />
        </button>
      </div>
      
      {/* Device Settings Modal */}
      {showSettings && (
        <DeviceSettings
          device={device}
          onClose={() => setShowSettings(false)}
        />
      )}
      
      {/* Color Temperature Picker Modal */}
      {showColorTempPicker && (
        <div className="color-temp-picker-overlay" onClick={() => setShowColorTempPicker(false)}>
          <div className="color-temp-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">
              <h3>自訂色溫</h3>
              <button className="close-button" onClick={() => setShowColorTempPicker(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="picker-content">
              <div className="temp-display">
                <span className="temp-value-large">{customColorTemp}K</span>
              </div>
              <div className="temp-slider-container">
                <input
                  type="range"
                  min={colorTempMin}
                  max={colorTempMax}
                  value={customColorTemp}
                  onChange={(e) => setCustomColorTemp(Number(e.target.value))}
                  className="custom-temp-slider"
                />
                <div className="temp-labels">
                  <span>2700K</span>
                  <span>6500K</span>
                </div>
              </div>
              <div className="picker-actions">
                <button 
                  className="cancel-btn"
                  onClick={() => setShowColorTempPicker(false)}
                >
                  取消
                </button>
                <button 
                  className="apply-btn"
                  onClick={() => {
                    handleColorTempChange(customColorTemp);
                    setShowColorTempPicker(false);
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceControl;