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
  onReorderDevices,
}) => {
  const { createDeviceGroup } = useSmartHomeStore();
  const [dragOverDevice, setDragOverDevice] = useState<string | null>(null);
  const dragOverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [draggedDeviceId, setDraggedDeviceId] = useState<string | null>(null);
  const [currentTargetDevice, setCurrentTargetDevice] = useState<string | null>(null);

  const standaloneDevices = devices;

  const orderedDevices =
    deviceOrder.length > 0
      ? deviceOrder
          .map(sn => standaloneDevices.find(d => d.sn === sn))
          .filter((device): device is Device => device !== undefined)
          .concat(standaloneDevices.filter(d => !deviceOrder.includes(d.sn)))
      : standaloneDevices;

  const allItems = [...orderedDevices];

  const dragAndDrop = useDragAndDrop({
    items: allItems,
    onReorder: newItems => {
      const newDevices = newItems.filter((item): item is Device => 'sn' in item);
      const newOrder = newDevices.map(device => device.sn);
      onReorderDevices(roomId, newOrder);
    },
    itemKey: item => item.sn,
  });

  const handleDragStart = (device: Device) => (e: React.DragEvent) => {
    setDraggedDeviceId(device.sn);
    const index = allItems.findIndex(item => 'sn' in item && item.sn === device.sn);
    dragAndDrop.handleDragStart(index)(e);
    e.dataTransfer.effectAllowed = 'move';
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

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = x / rect.width;

    if (draggedDevice.type !== targetDevice.type) {
      setDragOverDevice(null);
      dragAndDrop.handleDragOver(e);
      return;
    }

    if (relativeX <= 0.25) {
      setDragOverDevice(null);
      setCurrentTargetDevice(null);
      if (dragOverTimerRef.current) clearTimeout(dragOverTimerRef.current);
      dragAndDrop.handleDragOver(e);
    } else {
      setDragOverDevice(targetDevice.sn);
      if (currentTargetDevice !== targetDevice.sn) {
        setCurrentTargetDevice(targetDevice.sn);
        if (dragOverTimerRef.current) clearTimeout(dragOverTimerRef.current);
        dragOverTimerRef.current = setTimeout(() => {
          const groupName = `${draggedDevice.name} + ${targetDevice.name}`;
          createDeviceGroup(groupName, [draggedDevice.sn, targetDevice.sn], roomId);
          setDragOverDevice(null);
          setDraggedDeviceId(null);
          setCurrentTargetDevice(null);
        }, 1000);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
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
    if (dragOverTimerRef.current) clearTimeout(dragOverTimerRef.current);
    dragAndDrop.handleDragEnd();
  };

  return (
    <div className="device-grid">
      {orderedDevices.map(device => {
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
            onDrop={e => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const relativeX = x / rect.width;
              const draggedDevice = devices.find(d => d.sn === draggedDeviceId);
              if (draggedDevice && draggedDevice.type === device.type && relativeX > 0.25) {
                handleDragEnd();
              } else {
                dragAndDrop.handleDrop(itemIndex)(e);
              }
            }}
          >
            <DeviceCard
              device={device}
              onClick={() => onDeviceClick(device)}
              isDragging={dragAndDrop.draggedIndex === itemIndex}
            />
          </div>
        );
      })}
    </div>
  );
};

export default RoomDeviceGrid;
