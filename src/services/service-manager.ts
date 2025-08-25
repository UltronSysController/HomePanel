import UltronSmartAPI from './ultron-api';
import SceneService from './scene-service';
import AutomationService from './automation-service';
import EnergyService from './energy-service';
import { ApiConfig } from '../types';

/**
 * 服務管理器 - 統一管理所有 API 服務
 */
export class ServiceManager {
  private static instance: ServiceManager | null = null;
  
  public api: UltronSmartAPI | null = null;
  public scene: SceneService | null = null;
  public automation: AutomationService | null = null;
  public energy: EnergyService | null = null;
  
  private constructor() {}
  
  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }
  
  /**
   * 初始化所有服務
   */
  initialize(config: ApiConfig): void {
    this.api = new UltronSmartAPI(config);
    this.scene = new SceneService(this.api);
    this.automation = new AutomationService(this.api);
    this.energy = new EnergyService(this.api);
  }
  
  /**
   * 更新 API 配置
   */
  updateConfig(config: ApiConfig): void {
    this.initialize(config);
  }
  
  /**
   * 測試連接
   */
  async testConnection(): Promise<boolean> {
    if (!this.api) {
      throw new Error('服務尚未初始化');
    }
    return this.api.testConnection();
  }
  
  /**
   * 獲取服務狀態
   */
  getStatus(): {
    initialized: boolean;
    services: {
      api: boolean;
      scene: boolean;
      automation: boolean;
      energy: boolean;
    };
  } {
    return {
      initialized: this.api !== null,
      services: {
        api: this.api !== null,
        scene: this.scene !== null,
        automation: this.automation !== null,
        energy: this.energy !== null
      }
    };
  }
  
  /**
   * 清理資源
   */
  dispose(): void {
    this.api = null;
    this.scene = null;
    this.automation = null;
    this.energy = null;
  }
}

// 導出單例實例
export const serviceManager = ServiceManager.getInstance();
export default serviceManager;