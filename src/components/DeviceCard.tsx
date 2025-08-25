import React, { useState, useRef, useEffect } from 'react';
import { 
  Lightbulb, 
  Wind, 
  Power, 
  Fan, 
  Shield, 
  Camera, 
  Lock, 
  Plug,
  Thermometer,
  Droplets,
  Network,
  DoorOpen,
  ScanEye,
  Gauge,
  Radar
} from 'lucide-react';
import { Device } from '../types';
import useSmartHomeStore from '../store';
import styles from './DeviceCard.module.css';

interface DeviceCardProps {
  device: Device;
  onClick?: () => void;
  onToggle?: (e: React.MouseEvent) => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onClick, onToggle }) => {
  const { toggleDevice, updateDeviceName } = useSmartHomeStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(device.name);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggle) {
      onToggle(e);
    }
  };
  
  const handleNameMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    // 開始長按計時
    longPressTimerRef.current = setTimeout(() => {
      e.stopPropagation();
      setIsEditingName(true);
      setEditedName(device.name);
    }, 500); // 500ms 長按
  };
  
  const handleNameMouseUp = () => {
    // 清除長按計時
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  
  const handleNameMouseLeave = () => {
    // 滑鼠離開時也清除計時
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  
  const handleNameSubmit = () => {
    if (editedName.trim() && editedName !== device.name) {
      updateDeviceName(device.sn, editedName.trim());
    }
    setIsEditingName(false);
  };
  
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(device.name);
    }
  };
  
  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);
  
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const getDeviceIcon = () => {
    // 根據設備類型和功能調整圖標大小
    const isLightWithBrightness = device.type === 'light' && 
      (device.traits?.includes('Brightness') || device.state?.brightness !== undefined);
    const iconSize = isLightWithBrightness ? 40 : 32;
    const iconProps = { size: iconSize, strokeWidth: 1.5 };
    
    // 如果設備有自訂圖示 URL，使用圖片
    if (device.icon) {
      return (
        <img 
          src={device.icon} 
          alt={device.name} 
          style={{ 
            width: iconSize, 
            height: iconSize,
            objectFit: 'contain',
            filter: device.online ? 'none' : 'grayscale(100%)'
          }} 
        />
      );
    }
    
    // 否則使用預設圖示
    switch (device.type) {
      case 'light':
        return <Lightbulb {...iconProps} />;
      case 'airConditioner':
        return <Wind {...iconProps} />;
      case 'switch':
        return <Power {...iconProps} />;
      case 'fan':
        return <Fan {...iconProps} />;
      case 'sensor':
        // Check device name or traits for specific sensor type
        const sensorName = device.name?.toLowerCase() || '';
        const deviceSn = device.sn?.toLowerCase() || '';
        
        // mmW Presence Sensor (毫米波存在感應器)
        if (deviceSn.includes('utu322') || 
            sensorName.includes('presence') || sensorName.includes('mmw') ||
            sensorName.includes('存在') || sensorName.includes('毫米波')) {
          return <Radar {...iconProps} />;
        }
        
        // Motion/PIR sensors (check first as UTU309 is a motion sensor)
        if (deviceSn.includes('utu309') || 
            sensorName.includes('motion') || sensorName.includes('pir') || 
            sensorName.includes('移動') || sensorName.includes('感應') ||
            device.state?.motion !== undefined ||
            device.endpoint?.iotDevs?.pir_sensor) {
          return <ScanEye {...iconProps} />;
        }
        
        // Door/Window sensors
        if (sensorName.includes('door') || sensorName.includes('門') || 
            device.state?.contact !== undefined) {
          return <DoorOpen {...iconProps} />;
        }
        
        // Temperature & Humidity sensors
        if ((device.state?.temperature !== undefined && device.state?.humidity !== undefined) ||
            sensorName.includes('溫濕') || deviceSn.includes('utu308')) {
          return <Gauge {...iconProps} />;
        }
        
        // Single temperature sensor
        if (device.state?.temperature !== undefined) {
          return <Thermometer {...iconProps} />;
        }
        
        // Single humidity sensor
        if (device.state?.humidity !== undefined) {
          return <Droplets {...iconProps} />;
        }
        
        // Default sensor icon
        return <Shield {...iconProps} />;
      case 'camera':
        return <Camera {...iconProps} />;
      case 'lock':
        return <Lock {...iconProps} />;
      case 'outlet':
        return <Plug {...iconProps} />;
      case 'dehumidifier':
        return <Droplets {...iconProps} />;
      case 'gateway':
      case 'bridge':
        return <Network {...iconProps} />;
      default:
        return <Power {...iconProps} />;
    }
  };

  const getStatusText = () => {
    if (!device.online) return '離線';
    
    if (device.type === 'sensor') {
      const parts = [];
      if (device.state?.temperature !== undefined) {
        parts.push(`${device.state.temperature}°C`);
      }
      if (device.state?.humidity !== undefined) {
        parts.push(`${device.state.humidity}%`);
      }
      if (device.state?.pm25 !== undefined) {
        parts.push(`PM2.5: ${device.state.pm25}`);
      }
      if (device.state?.co2 !== undefined) {
        parts.push(`CO₂: ${device.state.co2}ppm`);
      }
      if (device.state?.illuminance !== undefined) {
        parts.push(`${device.state.illuminance}lux`);
      }
      if (device.state?.motion !== undefined) {
        return device.state.motion ? '偵測到移動' : '無移動';
      }
      if (device.state?.contact !== undefined) {
        return device.state.contact ? '開啟' : '關閉';
      }
      return parts.length > 0 ? parts[0] : '正常'; // 顯示第一個數值
    }
    
    if (device.type === 'airConditioner' && device.state?.temperature) {
      return `${device.state.temperature}°C`;
    }
    
    return device.state?.power ? '開啟' : '關閉';
  };

  const handleClick = (e: React.MouseEvent) => {
    // 如果是拖拽操作，不觸發點擊
    if (e.defaultPrevented) return;
    
    if (onClick) {
      onClick();
    } else if (device.online && device.type !== 'sensor' && device.type !== 'camera') {
      toggleDevice(device.sn);
    }
  };

  return (
    <div 
      className={`${styles.deviceCard} ${device.state?.power ? styles.active : ''} ${!device.online ? styles.offline : ''}`}
      onClick={handleClick}
      data-type={device.type}
      draggable={false}
    >
      <div 
        className={styles.deviceIcon}
        onClick={handleIconClick}
      >
        {getDeviceIcon()}
      </div>
      {isEditingName ? (
        <input
          ref={nameInputRef}
          type="text"
          className={styles.deviceNameInput}
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          onBlur={handleNameSubmit}
          onKeyDown={handleNameKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <h3 
          className={styles.deviceName} 
          onMouseDown={handleNameMouseDown}
          onMouseUp={handleNameMouseUp}
          onMouseLeave={handleNameMouseLeave}
          title="長按編輯名稱"
        >
          {device.name}
        </h3>
      )}
      <p className={styles.deviceStatus}>{getStatusText()}</p>
    </div>
  );
};

export default DeviceCard;