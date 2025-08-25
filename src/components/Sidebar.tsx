import React from 'react';
import { Home, Grid, Mic, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { id: 'home', icon: Home, label: '家居', path: '/' },
    { id: 'rooms', icon: Grid, label: '房間', path: '/rooms' },
    { id: 'automation', icon: Mic, label: '自動化', path: '/automation' },
    { id: 'settings', icon: Settings, label: '設定', path: '/config' }
  ];

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
          >
            <item.icon size={24} />
            <span className={styles.label}>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;