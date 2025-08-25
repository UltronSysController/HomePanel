import axios, { AxiosInstance } from 'axios';
import { ApiConfig, Device, Group } from '../types';

class UltronSmartAPI {
  private api: AxiosInstance;
  private config: ApiConfig;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 500; // 最小請求間隔 500ms

  constructor(config: ApiConfig) {
    this.config = config;
    
    // 根據環境決定 API 基礎 URL
    const baseURL = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3001/api'
      : '/api';

    this.api = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': config.apiKey,
        'Ultron-Cloud-Appid': config.appId,
        ...(config.orgId && { 'orgid': config.orgId })
      }
    });

    // 添加請求攔截器來實現限流
    this.api.interceptors.request.use(async (config) => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minRequestInterval) {
        // 如果請求太快，等待一下
        await new Promise(resolve => 
          setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
        );
      }
      
      this.lastRequestTime = Date.now();
      return config;
    });

    // 添加回應攔截器處理 429 錯誤
    this.api.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 429) {
          // 如果是 429 錯誤，等待 2 秒後重試
          console.warn('Rate limit hit, waiting 2 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          return this.api.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  // 個人版 API
  async getGroups(): Promise<{ groups: Group[] }> {
    const response = await this.api.post('/usr/v4/GroupMemberGetGroups', {});
    const groupInfo = response.data.groupInfo || {};
    
    const groups = Object.values(groupInfo).map((group: any) => ({
      groupId: group.groupId,
      name: group.name,
      deviceCount: group.usedDeviceQuota || 0,
      members: group.members || [],
      owner: group.owner
    }));

    return { groups };
  }

  async getGroupDevices(groupId: string): Promise<{ devices: Record<string, Device> }> {
    const response = await this.api.post('/usr/v4/GetGroupDevices', { groupId });
    return { devices: response.data.devices || {} };
  }

  async getGroupDeviceStates(groupId: string): Promise<{ deviceStates: Record<string, any> }> {
    console.log('Getting device states for groupId:', groupId);
    try {
      const response = await this.api.post('/usr/v4/GetGroupDeviceStates', { groupId });
      console.log('Device states response:', response.data);
      // API 回傳的狀態在 states 欄位中
      return { deviceStates: response.data.states || {} };
    } catch (error) {
      console.error('Failed to get device states:', error);
      return { deviceStates: {} };
    }
  }

  async sendCommand(sn: string, iotDev: string, command: any): Promise<any> {
    console.log('Sending command to device:', sn, iotDev, command);
    try {
      const response = await this.api.post('/usr/v4/SendCommand', {
        sn,
        iotDevs: [iotDev],
        iotCmds: [command]
      });
      console.log('Command response:', response.data);
      return response;
    } catch (error) {
      console.error('Command failed:', error);
      throw error;
    }
  }

  async getDeviceState(sn: string): Promise<any> {
    return this.api.post('/usr/v4/GetDeviceState', { sn });
  }

  async getTypeIconList(): Promise<{ typeIconList: any[] }> {
    try {
      const response = await this.api.post('/usr/v4/GetTypeIconList', {});
      return { typeIconList: response.data.typeIconList || [] };
    } catch (error) {
      console.error('Failed to get type icon list:', error);
      return { typeIconList: [] };
    }
  }

  // 檢查 API 連線
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.getGroups();
      return response.groups.length >= 0;
    } catch (error) {
      console.error('API connection test failed:', error);
      // 如果是網路錯誤，返回更明確的錯誤訊息
      if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
        throw new Error('無法連接到 API 伺服器，請確認 proxy server 是否正在運行');
      }
      return false;
    }
  }
}

export default UltronSmartAPI;