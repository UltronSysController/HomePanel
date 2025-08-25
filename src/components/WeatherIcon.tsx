import React from 'react';
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Wind, CloudOff } from 'lucide-react';

interface WeatherIconProps {
  weatherCode: number;
  size?: number;
  color?: string;
}

const WeatherIcon: React.FC<WeatherIconProps> = ({ weatherCode, size = 24, color = 'white' }) => {
  const iconProps = { size, color, strokeWidth: 1.5 };
  
  // 根據 WMO 天氣代碼返回對應圖標
  if (weatherCode === 0 || weatherCode === 1) {
    // 晴朗
    return <Sun {...iconProps} />;
  } else if (weatherCode >= 2 && weatherCode <= 3) {
    // 多雲/陰天
    return <Cloud {...iconProps} />;
  } else if (weatherCode >= 45 && weatherCode <= 48) {
    // 霧
    return <CloudOff {...iconProps} />;
  } else if (weatherCode >= 51 && weatherCode <= 57) {
    // 毛毛雨
    return <CloudDrizzle {...iconProps} />;
  } else if (weatherCode >= 61 && weatherCode <= 67) {
    // 雨
    return <CloudRain {...iconProps} />;
  } else if (weatherCode >= 71 && weatherCode <= 77) {
    // 雪
    return <CloudSnow {...iconProps} />;
  } else if (weatherCode >= 80 && weatherCode <= 82) {
    // 陣雨
    return <CloudRain {...iconProps} />;
  } else if (weatherCode >= 85 && weatherCode <= 86) {
    // 陣雪
    return <CloudSnow {...iconProps} />;
  } else if (weatherCode >= 95 && weatherCode <= 99) {
    // 雷雨
    return <CloudLightning {...iconProps} />;
  } else {
    // 預設
    return <Cloud {...iconProps} />;
  }
};

export default WeatherIcon;