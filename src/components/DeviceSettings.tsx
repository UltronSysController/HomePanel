import React, { useState } from 'react';
import { X, Home, Star, Info, Trash2, Edit2, ChevronRight } from 'lucide-react';
import { Device, Room } from '../types';
import useSmartHomeStore from '../store';
import './DeviceSettings.css';

interface DeviceSettingsProps {
  device: Device;
  onClose: () => void;
}

const DeviceSettings: React.FC<DeviceSettingsProps> = ({ device, onClose }) => {
  const { 
    rooms, 
    updateDeviceName, 
    updateDeviceRoom,
    devices
  } = useSmartHomeStore();
  
  const [editingName, setEditingName] = useState(false);
  const [deviceName, setDeviceName] = useState(device.name);
  const [selectedRoomId, setSelectedRoomId] = useState(device.roomId || 'unassigned');
  const [includeInFavorites, setIncludeInFavorites] = useState(false);
  const [showInStatus, setShowInStatus] = useState(true);
  
  // Get live device from store
  const liveDevice = devices[device.sn] || device;
  
  const handleNameSave = () => {
    if (deviceName.trim() && deviceName !== device.name) {
      updateDeviceName(device.sn, deviceName.trim());
    }
    setEditingName(false);
  };
  
  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    updateDeviceRoom(device.sn, roomId === 'unassigned' ? '' : roomId);
  };
  
  const handleRemoveDevice = () => {
    if (window.confirm(`確定要移除「${device.name}」嗎？`)) {
      // TODO: Implement removeDevice in store
      // removeDevice(device.sn);
      alert('移除設備功能尚未實作');
      // onClose();
    }
  };
  
  return (
    <div className="device-settings-overlay" onClick={onClose}>
      <div className="device-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>設定</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="settings-content">
          {/* Device Name Section */}
          <div className="settings-section">
            <div className="settings-item">
              <label>名稱</label>
              {editingName ? (
                <div className="name-edit-group">
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyPress={(e) => e.key === 'Enter' && handleNameSave()}
                    autoFocus
                  />
                </div>
              ) : (
                <button 
                  className="value-button"
                  onClick={() => setEditingName(true)}
                >
                  <span>{liveDevice.name}</span>
                  <Edit2 size={16} />
                </button>
              )}
            </div>
            
            {/* Room Assignment */}
            <div className="settings-item">
              <label>房間</label>
              <select 
                value={selectedRoomId} 
                onChange={(e) => handleRoomChange(e.target.value)}
                className="room-select"
              >
                <option value="unassigned">未分配</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Display Options */}
          <div className="settings-section">
            <h3>顯示選項</h3>
            
            <div className="settings-item toggle-item">
              <div className="toggle-label">
                <Star size={20} />
                <span>加入喜好項目</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={includeInFavorites}
                  onChange={(e) => setIncludeInFavorites(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div className="settings-item toggle-item">
              <div className="toggle-label">
                <Home size={20} />
                <span>在家庭狀態中顯示</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={showInStatus}
                  onChange={(e) => setShowInStatus(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
          
          {/* Device Information */}
          <div className="settings-section">
            <h3>關於</h3>
            
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">類型</span>
                <span className="info-value">{liveDevice.type || 'Unknown'}</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">名稱</span>
                <span className="info-value">{liveDevice.bundleName || liveDevice.displayName || 'Unknown'}</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">序號</span>
                <span className="info-value">{liveDevice.sn}</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">狀態</span>
                <span className="info-value">{liveDevice.online ? '在線' : '離線'}</span>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="settings-section actions-section">
            <button 
              className="action-button danger"
              onClick={handleRemoveDevice}
            >
              <Trash2 size={20} />
              <span>從家庭中移除</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceSettings;