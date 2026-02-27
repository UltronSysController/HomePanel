import { Device, Room, AISuggestion } from '../types';

interface SuggestionContext {
  devices: Record<string, Device>;
  rooms: Room[];
  devicesByRoom: Record<string, Device[]>;
  weather: {
    temperature: number;
    description: string;
    weatherCode: number;
    humidity?: number;
  } | null;
  currentHour: number;
}

let suggestionCounter = 0;

function nextId(): string {
  return `suggestion-${++suggestionCounter}-${Date.now()}`;
}

/**
 * Rule-based AI suggestion engine.
 * Evaluates current home state and returns contextual suggestions.
 */
export function generateSuggestions(context: SuggestionContext): AISuggestion[] {
  const { devices, rooms, devicesByRoom, weather, currentHour } = context;
  const suggestions: AISuggestion[] = [];
  const allDevices = Object.values(devices);

  // --- Offline devices ---
  const offlineDevices = allDevices.filter(d => !d.online);
  if (offlineDevices.length > 0) {
    suggestions.push({
      id: nextId(),
      type: 'offline',
      icon: '⚠️',
      title: `${offlineDevices.length} 個設備離線`,
      description: offlineDevices.slice(0, 3).map(d => d.name).join('、') +
        (offlineDevices.length > 3 ? ` 等 ${offlineDevices.length} 個設備` : ''),
      dismissible: true,
    });
  }

  // --- Late night + lights still on ---
  if (currentHour >= 23 || currentHour < 5) {
    const lightsOn = allDevices.filter(d => d.type === 'light' && d.state?.power === true);
    if (lightsOn.length > 0) {
      suggestions.push({
        id: nextId(),
        type: 'time',
        icon: '🌙',
        title: '夜深了，還有燈光未關',
        description: `${lightsOn.length} 盞燈仍在開啟中，建議啟用「晚安」情境`,
        actionLabel: '一鍵關燈',
        dismissible: true,
      });
    }
  }

  // --- Morning suggestion ---
  if (currentHour >= 6 && currentHour < 9) {
    const lightsOn = allDevices.filter(d => d.type === 'light' && d.state?.power === true);
    if (lightsOn.length === 0) {
      suggestions.push({
        id: nextId(),
        type: 'time',
        icon: '☀️',
        title: '早安！開始新的一天',
        description: '建議啟用「早安」情境，打開客廳燈光',
        actionLabel: '啟用早安',
        dismissible: true,
      });
    }
  }

  // --- Weather: hot outside, AC off ---
  if (weather && weather.temperature > 32) {
    const acDevices = allDevices.filter(d => d.type === 'airConditioner');
    const acAllOff = acDevices.length > 0 && acDevices.every(d => !d.state?.power);
    if (acAllOff) {
      suggestions.push({
        id: nextId(),
        type: 'weather',
        icon: '🌡️',
        title: `室外 ${weather.temperature}°C，天氣炎熱`,
        description: '所有冷氣都已關閉，建議開啟冷氣降溫',
        actionLabel: '開啟冷氣',
        dismissible: true,
      });
    }
  }

  // --- Weather: cold outside, AC/heater off ---
  if (weather && weather.temperature < 15) {
    const acDevices = allDevices.filter(d => d.type === 'airConditioner' || d.type === 'thermostat');
    const allOff = acDevices.length > 0 && acDevices.every(d => !d.state?.power);
    if (allOff) {
      suggestions.push({
        id: nextId(),
        type: 'weather',
        icon: '❄️',
        title: `室外 ${weather.temperature}°C，天氣寒冷`,
        description: '建議開啟暖氣保持室內溫暖',
        actionLabel: '開啟暖氣',
        dismissible: true,
      });
    }
  }

  // --- Sensor: high CO2 in a room ---
  for (const room of rooms) {
    const roomDevices = devicesByRoom[room.id] || [];
    const sensors = roomDevices.filter(d => d.type === 'sensor');
    for (const sensor of sensors) {
      if (sensor.state?.co2 !== undefined && sensor.state.co2 > 1000) {
        suggestions.push({
          id: nextId(),
          type: 'sensor',
          icon: '💨',
          title: `${room.name} CO₂ 偏高`,
          description: `目前 ${sensor.state.co2} ppm，建議開窗或啟動換氣設備`,
          dismissible: true,
        });
        break; // One suggestion per room
      }
    }
  }

  // --- Sensor: high humidity in a room ---
  for (const room of rooms) {
    const roomDevices = devicesByRoom[room.id] || [];
    const sensors = roomDevices.filter(d => d.type === 'sensor');
    for (const sensor of sensors) {
      if (sensor.state?.humidity !== undefined && sensor.state.humidity > 75) {
        suggestions.push({
          id: nextId(),
          type: 'sensor',
          icon: '💧',
          title: `${room.name} 濕度偏高`,
          description: `目前 ${sensor.state.humidity}%，建議開啟除濕機`,
          dismissible: true,
        });
        break;
      }
    }
  }

  // --- Sensor: poor air quality (PM2.5) ---
  for (const room of rooms) {
    const roomDevices = devicesByRoom[room.id] || [];
    const sensors = roomDevices.filter(d => d.type === 'sensor');
    for (const sensor of sensors) {
      if (sensor.state?.pm25 !== undefined && sensor.state.pm25 > 35) {
        suggestions.push({
          id: nextId(),
          type: 'sensor',
          icon: '🌫️',
          title: `${room.name} 空氣品質不佳`,
          description: `PM2.5 ${sensor.state.pm25} μg/m³，建議開啟空氣清淨機`,
          dismissible: true,
        });
        break;
      }
    }
  }

  // --- Energy: high power device running long ---
  const highPowerDevices = allDevices.filter(
    d => d.state?.power === true && d.state?.watt !== undefined && d.state.watt > 100
  );
  if (highPowerDevices.length > 0) {
    const topDevice = highPowerDevices.reduce((max, d) =>
      (d.state?.watt || 0) > (max.state?.watt || 0) ? d : max
    );
    suggestions.push({
      id: nextId(),
      type: 'energy',
      icon: '⚡',
      title: '高耗電設備運行中',
      description: `${topDevice.name} 正消耗 ${topDevice.state?.watt}W`,
      dismissible: true,
    });
  }

  // --- State: many lights still on ---
  const lightsOn = allDevices.filter(d => d.type === 'light' && d.state?.power === true);
  if (lightsOn.length >= 5) {
    suggestions.push({
      id: nextId(),
      type: 'state',
      icon: '💡',
      title: `${lightsOn.length} 盞燈正在使用`,
      description: '確認是否需要這麼多燈光？關閉不需要的燈可以省電',
      dismissible: true,
    });
  }

  return suggestions;
}

const aiSuggestionEngine = { generateSuggestions };
export default aiSuggestionEngine;
