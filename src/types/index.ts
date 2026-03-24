// ============================================
// HomePanel — Type Definitions
// ============================================

// --- Groups / Locations ---
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

// --- Devices ---
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
  originalSn?: string;
  subDeviceIndex?: number;
  iotDev?: string;
  toggleKey?: string;
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
  watt?: number;
  voltage?: number;
  current?: number;
  kwh?: number;
  pm25?: number;
  co2?: number;
  illuminance?: number;
  motion?: boolean;
  contact?: boolean;
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

// --- Rooms ---
export interface Room {
  id: string;
  name: string;
  icon: string;
  devices: string[];
  temperature?: number;
}

// --- API Config ---
export interface ApiConfig {
  appId: string;
  apiKey: string;
  apiType: 'personal' | 'enterprise';
  apiEndpoint?: string;
  orgId?: string;
}

// --- Scenes ---
export interface Scene {
  id: string;
  name: string;
  icon: string;
  actions: SceneAction[];
  isActive?: boolean;
}

export interface SceneAction {
  deviceSn: string;
  command: any;
}

// --- Device Groups ---
export interface DeviceGroup {
  id: string;
  name: string;
  type: DeviceType;
  deviceIds: string[];
  roomId: string;
  isExpanded?: boolean;
  createdAt: number;
  updatedAt: number;
}

// --- Automations ---
export interface Automation {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  type: AutomationType;
  trigger: AutomationTrigger;
  conditions?: AutomationCondition[];
  actions: AutomationAction[];
  icon?: string;
  lastTriggered?: number;
  createdAt: number;
  updatedAt: number;
}

export type AutomationType =
  | 'sensor_range'
  | 'activity'
  | 'state'
  | 'timebased'
  | 'script';

export interface AutomationTrigger {
  type: 'device_state' | 'sensor_value' | 'time' | 'manual';
  deviceSn?: string;
  sensorType?: string;
  value?: any;
  operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  schedule?: {
    time: string;
    days?: string[];
    repeat?: 'once' | 'daily' | 'weekly' | 'monthly';
  };
}

export interface AutomationCondition {
  type: string;
  deviceSn?: string;
  property?: string;
  operator: string;
  value: any;
}

export interface AutomationAction {
  type: 'control_device' | 'apply_scene' | 'send_notification' | 'wait';
  deviceSn?: string;
  command?: any;
  sceneId?: string;
  message?: string;
  delay?: number;
}

// --- Alerts ---
export interface Alert {
  id: string;
  name: string;
  deviceSn: string;
  metric: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  notifyEmail?: boolean;
  notifyPush?: boolean;
  lastTriggered?: number;
}

// --- Energy ---
export interface EnergyData {
  deviceSn: string;
  deviceName: string;
  totalEnergy: number;
  averagePower: number;
  peakPower: number;
  cost: number;
  powerData: PowerReading[];
}

export interface PowerReading {
  timestamp: number;
  power: number;
  current?: number;
  voltage?: number;
  energy?: number;
}

export interface EnergyInsights {
  totalConsumption: number;
  totalCost: number;
  averageDailyUsage: number;
  peakUsageTime: string;
  recommendations: string[];
  deviceBreakdown: Array<{
    deviceSn: string;
    deviceName: string;
    consumption: number;
    percentage: number;
  }>;
}

// --- Navigation ---
export type TabId = 'home' | 'automation' | 'energy' | 'settings';
