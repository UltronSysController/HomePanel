import React, { useState, useRef } from 'react';
import {
  Lightbulb,
  Wind,
  Power,
  Fan,
  Camera,
  Lock,
  Plug,
  Thermometer,
  Droplets,
  Network,
  Gauge,
  ToggleLeft,
  Snowflake,
  Sun,
} from 'lucide-react';
import { Device } from '../types';
import useSmartHomeStore from '../store';
import './DeviceCard.css';

interface DeviceCardProps {
  device: Device;
  onClick?: () => void;
  onToggle?: () => void;
  isDragging?: boolean;
}

const DEVICE_ICONS: Record<string, React.ElementType> = {
  light: Lightbulb,
  switch: ToggleLeft,
  airConditioner: Snowflake,
  fan: Fan,
  sensor: Thermometer,
  camera: Camera,
  lock: Lock,
  outlet: Plug,
  thermostat: Sun,
  humidifier: Droplets,
  dehumidifier: Wind,
  gateway: Network,
  bridge: Network,
  other: Gauge,
};

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onClick, onToggle, isDragging }) => {
  const { toggleDevice } = useSmartHomeStore();
  const [isToggling, setIsToggling] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const didLongPress = useRef(false);

  const isOn = device.state?.power === true;
  const isOffline = !device.online;
  const Icon = DEVICE_ICONS[device.type] || Power;

  const displayName = device.displayName || device.name;

  const getStatusText = (): string => {
    if (isOffline) return '離線';
    if (device.type === 'sensor') {
      const parts: string[] = [];
      if (device.state?.temperature != null) parts.push(`${device.state.temperature}°C`);
      if (device.state?.humidity != null) parts.push(`${device.state.humidity}%`);
      if (device.state?.pm25 != null) parts.push(`PM2.5: ${device.state.pm25}`);
      return parts.join(' · ') || '感應器';
    }
    if (device.type === 'outlet' && isOn && device.state?.watt != null) {
      return `${device.state.watt}W`;
    }
    if (device.type === 'light' && isOn && device.state?.brightness != null) {
      return `${device.state.brightness}%`;
    }
    if (device.type === 'airConditioner' && isOn && device.state?.temperature != null) {
      return `${device.state.temperature}°C`;
    }
    return isOn ? '開啟' : '關閉';
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOffline || isToggling) return;
    setIsToggling(true);
    try {
      if (onToggle) {
        onToggle();
      } else {
        await toggleDevice(device.sn);
      }
    } finally {
      setTimeout(() => setIsToggling(false), 300);
    }
  };

  const handlePointerDown = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      if (onClick) onClick();
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    if (device.type === 'sensor') {
      if (onClick) onClick();
      return;
    }
    // Short tap = toggle for controllable devices
    if (!isOffline && !isToggling) {
      if (onToggle) {
        onToggle();
      } else {
        toggleDevice(device.sn);
      }
    }
  };

  const iconUrl = device.icon || device.deviceIcon || device.bundleIcon;

  return (
    <div
      className={`device-card ${isOn ? 'on' : 'off'} ${isOffline ? 'offline' : ''} ${isDragging ? 'dragging' : ''} ${isToggling ? 'toggling' : ''}`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      draggable
    >
      {/* Top Row: Icon + Toggle */}
      <div className="card-top">
        <div className={`card-icon-wrap ${isOn ? 'active' : ''}`}>
          {iconUrl ? (
            <img
              src={iconUrl}
              alt=""
              className="card-icon-img"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <Icon size={22} strokeWidth={1.8} />
          )}
        </div>
        {device.type !== 'sensor' && (
          <button
            className={`card-toggle ${isOn ? 'active' : ''}`}
            onClick={handleToggle}
            disabled={isOffline}
            aria-label={isOn ? '關閉' : '開啟'}
          >
            <Power size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Bottom: Name + Status */}
      <div className="card-info">
        <span className="card-name">{displayName}</span>
        <span className="card-status">{getStatusText()}</span>
      </div>

      {/* Brightness indicator for lights */}
      {device.type === 'light' && isOn && device.state?.brightness != null && (
        <div
          className="card-brightness-bar"
          style={{ width: `${device.state.brightness}%` }}
        />
      )}
    </div>
  );
};

export default DeviceCard;
