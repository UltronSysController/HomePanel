import React, { useState } from 'react';
import {
  Home,
  Zap,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TabId, Room } from '../types';
import RoomNameEditor from './RoomNameEditor';
import './Sidebar.css';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  rooms: Room[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  onAddRoom: () => void;
  onUpdateRoom: (roomId: string, updates: Partial<Room>) => void;
  onDeleteRoom: (roomId: string) => void;
  onDeviceDropToRoom?: (roomId: string) => void;
  dragOverRoomId?: string | null;
}

const NAV_ITEMS: { id: TabId; icon: React.ElementType; label: string }[] = [
  { id: 'home', icon: Home, label: '家庭' },
  { id: 'automation', icon: Zap, label: '自動化' },
  { id: 'energy', icon: BarChart3, label: '能源' },
  { id: 'settings', icon: Settings, label: '設定' },
];

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  rooms,
  selectedRoomId,
  onSelectRoom,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
  onDeviceDropToRoom,
  dragOverRoomId,
}) => {
  const [roomsExpanded, setRoomsExpanded] = useState(true);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-inner">
          {/* Collapse Toggle */}
          <button
            className="sidebar-toggle"
            onClick={onToggleCollapse}
            aria-label={collapsed ? '展開側邊欄' : '收合側邊欄'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Brand */}
          {!collapsed && (
            <div className="sidebar-brand">
              <div className="brand-icon">🏠</div>
              <span className="brand-text">HomePanel</span>
            </div>
          )}

          {/* Navigation */}
          <nav className="sidebar-nav">
            {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                className={`nav-item ${activeTab === id ? 'active' : ''}`}
                onClick={() => {
                  onTabChange(id);
                  if (id !== 'home') onSelectRoom(null);
                }}
                title={collapsed ? label : undefined}
              >
                <div className="nav-icon">
                  <Icon size={22} strokeWidth={activeTab === id ? 2 : 1.5} />
                </div>
                {!collapsed && <span className="nav-label">{label}</span>}
              </button>
            ))}
          </nav>

          {/* Room List — only visible on Home tab when expanded */}
          {activeTab === 'home' && !collapsed && (
            <div className="sidebar-rooms">
              <div className="rooms-header">
                <button
                  className="rooms-toggle"
                  onClick={() => setRoomsExpanded(!roomsExpanded)}
                >
                  <span className="rooms-title">房間</span>
                  {roomsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button className="rooms-add" onClick={onAddRoom} title="新增房間">
                  <Plus size={14} />
                </button>
              </div>

              {roomsExpanded && (
                <div className="rooms-list">
                  <button
                    className={`room-item ${selectedRoomId === null ? 'active' : ''}`}
                    onClick={() => onSelectRoom(null)}
                  >
                    <span className="room-icon">🏠</span>
                    <span className="room-name">所有房間</span>
                  </button>

                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className={`room-item ${selectedRoomId === room.id ? 'active' : ''} ${dragOverRoomId === room.id ? 'drag-over' : ''}`}
                      onClick={() => onSelectRoom(room.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (onDeviceDropToRoom) onDeviceDropToRoom(room.id);
                      }}
                    >
                      <RoomNameEditor
                        room={room}
                        isCollapsed={false}
                        onUpdateRoom={onUpdateRoom}
                        onDeleteRoom={onDeleteRoom}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          {!collapsed && (
            <div className="sidebar-footer">
              <span className="footer-text">Powered by ULTRON</span>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`bottom-nav-item ${activeTab === id ? 'active' : ''}`}
            onClick={() => {
              onTabChange(id);
              if (id !== 'home') onSelectRoom(null);
            }}
          >
            <Icon size={24} strokeWidth={activeTab === id ? 2 : 1.5} />
            <span className="bottom-nav-label">{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
};

export default Sidebar;
