import React, { useState, useRef, useEffect } from 'react';
import { Room } from '../types';
import './RoomNameEditor.css';

interface RoomNameEditorProps {
  room?: Room;
  roomId?: string;
  roomName?: string;
  roomIcon?: string;
  className?: string;
  onEditComplete?: () => void;
  isCollapsed?: boolean;
  onUpdateRoom?: (roomId: string, updates: Partial<Room>) => void;
  onDeleteRoom?: (roomId: string) => void;
}

const ROOM_ICONS = [
  { emoji: '🛋️', name: '客廳' },
  { emoji: '🛏️', name: '臥室' },
  { emoji: '🍳', name: '廚房' },
  { emoji: '🚿', name: '浴室' },
  { emoji: '🍽️', name: '餐廳' },
  { emoji: '📚', name: '書房' },
  { emoji: '👶', name: '嬰兒房' },
  { emoji: '🎮', name: '遊戲室' },
  { emoji: '🚪', name: '玄關' },
  { emoji: '🧺', name: '洗衣間' },
  { emoji: '👕', name: '更衣室' },
  { emoji: '🏺', name: '儲藏室' },
  { emoji: '🎬', name: '影音室' },
  { emoji: '🍷', name: '酒窖' },
  { emoji: '🏋️', name: '健身房' },
  { emoji: '🧘', name: '瑜伽室' },
  { emoji: '🛁', name: '主浴室' },
  { emoji: '🌳', name: '花園' },
  { emoji: '🏊', name: '泳池' },
  { emoji: '🚗', name: '車庫' },
  { emoji: '🏠', name: '陽台' },
  { emoji: '🌿', name: '露台' },
  { emoji: '🏢', name: '辦公室' },
  { emoji: '💼', name: '會議室' },
  { emoji: '🖥️', name: '電腦室' },
  { emoji: '☕', name: '茶水間' },
  { emoji: '🛠️', name: '工作室' },
  { emoji: '🎨', name: '設計室' },
  { emoji: '🏛️', name: '大廳' },
  { emoji: '🎯', name: '交誼廳' },
  { emoji: '🚶', name: '走廊' },
  { emoji: '⚡', name: '電氣室' },
  { emoji: '🔧', name: '機房' },
];

const RoomNameEditor: React.FC<RoomNameEditorProps> = ({
  room,
  roomId: propRoomId,
  roomName: propRoomName,
  roomIcon: propRoomIcon,
  className = '',
  onEditComplete,
  isCollapsed = false,
  onUpdateRoom,
  onDeleteRoom,
}) => {
  const id = room?.id || propRoomId || '';
  const name = room?.name || propRoomName || '';
  const icon = room?.icon || propRoomIcon || '🏠';

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [isEditingIcon, setIsEditingIcon] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(icon);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedName(name);
    setSelectedIcon(icon);
  }, [name, icon]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const doUpdate = (updates: Partial<Room>) => {
    if (onUpdateRoom) {
      onUpdateRoom(id, updates);
    }
  };

  const handleNameSubmit = () => {
    if (editedName.trim() && editedName !== name) {
      doUpdate({ name: editedName.trim() });
    }
    setIsEditingName(false);
    onEditComplete?.();
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleNameSubmit();
    else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(name);
    }
  };

  const handleIconSelect = (emoji: string) => {
    setSelectedIcon(emoji);
    doUpdate({ icon: emoji });
    setIsEditingIcon(false);
    onEditComplete?.();
  };

  return (
    <>
      <span
        className={`room-editor-icon ${className} ${isCollapsed ? 'collapsed' : ''}`}
        onDoubleClick={(e) => {
          if (!isCollapsed) {
            e.stopPropagation();
            setIsEditingIcon(!isEditingIcon);
          }
        }}
        title={!isCollapsed ? '雙擊更換圖標' : ''}
      >
        {selectedIcon}
      </span>

      {!isCollapsed && (
        isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            className="room-name-input"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="room-editor-name"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditingName(true);
              setEditedName(name);
            }}
            title="雙擊編輯名稱"
          >
            {name}
          </span>
        )
      )}

      {isEditingIcon && (
        <div className="icon-picker-overlay" onClick={() => setIsEditingIcon(false)}>
          <div className="icon-picker" onClick={(e) => e.stopPropagation()}>
            <div className="icon-picker-header">選擇房間圖標</div>
            <div className="icon-grid">
              {ROOM_ICONS.map(({ emoji, name: iconName }) => (
                <button
                  key={emoji + iconName}
                  className={`icon-option ${selectedIcon === emoji ? 'selected' : ''}`}
                  onClick={() => handleIconSelect(emoji)}
                  title={iconName}
                >
                  <span className="icon-emoji">{emoji}</span>
                  <span className="icon-name">{iconName}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RoomNameEditor;
