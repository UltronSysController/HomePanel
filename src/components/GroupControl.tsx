import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Lightbulb, Settings, Sliders } from 'lucide-react';
import { DeviceGroup, Device } from '../types';
import useSmartHomeStore from '../store';
import GroupSettings from './GroupSettings';
import './DeviceControl.css';

interface GroupControlProps {
  group: DeviceGroup;
  onClose: () => void;
}

const GroupControl: React.FC<GroupControlProps> = ({ group, onClose }) => {
  const { devices, toggleGroup, updateDeviceState, dissolveGroup } = useSmartHomeStore();
  
  // Get devices in this group
  const groupDevices = group.deviceIds
    .map(id => devices[id])
    .filter(Boolean);
  
  // Determine group state
  const anyOn = groupDevices.some(d => d.state?.power);
  const allOn = groupDevices.every(d => d.state?.power);
  const [isOn, setIsOn] = useState(anyOn);
  
  // For lights, track brightness and color temperature
  const [brightness, setBrightness] = useState(100);
  const [colorTemp, setColorTemp] = useState(4000);
  const [showColorTempPicker, setShowColorTempPicker] = useState(false);
  const [customColorTemp, setCustomColorTemp] = useState(colorTemp);
  const [isDragging, setIsDragging] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const brightnessTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const colorTempTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBrightnessRef = useRef(100);
  
  // Check if all devices are lights with brightness and color temperature
  const allLights = groupDevices.every(d => d.type === 'light');
  const hasBrightness = allLights && groupDevices.every(d => 
    d.traits?.includes('Brightness') || d.state?.brightness !== undefined
  );
  
  // More flexible color temperature detection
  const hasColorTemp = allLights && (
    // Either all devices have color temp traits/state
    groupDevices.every(d => 
      (d.traits?.includes('ColorSetting') || 
       d.traits?.includes('ColorTemperature') ||
       d.traits?.includes('ColorControl')) || 
      d.state?.colorTemperature !== undefined
    ) ||
    // Or it's a group of lights with brightness (likely supports color temp)
    hasBrightness
  );
  
  // Get color temperature range from devices
  const colorTempMin = Math.max(...groupDevices.map(d => d.state?.colorTemperatureRange?.min || 2700));
  const colorTempMax = Math.min(...groupDevices.map(d => d.state?.colorTemperatureRange?.max || 6500));
  
  useEffect(() => {
    // Calculate average brightness and color temperature if all devices support it
    if (hasBrightness) {
      const avgBrightness = groupDevices.reduce((sum, d) => 
        sum + (d.state?.brightness || 0), 0
      ) / groupDevices.length;
      setBrightness(Math.round(avgBrightness));
    }
    
    if (hasColorTemp) {
      const avgColorTemp = groupDevices.reduce((sum, d) => 
        sum + (d.state?.colorTemperature || 4000), 0
      ) / groupDevices.length;
      setColorTemp(Math.round(avgColorTemp));
    }
  }, [group.deviceIds]);
  
  // Clean up timeouts
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
  
  const handlePowerToggle = async () => {
    const newState = !isOn;
    setIsOn(newState);
    try {
      await toggleGroup(group.id);
      // Update local state
      setIsOn(newState);
    } catch (error) {
      console.error('Toggle group failed:', error);
      // Revert on failure
      setIsOn(!newState);
    }
  };
  
  // Handle brightness drag
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

    // Initial update
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    updateBrightness(clientY);

    // Add event listeners
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  };
  
  const handleBrightnessChange = useCallback(async (value: number) => {
    // Only send update if value actually changed
    if (value === lastBrightnessRef.current) return;
    
    lastBrightnessRef.current = value;
    
    // Handle power state based on brightness
    if (value === 0 && isOn) {
      setIsOn(false);
      await toggleGroup(group.id);
    } else if (value > 0 && !isOn) {
      setIsOn(true);
      await toggleGroup(group.id);
      // Wait a bit for power on before setting brightness
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Send brightness update to all devices
    if (value > 0) {
      try {
        await Promise.all(
          groupDevices.map(device => 
            updateDeviceState(device.sn, { brightness: value })
          )
        );
      } catch (error) {
        console.error('Failed to update group brightness:', error);
      }
    }
  }, [group.id, isOn, groupDevices, updateDeviceState, toggleGroup]);
  
  const handleColorTempChange = useCallback((value: number) => {
    setColorTemp(value);
    
    // 如果燈是關閉的，自動開啟
    if (!isOn) {
      setIsOn(true);
      // 先發送開啟指令
      toggleGroup(group.id);
    }
    
    // 清除之前的 timeout
    if (colorTempTimeoutRef.current) {
      clearTimeout(colorTempTimeoutRef.current);
    }
    
    // 設置新的 timeout，延遲 300ms 發送請求
    colorTempTimeoutRef.current = setTimeout(async () => {
      try {
        await Promise.all(
          groupDevices.map(device => 
            updateDeviceState(device.sn, { colorTemperature: value })
          )
        );
      } catch (error) {
        console.error('Failed to update group color temperature:', error);
      }
    }, 300);
  }, [group.id, isOn, groupDevices, updateDeviceState, toggleGroup]);
  
  // 根據色溫獲取顏色
  const getColorForTemp = (temp: number) => {
    if (temp <= 3000) return '#FFB74D'; // 暖黃
    if (temp <= 4000) return '#FFD54F'; // 淺黃
    if (temp <= 5000) return '#FFF9C4'; // 自然白
    if (temp <= 5500) return '#F5F5F5'; // 純白
    return '#E1F5FE'; // 冷白
  };
  
  // Get room name
  const { rooms } = useSmartHomeStore();
  const roomName = rooms.find(r => r.id === group.roomId)?.name || '未分配';
  
  return (
    <div className="device-control-overlay" onClick={onClose}>
      <div className="device-control-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{group.name}</h2>
          <p className="device-status">
            {isOn ? 
              (allOn ? '全部開啟' : `${groupDevices.filter(d => d.state?.power).length}/${groupDevices.length} 開啟`) : 
              '全部關閉'
            }
          </p>
        </div>

        {/* Light Controls for light groups */}
        {allLights && (
          <div className="light-controls-apple">
            {/* Brightness Bar */}
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
              // Simple toggle for lights without brightness
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
            
          </div>
        )}
        
        {/* Settings Button - Bottom Right */}
        <button 
          className="device-control-settings"
          onClick={() => setShowSettings(true)}
          title="群組設定"
        >
          <Settings size={20} />
        </button>
      </div>
      
      {/* Group Settings Modal */}
      {showSettings && (
        <GroupSettings
          group={group}
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

export default GroupControl;