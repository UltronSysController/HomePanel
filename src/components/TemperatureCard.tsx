import React from 'react';

interface TemperatureCardProps {
  temperature: number;
  roomName: string;
  onClick: () => void;
}

const TemperatureCard: React.FC<TemperatureCardProps> = ({ temperature, roomName, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '1rem',
        padding: '1.5rem',
        cursor: 'pointer',
        transition: 'all 150ms',
        height: '100%'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <h3 style={{ 
          color: 'white', 
          fontSize: '0.875rem', 
          fontWeight: '500', 
          marginBottom: '0.5rem' 
        }}>
          {roomName}
        </h3>
        <div style={{ 
          color: 'white', 
          fontSize: '2.25rem', 
          fontWeight: '300', 
          marginTop: 'auto' 
        }}>
          {temperature}°
        </div>
      </div>
    </div>
  );
};

export default TemperatureCard;