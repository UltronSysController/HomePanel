import UltronSmartAPI from './ultron-api';

export interface Scene {
  id: string;
  name: string;
  icon?: string;
  devices: Array<{
    sn: string;
    state: any;
  }>;
  groupId: string;
  createdAt?: number;
  updatedAt?: number;
}

export class SceneService {
  private api: UltronSmartAPI;

  constructor(api: UltronSmartAPI) {
    this.api = api;
  }

  async listScenes(groupId: string): Promise<Scene[]> {
    try {
      const scenes = await this.api.listScenes(groupId);
      return scenes.map(s => ({
        id: s.sceneId,
        name: s.sceneName,
        devices: s.devices || [],
        groupId: s.groupId
      }));
    } catch (error) {
      console.error('Failed to list scenes:', error);
      throw error;
    }
  }

  async createScene(groupId: string, name: string, icon?: string): Promise<Scene> {
    try {
      // 獲取當前所有設備的狀態
      const deviceStates = await this.api.getDeviceStates(groupId);
      
      // 準備設備狀態快照
      const devices = Object.entries(deviceStates).map(([sn, state]) => ({
        sn,
        state: this.extractDeviceState(state)
      }));

      // 創建場景
      const { sceneId } = await this.api.createScene(groupId, name, devices);
      
      return {
        id: sceneId,
        name,
        icon,
        devices,
        groupId,
        createdAt: Date.now()
      };
    } catch (error) {
      console.error('Failed to create scene:', error);
      throw error;
    }
  }

  async applyScene(groupId: string, sceneId: string): Promise<void> {
    try {
      await this.api.applyScene(groupId, sceneId);
    } catch (error) {
      console.error('Failed to apply scene:', error);
      throw error;
    }
  }

  async deleteScene(groupId: string, sceneId: string): Promise<void> {
    try {
      await this.api.deleteScene(groupId, sceneId);
    } catch (error) {
      console.error('Failed to delete scene:', error);
      throw error;
    }
  }

  async createSceneFromCurrentState(
    groupId: string,
    name: string,
    deviceFilter?: (sn: string) => boolean
  ): Promise<Scene> {
    try {
      // 獲取當前設備狀態
      const deviceStates = await this.api.getDeviceStates(groupId);
      
      // 過濾設備（如果提供了過濾器）
      let devices = Object.entries(deviceStates).map(([sn, state]) => ({
        sn,
        state: this.extractDeviceState(state)
      }));

      if (deviceFilter) {
        devices = devices.filter(d => deviceFilter(d.sn));
      }

      // 創建場景
      const { sceneId } = await this.api.createScene(groupId, name, devices);
      
      return {
        id: sceneId,
        name,
        devices,
        groupId,
        createdAt: Date.now()
      };
    } catch (error) {
      console.error('Failed to create scene from current state:', error);
      throw error;
    }
  }

  private extractDeviceState(deviceState: any): any {
    const iotState = deviceState.stateData?.iotState || {};
    const state: any = {};

    // 獲取主要控制器狀態
    const mainController = iotState.main_controller || 
                          iotState['Main Controller'] || 
                          iotState.Light || 
                          iotState.OUTLET1 || 
                          Object.values(iotState)[0] || {};

    // 電源狀態
    if (mainController.on !== undefined) {
      state.power = mainController.on;
    } else if (mainController.OnOff !== undefined) {
      state.power = mainController.OnOff === 'On';
    }

    // 亮度
    if (mainController.brightness !== undefined) {
      state.brightness = mainController.brightness;
    }

    // 色溫
    if (mainController.colorTemperature?.temperatureK !== undefined) {
      state.colorTemperature = mainController.colorTemperature.temperatureK;
    }

    // 溫度設定（冷氣）
    if (mainController.thermostatTemperatureSetpoint !== undefined) {
      state.temperature = mainController.thermostatTemperatureSetpoint;
    }

    // 模式（冷氣）
    if (mainController.thermostatMode !== undefined) {
      state.mode = mainController.thermostatMode;
    }

    // 風速
    if (mainController.fanSpeed !== undefined) {
      state.fanSpeed = mainController.fanSpeed;
    }

    return state;
  }

  // 預設場景
  static getDefaultScenes(): Array<{ name: string; icon: string; description: string }> {
    return [
      { name: '早安', icon: '☀️', description: '開啟客廳和廚房的燈，調整為明亮模式' },
      { name: '晚安', icon: '🌙', description: '關閉所有燈光和電器，保留臥室小夜燈' },
      { name: '離家', icon: '🚪', description: '關閉所有設備，啟動安全模式' },
      { name: '回家', icon: '🏠', description: '開啟玄關和客廳燈光，啟動空調' },
      { name: '電影模式', icon: '🎬', description: '調暗客廳燈光，關閉其他房間的燈' },
      { name: '派對模式', icon: '🎉', description: '開啟所有燈光，設定為彩色模式' },
      { name: '閱讀模式', icon: '📚', description: '開啟暖色調燈光，調整至適合閱讀的亮度' },
      { name: '用餐時光', icon: '🍽️', description: '開啟餐廳燈光，調暗其他區域' }
    ];
  }
}

export default SceneService;