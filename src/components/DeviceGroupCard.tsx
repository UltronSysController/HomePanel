import React, { useState, useRef, useEffect } from 'react';
import { DeviceGroup, Device } from '../types';
import { Power } from 'lucide-react';
import useSmartHomeStore from '../store';
import './DeviceGroupCard.css';

interface DeviceGroupCardProps {
  group: DeviceGroup;
  devices: Device[];
  onClick: () => void;
  onToggle: (e: React.MouseEvent) => void;
  isHovering?: boolean;
}

const DeviceGroupCard: React.FC<DeviceGroupCardProps> = ({
  group,
  devices,
  onClick,
  onToggle,
  isHovering = false
}) => {
  const { toggleGroup, dissolveGroup, updateGroupName } = useSmartHomeStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(group.name);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // Get devices in this group
  const groupDevices = devices.filter(d => group.deviceIds.includes(d.sn));
  
  // Determine group state
  const anyOnline = groupDevices.some(d => d.online);
  const anyOn = groupDevices.some(d => d.state?.power);
  const allOn = groupDevices.every(d => d.state?.power);
  
  // Get the first device's icon as the group icon
  const firstDevice = groupDevices[0];
  const icon = firstDevice?.deviceIcon || firstDevice?.bundleIcon || firstDevice?.icon;
  
  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (anyOnline) {
      await toggleGroup(group.id);
    }
  };
  
  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingName(true);
    setEditedName(group.name);
  };
  
  const handleNameSubmit = () => {
    if (editedName.trim() && editedName !== group.name) {
      updateGroupName(group.id, editedName.trim());
    }
    setIsEditingName(false);
  };
  
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(group.name);
    }
  };
  
  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);
  
  return (
    <div 
      className={`device-card ${anyOn ? 'active' : ''} ${!anyOnline ? 'offline' : ''}`}
      onClick={onClick}
    >
      {/* Icon */}
      <div 
        className="device-icon"
        onClick={handleToggle}
      >
        {icon ? (
          <img src={icon} alt={group.name} />
        ) : (
          <Power size={32} />
        )}
      </div>
      
      {/* Group name */}
      {isEditingName ? (
        <input
          ref={nameInputRef}
          type="text"
          className="device-name-input"
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          onBlur={handleNameSubmit}
          onKeyDown={handleNameKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <p 
          className="device-name" 
          onClick={handleNameClick}
          title="點擊編輯名稱"
        >
          {group.name}
        </p>
      )}
      
      {/* State info */}
      <p className="device-status">
        {anyOn ? (
          allOn ? '開啟' : `${groupDevices.filter(d => d.state?.power).length}/${groupDevices.length}`
        ) : (
          '關閉'
        )}
      </p>
    </div>
  );
};

export default DeviceGroupCard;