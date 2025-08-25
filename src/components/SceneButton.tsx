import React from 'react';
import './SceneButton.css';

interface SceneButtonProps {
  name: string;
  icon: string;
  colorClass: string;
  onClick: () => void;
}

const SceneButton: React.FC<SceneButtonProps> = ({ name, icon, colorClass, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-2xl bg-gradient-to-br ${colorClass} text-white font-medium flex items-center gap-3 hover:opacity-90 transition-opacity`}
      style={{
        padding: '1rem',
        borderRadius: '1rem',
        backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
        color: 'white',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        transition: 'opacity 150ms',
        cursor: 'pointer',
        border: 'none'
      }}
    >
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <span>{name}</span>
    </button>
  );
};

export default SceneButton;