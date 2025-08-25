import React, { useState } from 'react';
import { X, Users, Star, Home, Trash2, Edit2, Minus } from 'lucide-react';
import { DeviceGroup, Device } from '../types';
import useSmartHomeStore from '../store';
import DeviceControl from './DeviceControl';
import './DeviceSettings.css';

interface GroupSettingsProps {
  group: DeviceGroup;
  onClose: () => void;
}

const GroupSettings: React.FC<GroupSettingsProps> = ({ group, onClose }) => {
  const { 
    devices,
    deviceGroups,
    updateGroupName,
    removeDeviceFromGroup,
    dissolveGroup,
    toggleDevice
  } = useSmartHomeStore();
  
  const [editingName, setEditingName] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [includeInFavorites, setIncludeInFavorites] = useState(false);
  const [showInStatus, setShowInStatus] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  
  // Get current group from store
  const currentGroup = deviceGroups.find(g => g.id === group.id) || group;
  
  // Get devices in this group
  const groupDevices = currentGroup.deviceIds
    .map(id => devices[id])
    .filter(Boolean);
  
  const handleNameSave = () => {
    if (groupName.trim() && groupName !== currentGroup.name) {
      updateGroupName(currentGroup.id, groupName.trim());
    }
    setEditingName(false);
  };
  
  const handleRemoveDevice = (deviceSn: string) => {
    if (groupDevices.length > 2) {
      removeDeviceFromGroup(currentGroup.id, deviceSn);
    } else {
      alert('群組必須至少包含 2 個設備');
    }
  };
  
  const handleDissolveGroup = () => {
    if (window.confirm(`確定要解散群組「${currentGroup.name}」嗎？`)) {
      dissolveGroup(currentGroup.id);
      onClose();
    }
  };
  
  return (
    <div className="device-settings-overlay" onClick={onClose}>
      <div className="device-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>群組設定</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="settings-content">
          {/* Group Name Section */}
          <div className="settings-section">
            <div className="settings-item">
              <label>名稱</label>
              {editingName ? (
                <div className="name-edit-group">
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
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
                  <span>{currentGroup.name}</span>
                  <Edit2 size={16} />
                </button>
              )}
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
          
          {/* Group Devices */}
          <div className="settings-section">
            <h3>群組設備 ({groupDevices.length})</h3>
            
            <div className="group-devices-list">
              {groupDevices.map(device => {
                // Check if device supports on/off
                const canToggle = device.type !== 'sensor' && device.type !== 'camera';
                
                return (
                  <div 
                    key={device.sn} 
                    className="group-device-item clickable"
                    onClick={() => setSelectedDevice(device)}
                  >
                    <div className="device-info">
                      <span className="device-name">{device.name}</span>
                      <span className="device-status">
                        {device.state?.power ? '開啟' : '關閉'}
                      </span>
                    </div>
                    <div className="device-actions">
                      {canToggle && (
                        <label className="toggle-switch small" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={device.state?.power || false}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleDevice(device.sn);
                            }}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      )}
                      {groupDevices.length > 2 && (
                        <button
                          className="remove-device-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveDevice(device.sn);
                          }}
                          title="從群組中移除"
                        >
                          <Minus size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Actions */}
          <div className="settings-section actions-section">
            <button 
              className="action-button danger"
              onClick={handleDissolveGroup}
            >
              <Users size={20} />
              <span>解散群組</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Individual Device Control Modal */}
      {selectedDevice && (
        <div onClick={(e) => e.stopPropagation()}>
          <DeviceControl
            device={selectedDevice}
            onClose={() => setSelectedDevice(null)}
          />
        </div>
      )}
    </div>
  );
};

export default GroupSettings;