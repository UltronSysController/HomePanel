import React, { useState, useRef } from 'react';
import { Device, Room } from '../types';
import DeviceCard from './DeviceCard';
import useSmartHomeStore from '../store';
import styles from './RoomSection.module.css';

interface RoomSectionProps {
  room: Room;
  devices: Device[];
  temperature?: string | null;
}

const RoomSection: React.FC<RoomSectionProps> = ({ room, devices, temperature }) => {
  const { updateDeviceRoom, updateDeviceOrder, deviceOrder } = useSmartHomeStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const draggedDeviceRef = useRef<string | null>(null);
  const activeDeviceCount = devices.filter(d => d.state.power).length;
  
  // 根據儲存的順序排序設備
  const sortedDevices = React.useMemo(() => {
    const order = deviceOrder[room.id] || [];
    if (order.length === 0) return devices;
    
    // 創建一個 map 來快速查找設備
    const deviceMap = new Map(devices.map(d => [d.sn, d]));
    const sorted: Device[] = [];
    
    // 先按照儲存的順序添加設備
    order.forEach(sn => {
      const device = deviceMap.get(sn);
      if (device) {
        sorted.push(device);
        deviceMap.delete(sn);
      }
    });
    
    // 添加新設備（不在順序列表中的）
    deviceMap.forEach(device => {
      sorted.push(device);
    });
    
    return sorted;
  }, [devices, deviceOrder, room.id]);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };
  
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragOverIndex(null);
    
    const deviceSn = e.dataTransfer.getData('deviceSn');
    const sourceRoomId = e.dataTransfer.getData('roomId');
    const sourceIndex = e.dataTransfer.getData('index');
    
    if (deviceSn) {
      // 如果是從其他房間拖過來的
      if (sourceRoomId !== room.id) {
        updateDeviceRoom(deviceSn, room.id);
        // 更新新房間的設備順序
        const newOrder = [...(deviceOrder[room.id] || []), deviceSn];
        updateDeviceOrder(room.id, newOrder);
      }
    }
    
    draggedDeviceRef.current = null;
    setDraggedIndex(null);
  };
  
  const handleDeviceDragStart = (index: number, deviceSn: string) => {
    setDraggedIndex(index);
    draggedDeviceRef.current = deviceSn;
  };
  
  const handleDeviceDragOver = (index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };
  
  const handleDeviceDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    const newDevices = [...sortedDevices];
    const [draggedDevice] = newDevices.splice(draggedIndex, 1);
    newDevices.splice(dropIndex, 0, draggedDevice);
    
    // 更新設備順序
    const newOrder = newDevices.map(d => d.sn);
    updateDeviceOrder(room.id, newOrder);
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <section 
      className={`${styles.roomSection} ${isDragOver ? styles.dragOver : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.roomHeader}>
        <div className={styles.roomInfo}>
          <span className={styles.roomIcon}>{room.icon}</span>
          <div>
            <h2 className={styles.roomName}>{room.name}</h2>
            <p className={styles.deviceCount}>
              {activeDeviceCount > 0 && `${activeDeviceCount} 個配件開啟`}
              {activeDeviceCount === 0 && devices.length > 0 && '關閉'}
              {devices.length === 0 && '無配件'}
            </p>
          </div>
        </div>
        {temperature && (
          <div className={styles.temperature}>
            <span className={styles.tempValue}>{temperature}</span>
            <span className={styles.tempUnit}>°C</span>
          </div>
        )}
      </div>

      {sortedDevices.length > 0 && (
        <div className={styles.deviceGrid}>
          {sortedDevices.map((device, index) => (
            <div
              key={device.sn}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('deviceSn', device.sn);
                e.dataTransfer.setData('roomId', room.id);
                e.dataTransfer.setData('index', index.toString());
                e.dataTransfer.effectAllowed = 'move';
                handleDeviceDragStart(index, device.sn);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeviceDragOver(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeviceDrop(index);
              }}
              onDragEnd={() => {
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              className={`${styles.deviceCardWrapper} ${
                draggedIndex === index ? styles.dragging : ''
              } ${dragOverIndex === index ? styles.dragOver : ''}`}
              onMouseDown={(e) => e.preventDefault()}
            >
              <DeviceCard 
                device={device} 
                onClick={() => {
                  // 開啟設備控制面板
                  if (device.online && device.type !== 'sensor' && device.type !== 'camera') {
                    useSmartHomeStore.getState().toggleDevice(device.sn);
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default RoomSection;