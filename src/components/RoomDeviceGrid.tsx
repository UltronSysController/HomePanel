import React, { useState, useRef } from 'react';
import { Device, DeviceGroup } from '../types';
import DeviceCard from './DeviceCard';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import useSmartHomeStore from '../store';
import './RoomDeviceGrid.css';

interface RoomDeviceGridProps {
  roomId: string;
  devices: Device[];
  deviceOrder: string[];
  onDeviceClick: (device: Device) => void;
  onGroupClick: (group: DeviceGroup) => void;
  onDeviceToggle: (device: Device, e: React.MouseEvent) => void;
  onReorderDevices: (roomId: string, deviceSns: string[]) => void;
}

const RoomDeviceGrid: React.FC<RoomDeviceGridProps> = ({
  roomId,
  devices,
  deviceOrder,
  onDeviceClick,
  onGroupClick,
  onDeviceToggle,
  onReorderDevices
}) => {
  const { createDeviceGroup } = useSmartHomeStore();
  const [dragOverDevice, setDragOverDevice] = useState<string | null>(null);
  const dragOverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [draggedDeviceId, setDraggedDeviceId] = useState<string | null>(null);
  const [currentTargetDevice, setCurrentTargetDevice] = useState<string | null>(null);
  
  // Don't filter out devices in groups - we want to show all devices
  // Groups are just for organization/control, not display
  const standaloneDevices = devices;
  
  // Order devices according to saved order
  const orderedDevices = deviceOrder.length > 0
    ? deviceOrder
        .map(sn => standaloneDevices.find(d => d.sn === sn))
        .filter((device): device is Device => device !== undefined)
        .concat(standaloneDevices.filter(d => !deviceOrder.includes(d.sn))) // Add any new devices at the end
    : standaloneDevices;

  // Only use devices for drag and drop ordering (no group cards)
  const allItems = [...orderedDevices];
  
  const dragAndDrop = useDragAndDrop({
    items: allItems,
    onReorder: (newItems) => {
      // Separate groups and devices
      const newDevices = newItems.filter((item): item is Device => 'sn' in item);
      const newOrder = newDevices.map(device => device.sn);
      onReorderDevices(roomId, newOrder);
      // TODO: Save group order when implemented
    },
    itemKey: (item) => item.sn
  });
  
  // Custom drag handlers for group creation
  const handleDragStart = (device: Device) => (e: React.DragEvent) => {
    setDraggedDeviceId(device.sn);
    const index = allItems.findIndex(item => 'sn' in item && item.sn === device.sn);
    dragAndDrop.handleDragStart(index)(e);
    e.dataTransfer.effectAllowed = 'move';
    // Add data for room drop zones
    e.dataTransfer.setData('deviceSn', device.sn);
    e.dataTransfer.setData('roomId', roomId);
  };
  
  const handleDragOver = (targetDevice: Device, index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const draggedDevice = devices.find(d => d.sn === draggedDeviceId);
    
    if (!draggedDevice || draggedDevice.sn === targetDevice.sn) {
      dragAndDrop.handleDragOver(e);
      return;
    }
    
    // Get mouse position relative to the target element
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = x / rect.width;
    
    // If different device types, always reorder
    if (draggedDevice.type !== targetDevice.type) {
      setDragOverDevice(null);
      dragAndDrop.handleDragOver(e);
      return;
    }
    
    // Same device type - check position
    if (relativeX <= 0.25) {
      // Left 25% - reorder
      setDragOverDevice(null);
      setCurrentTargetDevice(null);
      if (dragOverTimerRef.current) {
        clearTimeout(dragOverTimerRef.current);
      }
      dragAndDrop.handleDragOver(e);
    } else {
      // Right 75% - group creation
      setDragOverDevice(targetDevice.sn);
      
      // Only set timer if target device changed
      if (currentTargetDevice !== targetDevice.sn) {
        setCurrentTargetDevice(targetDevice.sn);
        
        // Clear existing timer
        if (dragOverTimerRef.current) {
          clearTimeout(dragOverTimerRef.current);
        }
        
        // Set timer for group creation
        dragOverTimerRef.current = setTimeout(() => {
          // Create group with both devices
          const groupName = `${draggedDevice.name} + ${targetDevice.name}`;
          createDeviceGroup(groupName, [draggedDevice.sn, targetDevice.sn], roomId);
          setDragOverDevice(null);
          setDraggedDeviceId(null);
          setCurrentTargetDevice(null);
        }, 1000); // 1 second hover
      }
    }
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the element
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverDevice(null);
      if (dragOverTimerRef.current) {
        clearTimeout(dragOverTimerRef.current);
        dragOverTimerRef.current = null;
      }
      dragAndDrop.handleDragLeave();
    }
  };
  
  const handleDragEnd = () => {
    setDraggedDeviceId(null);
    setDragOverDevice(null);
    setCurrentTargetDevice(null);
    if (dragOverTimerRef.current) {
      clearTimeout(dragOverTimerRef.current);
    }
    dragAndDrop.handleDragEnd();
  };

  return (
    <div className="room-device-grid">
      {/* Render all devices (including those in groups) */}
      {orderedDevices.map((device, deviceIndex) => {
        const itemIndex = allItems.findIndex(item => 'sn' in item && item.sn === device.sn);
        return (
          <div
            key={device.sn}
            className={`device-card-wrapper ${dragAndDrop.draggedIndex === itemIndex ? 'dragging' : ''} ${dragAndDrop.dragOverIndex === itemIndex ? 'drag-over' : ''} ${dragOverDevice === device.sn ? 'creating-group' : ''}`}
            draggable
            onDragStart={handleDragStart(device)}
            onDragEnd={handleDragEnd}
            onDragEnter={dragAndDrop.handleDragEnter(itemIndex)}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver(device, itemIndex)}
            onDrop={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const relativeX = x / rect.width;
              
              const draggedDevice = devices.find(d => d.sn === draggedDeviceId);
              if (draggedDevice && draggedDevice.type === device.type && relativeX > 0.25) {
                // Group creation already handled by timer in dragOver
                handleDragEnd();
              } else {
                // Reorder
                dragAndDrop.handleDrop(itemIndex)(e);
              }
            }}
          >
            <DeviceCard 
              device={device}
              onClick={() => onDeviceClick(device)}
              onToggle={(e) => onDeviceToggle(device, e)}
            />
          </div>
        );
      })}
    </div>
  );
};

export default RoomDeviceGrid;