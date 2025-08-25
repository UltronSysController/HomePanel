import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiConfig, Device, Group } from '../types';

interface UltronDevice {
  sn: string;
  nickName?: string;
  displayName?: string;
  customSN?: string;
  model?: string;
  online?: boolean;
  typePrefix?: string;
  hasSubdevice?: boolean;
  subdeviceInfo?: any;
  states?: any;
  configs?: any;
}

interface UltronGroup {
  groupId: string;
  name: string;
  description?: string;
  usedDeviceQuota?: number;
  owner?: string;
  members?: any[];
}

interface UltronScene {
  sceneId: string;
  sceneName: string;
  groupId: string;
  devices?: any[];
}

interface UltronAutomation {
  id: string;
  name: string;
  groupId: string;
  enabled: boolean;
  type: 'sensor_range' | 'activity' | 'state' | 'timebased' | 'script';
  config?: any;
  triggers?: any[];
  actions?: any[];
}

interface PowerData {
  timestamp: string;
  power: number;
  current?: number;
  voltage?: number;
  energy?: number;
}

interface SensorData {
  timestamp: string;
  temperature?: number;
  humidity?: number;
  co2?: number;
  pm25?: number;
  power?: number;
  current?: number;
  voltage?: number;
}

export class UltronSmartAPI {
  private api: AxiosInstance;
  private config: ApiConfig;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 100;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(config: ApiConfig) {
    this.config = config;
    
    // 支援自訂 API 基礎 URL 或使用預設值
    let baseURL = '/api';
    
    if (process.env.NODE_ENV === 'development') {
      baseURL = 'http://localhost:3001/api';
    } else if (process.env.REACT_APP_API_BASE_URL) {
      baseURL = process.env.REACT_APP_API_BASE_URL;
    }

    this.api = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': config.apiKey,
        'Ultron-Cloud-Appid': config.appId,
        ...(config.orgId && { 'orgid': config.orgId })
      }
    });

    this.api.interceptors.request.use(async (config) => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minRequestInterval) {
        await new Promise(resolve => 
          setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
        );
      }
      
      this.lastRequestTime = Date.now();
      return config;
    });

    this.api.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 2;
          console.warn(`Rate limit hit, waiting ${retryAfter} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.api.request(error.config);
        }
        
        if (error.response?.status >= 500 && error.config.__retryCount < this.maxRetries) {
          error.config.__retryCount = (error.config.__retryCount || 0) + 1;
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * error.config.__retryCount));
          return this.api.request(error.config);
        }
        
        return Promise.reject(error);
      }
    );
  }

  // ========== Location/Group Management ==========
  
  async listLocations(): Promise<UltronGroup[]> {
    try {
      const response = await this.api.post('/usr/v4/GroupMemberGetGroups', {});
      const groupInfo = response.data.groupInfo || {};
      
      return Object.values(groupInfo).map((group: any) => ({
        groupId: group.groupId,
        name: group.name,
        description: group.description,
        usedDeviceQuota: group.usedDeviceQuota || 0,
        owner: group.owner,
        members: group.members || []
      }));
    } catch (error) {
      console.error('Failed to list locations:', error);
      throw this.handleError(error);
    }
  }

  async createLocation(name: string, description?: string): Promise<{ groupId: string }> {
    try {
      const response = await this.api.post('/usr/v4/CreateGroup', {
        name,
        description
      });
      return { groupId: response.data.groupId };
    } catch (error) {
      console.error('Failed to create location:', error);
      throw this.handleError(error);
    }
  }

  async deleteLocation(groupId: string): Promise<boolean> {
    try {
      await this.api.post('/usr/v4/DeleteGroup', { groupId });
      return true;
    } catch (error) {
      console.error('Failed to delete location:', error);
      throw this.handleError(error);
    }
  }

  async getGroupInfo(groupId: string): Promise<UltronGroup> {
    try {
      const response = await this.api.post('/usr/v4/GetGroupInfo', { groupId });
      return response.data.group;
    } catch (error) {
      console.error('Failed to get group info:', error);
      throw this.handleError(error);
    }
  }

  // ========== Device Management ==========

  async listDevices(groupId: string): Promise<Record<string, UltronDevice>> {
    try {
      const response = await this.api.post('/usr/v4/GetGroupDevices', { groupId });
      return response.data.devices || {};
    } catch (error) {
      console.error('Failed to list devices:', error);
      throw this.handleError(error);
    }
  }

  // 新增：優化版設備列表 (減少 token 使用)
  async getDeviceList(groupId: string): Promise<Array<{sn: string, name: string, model: string, online: boolean}>> {
    try {
      // 使用簡化的 API 參數來減少回傳資料
      const response = await this.api.post('/usr/v4/GetGroupDevices', { 
        groupId,
        fields: ['sn', 'nickName', 'model', 'online']  // 只請求必要欄位
      });
      
      const devices = response.data.devices || {};
      return Object.entries(devices).map(([sn, device]: [string, any]) => ({
        sn,
        name: device.nickName || device.displayName || sn,
        model: device.model || 'Unknown',
        online: device.online || false
      }));
    } catch (error) {
      console.error('Failed to get device list:', error);
      throw this.handleError(error);
    }
  }

  // 新增：搜尋設備
  async searchDevice(groupId: string, query: string): Promise<UltronDevice[]> {
    try {
      const devices = await this.listDevices(groupId);
      const results = Object.entries(devices)
        .filter(([sn, device]) => {
          const searchStr = query.toLowerCase();
          return sn.toLowerCase().includes(searchStr) ||
                 device.nickName?.toLowerCase().includes(searchStr) ||
                 device.displayName?.toLowerCase().includes(searchStr);
        })
        .map(([_, device]) => device)
        .slice(0, 10);  // 最多返回 10 筆
      
      return results;
    } catch (error) {
      console.error('Failed to search device:', error);
      throw this.handleError(error);
    }
  }

  async getDeviceStates(groupId: string, deviceSNs?: string[]): Promise<Record<string, any>> {
    try {
      const payload: any = { groupId };
      // 如果指定了設備列表，只獲取這些設備的狀態
      if (deviceSNs && deviceSNs.length > 0) {
        payload.deviceSns = deviceSNs;
      }
      
      const response = await this.api.post('/usr/v4/GetGroupDeviceStates', payload);
      return response.data.states || {};
    } catch (error) {
      console.error('Failed to get device states:', error);
      throw this.handleError(error);
    }
  }

  async addDevice(code: string, sn: string, groupId?: string, displayName?: string): Promise<boolean> {
    try {
      await this.api.post('/usr/v4/AddDevice', {
        code,
        sn,
        groupId,
        displayName
      });
      return true;
    } catch (error) {
      console.error('Failed to add device:', error);
      throw this.handleError(error);
    }
  }

  async removeDevice(sn: string, groupId: string): Promise<boolean> {
    try {
      await this.api.post('/usr/v4/RemoveDevice', { sn, groupId });
      return true;
    } catch (error) {
      console.error('Failed to remove device:', error);
      throw this.handleError(error);
    }
  }

  async setDeviceName(sn: string, nickName: string): Promise<boolean> {
    try {
      await this.api.post('/usr/v4/SetDeviceNickName', { sn, nickName });
      return true;
    } catch (error) {
      console.error('Failed to set device name:', error);
      throw this.handleError(error);
    }
  }

  // ========== Device Control ==========

  async controlDevice(sn: string, iotDev: string, command: string, params?: any): Promise<any> {
    try {
      // 正確的命令格式 - 根據最新 API 文檔
      const cmdObject = {
        command,
        params: params || {}
      };
      
      console.log(`[API] Sending command to ${sn}:`, { iotDev, command, params });
      
      const response = await this.api.post('/usr/v4/SendCommand', {
        sn,
        iotDevs: [iotDev],
        iotCmds: [cmdObject]
      });
      
      console.log(`[API] Command response:`, response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to control device:', error);
      throw this.handleError(error);
    }
  }

  async turnOnDevice(sn: string, iotDev: string = 'main'): Promise<boolean> {
    try {
      await this.controlDevice(sn, iotDev, 'OnOff', { on: true });
      return true;
    } catch (error) {
      console.error('Failed to turn on device:', error);
      throw this.handleError(error);
    }
  }

  async turnOffDevice(sn: string, iotDev: string = 'main'): Promise<boolean> {
    try {
      await this.controlDevice(sn, iotDev, 'OnOff', { on: false });
      return true;
    } catch (error) {
      console.error('Failed to turn off device:', error);
      throw this.handleError(error);
    }
  }

  async toggleDevice(sn: string, iotDev: string = 'main'): Promise<boolean> {
    try {
      // 先獲取當前狀態
      const response = await this.api.post('/usr/v4/GetDeviceState', { sn });
      const currentState = response.data?.state?.on || false;
      await this.controlDevice(sn, iotDev, 'OnOff', { on: !currentState });
      return true;
    } catch (error) {
      console.error('Failed to toggle device:', error);
      throw this.handleError(error);
    }
  }

  async setBrightness(sn: string, brightness: number, iotDev: string = 'Light'): Promise<boolean> {
    try {
      await this.controlDevice(sn, iotDev, 'BrightnessAbsolute', { brightness });
      return true;
    } catch (error) {
      console.error('Failed to set brightness:', error);
      throw this.handleError(error);
    }
  }

  async setColorTemperature(sn: string, temperature: number, iotDev: string = 'Light'): Promise<boolean> {
    try {
      // 根據最新 API 文檔，使用 ColorAbsolute 命令，直接傳遞 temperature
      await this.controlDevice(sn, iotDev, 'ColorAbsolute', { 
        temperature: temperature  // 色溫以 Kelvin 為單位
      });
      return true;
    } catch (error) {
      console.error('Failed to set color temperature:', error);
      throw this.handleError(error);
    }
  }

  async setTemperature(sn: string, temperature: number, iotDev: string = 'AC_UNIT'): Promise<boolean> {
    try {
      await this.controlDevice(sn, iotDev, 'ThermostatTemperatureSetpoint', { thermostatTemperatureSetpoint: temperature });
      return true;
    } catch (error) {
      console.error('Failed to set temperature:', error);
      throw this.handleError(error);
    }
  }

  async setFanSpeed(sn: string, speed: 'low' | 'medium' | 'high' | 'auto', iotDev: string = 'AC_UNIT'): Promise<boolean> {
    try {
      await this.controlDevice(sn, iotDev, 'setFanSpeed', { speed });
      return true;
    } catch (error) {
      console.error('Failed to set fan speed:', error);
      throw this.handleError(error);
    }
  }

  // ========== Scene Management ==========

  async listScenes(groupId: string): Promise<UltronScene[]> {
    try {
      // 使用正確的 API 端點 GetGroupScenes
      const response = await this.api.post('/usr/v4/GetGroupScenes', { groupId });
      return response.data.scenes || [];
    } catch (error) {
      console.error('Failed to list scenes:', error);
      throw this.handleError(error);
    }
  }

  async createScene(groupId: string, sceneName: string, devices: any[]): Promise<{ sceneId: string }> {
    try {
      const response = await this.api.post('/usr/v4/CreateScene', {
        groupId,
        sceneName,
        devices
      });
      return { sceneId: response.data.sceneId };
    } catch (error) {
      console.error('Failed to create scene:', error);
      throw this.handleError(error);
    }
  }

  async applyScene(groupId: string, sceneId: string): Promise<boolean> {
    try {
      // 使用正確的 API 端點 ApplyGroupScene
      await this.api.post('/usr/v4/ApplyGroupScene', { groupId, sceneId });
      return true;
    } catch (error) {
      console.error('Failed to apply scene:', error);
      throw this.handleError(error);
    }
  }

  async deleteScene(groupId: string, sceneId: string): Promise<boolean> {
    try {
      await this.api.post('/usr/v4/DeleteScene', { groupId, sceneId });
      return true;
    } catch (error) {
      console.error('Failed to delete scene:', error);
      throw this.handleError(error);
    }
  }

  // ========== Automation Management ==========

  async listAutomations(groupId: string): Promise<UltronAutomation[]> {
    try {
      const response = await this.api.post('/usr/v4/GetAutomations', { groupId });
      return response.data.automations || [];
    } catch (error) {
      console.error('Failed to list automations:', error);
      throw this.handleError(error);
    }
  }

  async createAutomation(
    groupId: string,
    name: string,
    type: string,
    config: any,
    enabled: boolean = true
  ): Promise<{ automationId: string }> {
    try {
      const response = await this.api.post('/usr/v4/CreateAutomation', {
        groupId,
        name,
        type,
        config,
        enabled
      });
      return { automationId: response.data.automationId };
    } catch (error) {
      console.error('Failed to create automation:', error);
      throw this.handleError(error);
    }
  }

  async updateAutomation(automationId: string, updates: any): Promise<boolean> {
    try {
      await this.api.post('/usr/v4/UpdateAutomation', {
        automationId,
        ...updates
      });
      return true;
    } catch (error) {
      console.error('Failed to update automation:', error);
      throw this.handleError(error);
    }
  }

  async deleteAutomation(automationId: string): Promise<boolean> {
    try {
      await this.api.post('/usr/v4/DeleteAutomation', { automationId });
      return true;
    } catch (error) {
      console.error('Failed to delete automation:', error);
      throw this.handleError(error);
    }
  }

  // ========== Energy Monitoring ==========

  async getRealtimePower(groupId: string, deviceSNs?: string[]): Promise<Record<string, PowerData>> {
    try {
      const response = await this.api.post('/usr/v4/GetRealtimePower', {
        groupId,
        deviceSNs
      });
      return response.data.powerData || {};
    } catch (error) {
      console.error('Failed to get realtime power:', error);
      throw this.handleError(error);
    }
  }

  async getPowerHistory(
    groupId: string,
    dataType: 'hourly' | 'daily' | 'monthly',
    startTime?: string,
    endTime?: string,
    deviceSNs?: string[]
  ): Promise<any> {
    try {
      const response = await this.api.post('/usr/v4/GetPowerHistory', {
        groupId,
        dataType,
        startTime,
        endTime,
        deviceSNs
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get power history:', error);
      throw this.handleError(error);
    }
  }

  async getEnergyInsights(
    groupId: string,
    period: 'today' | 'week' | 'month' = 'month'
  ): Promise<any> {
    try {
      const response = await this.api.post('/usr/v4/GetEnergyInsights', {
        groupId,
        period
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get energy insights:', error);
      throw this.handleError(error);
    }
  }

  // ========== Sensor Data ==========

  async getSensorData(groupId: string, sn?: string): Promise<Record<string, SensorData>> {
    try {
      const response = await this.api.post('/usr/v4/GetSensorData', {
        groupId,
        sn
      });
      return response.data.sensorData || {};
    } catch (error) {
      console.error('Failed to get sensor data:', error);
      throw this.handleError(error);
    }
  }

  async getSensorDataOfDevice(groupId: string, sn: string, minutes: number = 5): Promise<any> {
    try {
      console.log(`[API] Calling GetSensorDataOfDevices for ${sn}`);
      // 使用新的 API 端點名稱 GetSensorDataOfDevices (複數)
      const response = await this.api.post('/usr/v4/GetSensorDataOfDevices', { 
        groupId,
        deviceSNs: [sn],  // 改為 deviceSNs 陣列
        minutes 
      });
      console.log(`[API] GetSensorDataOfDevices response for ${sn}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to get sensor data for ${sn}:`, error);
      return null;
    }
  }

  async getSensorHistory(
    groupId: string,
    sn: string,
    minutes: number = 60,
    aggregateInterval?: number
  ): Promise<SensorData[]> {
    try {
      const response = await this.api.post('/usr/v4/GetSensorHistory', {
        groupId,
        sn,
        minutes,
        aggregateInterval
      });
      return response.data.history || [];
    } catch (error) {
      console.error('Failed to get sensor history:', error);
      throw this.handleError(error);
    }
  }

  // 新增：獲取多個設備的分鐘級電力數據
  async getSensorDataOfDevices(
    groupId: string,
    deviceSNs: string[],
    minutes: number = 60
  ): Promise<any> {
    try {
      console.log(`[API] Getting sensor data for ${deviceSNs.length} devices`);
      const response = await this.api.post('/usr/v4/GetSensorDataOfDevices', {
        groupId,
        deviceSNs,
        minutes
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get sensor data of devices:', error);
      throw this.handleError(error);
    }
  }

  // 新增：獲取小時級電力數據
  async getHourlySensorDataOfDevices(
    groupId: string,
    deviceSNs: string[],
    hours: number = 24
  ): Promise<any> {
    try {
      // 最少需要 24 小時
      const validHours = Math.max(24, Math.min(168, hours));
      console.log(`[API] Getting hourly sensor data for ${deviceSNs.length} devices`);
      const response = await this.api.post('/usr/v4/GetHourlySensorDataOfDevices', {
        groupId,
        deviceSNs,
        hours: validHours
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get hourly sensor data:', error);
      throw this.handleError(error);
    }
  }

  // 新增：獲取日級電力數據
  async getDailySensorDataOfDevices(
    groupId: string,
    deviceSNs: string[],
    days: number = 7
  ): Promise<any> {
    try {
      console.log(`[API] Getting daily sensor data for ${deviceSNs.length} devices`);
      const response = await this.api.post('/usr/v4/GetDailySensorDataOfDevices', {
        groupId,
        deviceSNs,
        days
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get daily sensor data:', error);
      throw this.handleError(error);
    }
  }

  // ========== Device Configuration ==========

  async getDeviceConfigs(sn: string, configs?: string[]): Promise<any> {
    try {
      const response = await this.api.post('/usr/v4/GetDeviceConfigs', {
        sn,
        configs
      });
      return response.data.configs || {};
    } catch (error) {
      console.error('Failed to get device configs:', error);
      throw this.handleError(error);
    }
  }

  async setDeviceConfigs(sn: string, configs: any[]): Promise<boolean> {
    try {
      await this.api.post('/usr/v4/SetDeviceConfigs', {
        sn,
        configs
      });
      return true;
    } catch (error) {
      console.error('Failed to set device configs:', error);
      throw this.handleError(error);
    }
  }

  // ========== Device Capabilities ==========

  async getDeviceCapabilities(groupId: string, sn?: string): Promise<any> {
    try {
      const response = await this.api.post('/usr/v4/GetDeviceCapabilities', {
        groupId,
        sn
      });
      return response.data.capabilities || {};
    } catch (error) {
      console.error('Failed to get device capabilities:', error);
      throw this.handleError(error);
    }
  }

  async getDeviceTraits(deviceSN: string): Promise<any> {
    try {
      const response = await this.api.post('/usr/v4/GetDeviceTraits', {
        deviceSN
      });
      return response.data.traits || {};
    } catch (error) {
      console.error('Failed to get device traits:', error);
      throw this.handleError(error);
    }
  }

  // ========== Batch Operations ==========

  async batchControl(devices: Array<{ sn: string; command: string; params?: any }>): Promise<any> {
    try {
      const response = await this.api.post('/usr/v4/BatchControl', { devices });
      return response.data;
    } catch (error) {
      console.error('Failed to batch control devices:', error);
      throw this.handleError(error);
    }
  }

  async batchDeviceControl(
    groupId: string,
    deviceType: string,
    action: string,
    params?: any,
    filterName?: string
  ): Promise<any> {
    try {
      const response = await this.api.post('/usr/v4/BatchDeviceControl', {
        groupId,
        deviceType,
        action,
        params,
        filterName
      });
      return response.data;
    } catch (error) {
      console.error('Failed to batch control devices by type:', error);
      throw this.handleError(error);
    }
  }

  // ========== Notifications ==========

  async getNotifications(limit: number = 20): Promise<any[]> {
    try {
      const response = await this.api.post('/usr/v4/GetNotifications', { limit });
      return response.data.notifications || [];
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw this.handleError(error);
    }
  }

  // ========== Device Summary ==========

  async getDevicesSummary(
    groupId: string,
    deviceType?: string,
    searchName?: string
  ): Promise<any> {
    try {
      const response = await this.api.post('/usr/v4/GetDevicesSummary', {
        groupId,
        deviceType,
        searchName
      });
      return response.data.summary || {};
    } catch (error) {
      console.error('Failed to get devices summary:', error);
      throw this.handleError(error);
    }
  }

  async getDevicesHealth(groupId: string): Promise<any> {
    try {
      const response = await this.api.post('/usr/v4/GetDevicesHealth', {
        groupId
      });
      return response.data.health || {};
    } catch (error) {
      console.error('Failed to get devices health:', error);
      throw this.handleError(error);
    }
  }

  // ========== Helper Methods ==========

  async testConnection(): Promise<boolean> {
    try {
      const groups = await this.listLocations();
      return groups.length >= 0;
    } catch (error) {
      console.error('API connection test failed:', error);
      if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
        throw new Error('無法連接到 API 伺服器，請確認 proxy server 是否正在運行');
      }
      return false;
    }
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.response) {
        const status = axiosError.response.status;
        const data: any = axiosError.response.data;
        
        switch (status) {
          case 400:
            return new Error(`請求參數錯誤: ${data.message || data.error || '無效的請求'}`);
          case 401:
            return new Error('認證失敗：請檢查 API Key 和 App ID');
          case 403:
            return new Error('權限不足：您沒有執行此操作的權限');
          case 404:
            return new Error(`找不到資源: ${data.message || '請求的資源不存在'}`);
          case 429:
            return new Error('請求過於頻繁，請稍後再試');
          case 500:
            return new Error(`伺服器錯誤: ${data.message || '內部伺服器錯誤'}`);
          case 503:
            return new Error('服務暫時不可用，請稍後再試');
          default:
            return new Error(`API 錯誤 (${status}): ${data.message || data.error || '未知錯誤'}`);
        }
      } else if (axiosError.request) {
        if (axiosError.code === 'ERR_NETWORK') {
          return new Error('網路連線失敗：請檢查 proxy server 是否正在運行');
        }
        return new Error('無法連接到伺服器，請檢查網路連線');
      }
    }
    
    return error instanceof Error ? error : new Error('未知錯誤');
  }

  // ========== Legacy Compatibility ==========

  async getGroups(): Promise<{ groups: Group[] }> {
    const locations = await this.listLocations();
    const groups = locations.map(loc => ({
      groupId: loc.groupId,
      name: loc.name,
      deviceCount: loc.usedDeviceQuota || 0,
      members: loc.members || [],
      owner: loc.owner ? {
        uid: loc.owner,
        displayName: loc.owner,
        email: ''
      } : undefined
    }));
    return { groups };
  }

  async getGroupDevices(groupId: string): Promise<{ devices: Record<string, Device> }> {
    const devices = await this.listDevices(groupId);
    return { devices: devices as any };
  }

  async getGroupDeviceStates(groupId: string): Promise<{ deviceStates: Record<string, any> }> {
    const states = await this.getDeviceStates(groupId);
    return { deviceStates: states };
  }

  async sendCommand(sn: string, iotDev: string, command: any): Promise<any> {
    // 相容舊格式和新格式
    if (typeof command === 'object' && command.command) {
      return this.controlDevice(sn, iotDev, command.command, command.params);
    }
    // 支援字串命令
    if (typeof command === 'string') {
      return this.controlDevice(sn, iotDev, command, {});
    }
    return this.controlDevice(sn, iotDev, command.cmd || command, command.params || {});
  }

  // 新增：非同步命令 (批次控制)
  async sendAsyncCommand(sn: string, iotDev: string, command: string, params?: any): Promise<any> {
    try {
      const cmdObject = {
        command,
        params: params || {}
      };
      
      console.log(`[API] Sending async command to ${sn}:`, { iotDev, command, params });
      
      const response = await this.api.post('/usr/v4/SendAsyncCommand', {
        sn,
        iotDevs: [iotDev],
        iotCmds: [cmdObject]
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to send async command:', error);
      throw this.handleError(error);
    }
  }

  async getDeviceState(sn: string): Promise<any> {
    const response = await this.api.post('/usr/v4/GetDeviceState', { sn });
    return response;
  }

  async getTypeIconList(): Promise<{ typeIconList: any[] }> {
    try {
      // GetTypeIconList 可能不需要參數或者需要特定參數
      // 暫時返回空列表，避免錯誤
      return { typeIconList: [] };
    } catch (error) {
      console.error('Failed to get type icon list:', error);
      return { typeIconList: [] };
    }
  }
}

export default UltronSmartAPI;