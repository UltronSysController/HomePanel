import React, { useState } from 'react';
import { X } from 'lucide-react';
import useSmartHomeStore from '../store';
import './AddRoomModal.css';

interface AddRoomModalProps {
  onClose: () => void;
}

const roomIcons = [
  { icon: '🏠', name: '房屋' },
  { icon: '🛏️', name: '臥室' },
  { icon: '🛋️', name: '客廳' },
  { icon: '🍳', name: '廚房' },
  { icon: '🚿', name: '浴室' },
  { icon: '🍽️', name: '餐廳' },
  { icon: '📚', name: '書房' },
  { icon: '🎮', name: '遊戲室' },
  { icon: '🏋️', name: '健身房' },
  { icon: '🚗', name: '車庫' },
  { icon: '🌳', name: '花園' },
  { icon: '🏢', name: '辦公室' },
  { icon: '👶', name: '嬰兒房' },
  { icon: '🧸', name: '兒童房' },
  { icon: '🎬', name: '影音室' },
  { icon: '🧺', name: '洗衣房' },
];

const AddRoomModal: React.FC<AddRoomModalProps> = ({ onClose }) => {
  const { addRoom } = useSmartHomeStore();
  const [roomName, setRoomName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🏠');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim()) {
      addRoom({
        name: roomName.trim(),
        icon: selectedIcon
      });
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="add-room-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>新增房間</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>房間名稱</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="輸入房間名稱"
              autoFocus
              maxLength={20}
            />
          </div>

          <div className="form-group">
            <label>選擇圖示</label>
            <div className="icon-grid">
              {roomIcons.map(({ icon, name }) => (
                <button
                  key={icon}
                  type="button"
                  className={`icon-option ${selectedIcon === icon ? 'selected' : ''}`}
                  onClick={() => setSelectedIcon(icon)}
                  title={name}
                >
                  <span className="icon">{icon}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-button" onClick={onClose}>
              取消
            </button>
            <button 
              type="submit" 
              className="submit-button"
              disabled={!roomName.trim()}
            >
              新增
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRoomModal;