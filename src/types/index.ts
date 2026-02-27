// 群組相關類型
export interface Group {
  groupId: string;
  name: string;
  deviceCount: number;
  members: Member[];
  owner?: Member;
}

export interface Member {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

// 設備相關類型
export interface Device {
  sn: string;
  name: string;
  displayName?: string;
  bundleName?: string;
  online: boolean;
  type: DeviceType;
  state: DeviceState;
  roomId?: string;
  capabilities?: string[];
  iotDevs?: string[];
  toggles?: string[];
  status?: any;
  endpoint?: any;
  icon?: string;
  deviceIcon?: string;
  bundleIcon?: string;
  traits?: string[];
  originalSn?: string; // 如果是拆分的子設備，這是原始設備的 SN
  subDeviceIndex?: number; // 子設備的索引
  iotDev?: string; // 指定的 iotDev（用於子設備）
  toggleKey?: string; // 指定的 toggle key（用於多開關設備）
}

export interface DeviceState {
  power?: boolean;
  temperature?: number;
  humidity?: number;
  brightness?: number;
  color?: string;
  colorTemperature?: number;
  colorTemperatureRange?: {
    min: number;
    max: number;
  };
  [key: string]: any;
}

export type DeviceType = 
  | 'light'
  | 'switch'
  | 'airConditioner'
  | 'fan'
  | 'sensor'
  | 'camera'
  | 'lock'
  | 'thermostat'
  | 'outlet'
  | 'humidifier'
  | 'dehumidifier'
  | 'gateway'
  | 'bridge'
  | 'other';

// 房間相關類型
export interface Room {
  id: string;
  name: string;
  icon: string;
  devices: string[]; // device SNs
  temperature?: number;
}

// API 配置類型
export interface ApiConfig {
  appId: string;
  apiKey: string;
  apiType: 'personal' | 'enterprise';
  apiEndpoint?: string;
  orgId?: string; // 企業版需要
}

// 情境類型
export interface Scene {
  id: string;
  name: string;
  icon: string;
  actions: SceneAction[];
}

export interface SceneAction {
  deviceSn: string;
  command: any;
}

// AI 建議類型
export interface AISuggestion {
  id: string;
  type: 'time' | 'weather' | 'sensor' | 'energy' | 'state' | 'offline';
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionDeviceSn?: string;
  dismissible: boolean;
}

// 設備群組類型
export interface DeviceGroup {
  id: string;
  name: string;
  type: DeviceType;
  deviceIds: string[]; // 包含的設備 SN
  roomId: string;
  isExpanded?: boolean; // UI 展開狀態
  createdAt: number;
  updatedAt: number;
}