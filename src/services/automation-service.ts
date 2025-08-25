import UltronSmartAPI from './ultron-api';

export type AutomationType = 'sensor_range' | 'activity' | 'state' | 'timebased' | 'script';

export interface AutomationTrigger {
  type: 'device_state' | 'sensor_value' | 'time' | 'manual';
  config: any;
}

export interface AutomationAction {
  type: 'control_device' | 'apply_scene' | 'send_notification' | 'wait';
  config: any;
}

export interface Automation {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  type: AutomationType;
  groupId: string;
  triggers: AutomationTrigger[];
  actions: AutomationAction[];
  conditions?: any;
  createdAt?: number;
  updatedAt?: number;
  lastTriggered?: number;
}

export class AutomationService {
  private api: UltronSmartAPI;

  constructor(api: UltronSmartAPI) {
    this.api = api;
  }

  async listAutomations(groupId: string): Promise<Automation[]> {
    try {
      const automations = await this.api.listAutomations(groupId);
      return automations.map(a => ({
        id: a.id,
        name: a.name,
        enabled: a.enabled,
        type: a.type,
        groupId: a.groupId,
        triggers: a.triggers || [],
        actions: a.actions || [],
        conditions: a.config
      }));
    } catch (error) {
      console.error('Failed to list automations:', error);
      throw error;
    }
  }

