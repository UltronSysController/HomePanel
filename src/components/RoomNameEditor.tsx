import React, { useState, useRef, useEffect } from 'react';
import useSmartHomeStore from '../store';
import './RoomNameEditor.css';

interface RoomNameEditorProps {
  roomId: string;
  roomName: string;
  roomIcon: string;
  className?: string;
  onEditComplete?: () => void;
  isCollapsed?: boolean;
}

const RoomNameEditor: React.FC<RoomNameEditorProps> = ({ 
  roomId, 
  roomName, 
  roomIcon,
  className = '',
  onEditComplete,
  isCollapsed = false
}) => {
  const { updateRoom } = useSmartHomeStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(roomName);
  const [isEditingIcon, setIsEditingIcon] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(roomIcon);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // 常用房間 emoji
  const roomIcons = [
    // 住宅空間
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
    { emoji: '🚽', name: '客用廁所' },
    
    // 戶外空間
    { emoji: '🌳', name: '花園' },
    { emoji: '🏊', name: '泳池' },
    { emoji: '🚗', name: '車庫' },
    { emoji: '🏠', name: '陽台' },
    { emoji: '🌿', name: '露台' },
    { emoji: '🔥', name: '烤肉區' },
    { emoji: '⛲', name: '庭院' },
    
    // 辦公空間
    { emoji: '🏢', name: '辦公室' },
    { emoji: '💼', name: '會議室' },
    { emoji: '🖥️', name: '電腦室' },
    { emoji: '📞', name: '接待處' },
    { emoji: '☕', name: '茶水間' },
    { emoji: '🖨️', name: '列印室' },
    { emoji: '📊', name: '簡報室' },
    { emoji: '🗄️', name: '檔案室' },
    { emoji: '🛠️', name: '工作室' },
    { emoji: '🎨', name: '設計室' },
    { emoji: '📹', name: '攝影棚' },
    { emoji: '🎙️', name: '錄音室' },
    
    // 社區公共空間
    { emoji: '🏛️', name: '大廳' },
    { emoji: '🎯', name: '交誼廳' },
    { emoji: '📬', name: '信箱區' },
    { emoji: '🚶', name: '走廊' },
    { emoji: '🛗', name: '電梯間' },
    { emoji: '🚨', name: '管理室' },
    { emoji: '📦', name: '包裹室' },
    { emoji: '🗑️', name: '垃圾間' },
    { emoji: '🚴', name: '腳踏車間' },
    { emoji: '🏃', name: '健身中心' },
    { emoji: '♨️', name: 'SPA' },
    { emoji: '🎪', name: '活動中心' },
    { emoji: '🎓', name: '閱讀室' },
    { emoji: '🧸', name: '兒童遊戲室' },
    
    // 其他
    { emoji: '🏪', name: '商店' },
    { emoji: '🏥', name: '醫務室' },
    { emoji: '🔧', name: '機房' },
    { emoji: '⚡', name: '電氣室' },
    { emoji: '🚿', name: '公共浴室' },
    { emoji: '🎭', name: '娛樂室' },
    { emoji: '🎪', name: '多功能室' }
  ];

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameSubmit = () => {
    if (editedName.trim() && editedName !== roomName) {
      updateRoom(roomId, { name: editedName.trim() });
    }
    setIsEditingName(false);
    onEditComplete?.();
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(roomName);
    }
  };

  const handleIconSelect = (emoji: string) => {
    setSelectedIcon(emoji);
    updateRoom(roomId, { icon: emoji });
    setIsEditingIcon(false);
    onEditComplete?.();
  };

  const handleIconDoubleClick = (e: React.MouseEvent) => {
    if (!isCollapsed) {
      e.stopPropagation();
      setIsEditingIcon(!isEditingIcon);
    }
    // When collapsed, let the click bubble up to select the room
  };

  return (
    <>
      <span 
        className={`nav-icon ${className} ${isEditingIcon ? 'editing' : ''} ${isCollapsed ? 'collapsed' : ''}`}
        onDoubleClick={handleIconDoubleClick}
        title={!isCollapsed ? "雙擊更換圖標" : ""}
        style={{ cursor: isCollapsed ? 'pointer' : 'pointer' }}
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
            className="nav-text editable"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditingName(true);
              setEditedName(roomName);
            }}
            title="雙擊編輯名稱"
          >
            {roomName}
          </span>
        )
      )}

      {/* Icon Picker Popup */}
      {isEditingIcon && (
        <div className="icon-picker-overlay" onClick={() => setIsEditingIcon(false)}>
          <div className="icon-picker" onClick={(e) => e.stopPropagation()}>
            <div className="icon-picker-header">選擇房間圖標</div>
            <div className="icon-grid">
              {roomIcons.map(({ emoji, name }) => (
                <button
                  key={emoji}
                  className={`icon-option ${selectedIcon === emoji ? 'selected' : ''}`}
                  onClick={() => handleIconSelect(emoji)}
                  title={name}
                >
                  <span className="icon-emoji">{emoji}</span>
                  <span className="icon-name">{name}</span>
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