  async createAutomation(automation: Omit<Automation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Automation> {
    try {
      const { automationId } = await this.api.createAutomation(
        automation.groupId,
        automation.name,
        automation.type,
        {
          triggers: automation.triggers,
          actions: automation.actions,
          conditions: automation.conditions
        },
        automation.enabled
      );

      return {
        ...automation,
        id: automationId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    } catch (error) {
      console.error('Failed to create automation:', error);
      throw error;
    }
  }

  async updateAutomation(automationId: string, updates: Partial<Automation>): Promise<void> {
    try {
      await this.api.updateAutomation(automationId, updates);
    } catch (error) {
      console.error('Failed to update automation:', error);
      throw error;
    }
  }

  async deleteAutomation(automationId: string): Promise<void> {
    try {
      await this.api.deleteAutomation(automationId);
    } catch (error) {
      console.error('Failed to delete automation:', error);
      throw error;
    }
  }

  async toggleAutomation(automationId: string, enabled: boolean): Promise<void> {
    try {
      await this.api.updateAutomation(automationId, { enabled });
    } catch (error) {
      console.error('Failed to toggle automation:', error);
      throw error;
    }
  }

  // 創建感測器範圍自動化
  async createSensorRangeAutomation(
    groupId: string,
    name: string,
    deviceSN: string,
    sensorType: 'temperature' | 'humidity' | 'co2' | 'pm25',
    conditions: {
      operator: 'above' | 'below' | 'between' | 'outside';
      min?: number;
      max?: number;
    },
    actions: AutomationAction[]
  ): Promise<Automation> {
    const automation: Omit<Automation, 'id' | 'createdAt' | 'updatedAt'> = {
      name,
      groupId,
      enabled: true,
      type: 'sensor_range',
      triggers: [{
        type: 'sensor_value',
        config: {
          deviceSN,
          sensorType,
          conditions
        }
      }],
      actions,
      conditions
    };

    return this.createAutomation(automation);
  }

  // 創建時間基礎自動化
  async createTimeBasedAutomation(
    groupId: string,
    name: string,
    schedule: {
      type: 'once' | 'daily' | 'weekly' | 'monthly';
      time: string; // HH:MM
      days?: string[]; // 週一到週日
      timezone?: string;
    },
    actions: AutomationAction[]
  ): Promise<Automation> {
    const automation: Omit<Automation, 'id' | 'createdAt' | 'updatedAt'> = {
      name,
      groupId,
      enabled: true,
      type: 'timebased',
      triggers: [{
        type: 'time',
        config: schedule
      }],
      actions
    };

    return this.createAutomation(automation);
  }

  // 創建設備狀態自動化
  async createDeviceStateAutomation(
    groupId: string,
    name: string,
    deviceSN: string,
    stateConditions: {
      state: string;
      value: any;
      operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than';
      duration?: number; // 持續時間（秒）
    },
    actions: AutomationAction[]
  ): Promise<Automation> {
    const automation: Omit<Automation, 'id' | 'createdAt' | 'updatedAt'> = {
      name,
      groupId,
      enabled: true,
      type: 'state',
      triggers: [{
        type: 'device_state',
        config: {
          deviceSN,
          stateConditions
        }
      }],
      actions
    };

    return this.createAutomation(automation);
  }

  // 建議的自動化範本
  static getAutomationTemplates(): Array<{
    name: string;
    description: string;
    icon: string;
    type: AutomationType;
    template: any;
  }> {
    return [
      {
        name: '溫度控制',
        description: '當溫度超過設定值時自動開啟冷氣',
        icon: '🌡️',
        type: 'sensor_range',
        template: {
          sensorType: 'temperature',
          conditions: { operator: 'above', max: 28 },
          actions: [{ type: 'control_device', config: { command: 'turnOn', deviceType: 'airConditioner' } }]
        }
      },
      {
        name: '定時開關',
        description: '每天固定時間開關設備',
        icon: '⏰',
        type: 'timebased',
        template: {
          schedule: { type: 'daily', time: '08:00' },
          actions: [{ type: 'control_device', config: { command: 'turnOn' } }]
        }
      },
      {
        name: '離家模式',
        description: '偵測到所有人離開時關閉設備',
        icon: '🚶',
        type: 'activity',
        template: {
          activityType: 'all_away',
          actions: [
            { type: 'control_device', config: { command: 'turnOff', deviceType: 'all' } },
            { type: 'send_notification', config: { message: '已啟動離家模式' } }
          ]
        }
      },
      {
        name: '濕度控制',
        description: '濕度過高時開啟除濕機',
        icon: '💧',
        type: 'sensor_range',
        template: {
          sensorType: 'humidity',
          conditions: { operator: 'above', max: 70 },
          actions: [{ type: 'control_device', config: { command: 'turnOn', deviceType: 'dehumidifier' } }]
        }
      },
      {
        name: '日出日落',
        description: '根據日出日落時間控制燈光',
        icon: '🌅',
        type: 'timebased',
        template: {
          schedule: { type: 'sunset' },
          actions: [{ type: 'control_device', config: { command: 'turnOn', deviceType: 'light' } }]
        }
      },
      {
        name: '動作感應',
        description: '偵測到動作時開燈',
        icon: '🚶‍♂️',
        type: 'activity',
        template: {
          activityType: 'motion_detected',
          actions: [
            { type: 'control_device', config: { command: 'turnOn', deviceType: 'light' } },
            { type: 'wait', config: { duration: 300 } },
            { type: 'control_device', config: { command: 'turnOff', deviceType: 'light' } }
          ]
        }
      },
      {
        name: '空氣品質',
        description: 'PM2.5 過高時開啟空氣清淨機',
        icon: '🌬️',
        type: 'sensor_range',
        template: {
          sensorType: 'pm25',
          conditions: { operator: 'above', max: 35 },
          actions: [{ type: 'control_device', config: { command: 'turnOn', deviceType: 'airPurifier' } }]
        }
      },
      {
        name: '睡眠模式',
        description: '晚上自動調暗燈光並降低冷氣溫度',
        icon: '😴',
        type: 'timebased',
        template: {
          schedule: { type: 'daily', time: '22:00' },
          actions: [
            { type: 'control_device', config: { command: 'setBrightness', value: 20, deviceType: 'light' } },
            { type: 'control_device', config: { command: 'setTemperature', value: 26, deviceType: 'airConditioner' } }
          ]
        }
      }
    ];
  }

  // 創建智能建議
  async suggestAutomations(groupId: string): Promise<Array<{
    name: string;
    description: string;
    confidence: number;
    automation: Omit<Automation, 'id' | 'createdAt' | 'updatedAt'>;
  }>> {
    try {
      // 獲取設備列表
      const devices = await this.api.listDevices(groupId);
      const suggestions = [];

      // 檢查是否有溫度感測器和冷氣
      const hasTempSensor = Object.values(devices).some(d => 
        d.model?.includes('SENSOR') || d.typePrefix?.includes('08')
      );
      const hasAC = Object.values(devices).some(d => 
        d.model?.includes('AC') || d.typePrefix?.includes('2K')
      );

      if (hasTempSensor && hasAC) {
        suggestions.push({
          name: '智能溫度控制',
          description: '根據室內溫度自動控制冷氣',
          confidence: 0.9,
          automation: {
            name: '智能溫度控制',
            groupId,
            enabled: false,
            type: 'sensor_range' as AutomationType,
            triggers: [{
              type: 'sensor_value' as const,
              config: {
                sensorType: 'temperature',
                conditions: { operator: 'above', max: 28 }
              }
            }],
            actions: [{
              type: 'control_device' as const,
              config: { command: 'turnOn', deviceType: 'airConditioner' }
            }]
          }
        });
      }

      // 檢查是否有燈光
      const hasLights = Object.values(devices).some(d => 
        d.model?.includes('LIGHT') || d.typePrefix?.includes('2Z')
      );

      if (hasLights) {
        suggestions.push({
          name: '定時關燈',
          description: '每晚自動關閉所有燈光',
          confidence: 0.8,
          automation: {
            name: '定時關燈',
            groupId,
            enabled: false,
            type: 'timebased' as AutomationType,
            triggers: [{
              type: 'time' as const,
              config: {
                type: 'daily',
                time: '23:30'
              }
            }],
            actions: [{
              type: 'control_device' as const,
              config: { command: 'turnOff', deviceType: 'light' }
            }]
          }
        });
      }

      return suggestions;
    } catch (error) {
      console.error('Failed to suggest automations:', error);
      return [];
    }
  }
}

export default AutomationService;