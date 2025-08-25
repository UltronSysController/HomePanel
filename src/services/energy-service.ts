import UltronSmartAPI from './ultron-api';

export interface PowerData {
  timestamp: string;
  power: number; // 瓦特
  current?: number; // 安培
  voltage?: number; // 伏特
  energy?: number; // 千瓦時
}

export interface EnergyUsage {
  deviceSN: string;
  deviceName: string;
  totalEnergy: number; // kWh
  averagePower: number; // W
  peakPower: number; // W
  cost?: number; // 電費
  data: PowerData[];
}

export interface EnergyInsight {
  period: string;
  totalEnergy: number;
  totalCost: number;
  topConsumers: Array<{
    deviceSN: string;
    deviceName: string;
    energy: number;
    percentage: number;
  }>;
  recommendations: string[];
  savingsPotential: number;
  comparisonWithLastPeriod?: {
    energyChange: number;
    costChange: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export class EnergyService {
  private api: UltronSmartAPI;
  private electricityRate: number = 3.5; // 預設電費每度 3.5 元

  constructor(api: UltronSmartAPI) {
    this.api = api;
  }

  setElectricityRate(rate: number): void {
    this.electricityRate = rate;
  }

  async getRealtimePower(groupId: string): Promise<Record<string, PowerData>> {
    try {
      return await this.api.getRealtimePower(groupId);
    } catch (error) {
      console.error('Failed to get realtime power:', error);
      throw error;
    }
  }

  async getDevicePowerUsage(
    groupId: string,
    deviceSN: string,
    hours: number = 24
  ): Promise<EnergyUsage> {
    try {
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const history = await this.api.getPowerHistory(
        groupId,
        'hourly',
        startTime,
        endTime,
        [deviceSN]
      );

      const data = history.data?.[deviceSN] || [];
      const device = await this.api.listDevices(groupId).then(devices => devices[deviceSN]);
      
      // 計算統計數據
      const totalEnergy = data.reduce((sum: number, d: any) => sum + (d.energy || 0), 0);
      const powers = data.map((d: any) => d.power || 0).filter((p: number) => p > 0);
      const averagePower = powers.length > 0 ? powers.reduce((a: number, b: number) => a + b, 0) / powers.length : 0;
      const peakPower = Math.max(...powers, 0);

      return {
        deviceSN,
        deviceName: device?.nickName || device?.displayName || deviceSN,
        totalEnergy,
        averagePower,
        peakPower,
        cost: totalEnergy * this.electricityRate,
        data
      };
    } catch (error) {
      console.error('Failed to get device power usage:', error);
      throw error;
    }
  }

  async getGroupPowerUsage(
    groupId: string,
    period: 'today' | 'week' | 'month' = 'today'
  ): Promise<Map<string, EnergyUsage>> {
    try {
      let hours = 24;
      if (period === 'week') hours = 168;
      if (period === 'month') hours = 720;

      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const history = await this.api.getPowerHistory(
        groupId,
        period === 'today' ? 'hourly' : 'daily',
        startTime,
        endTime
      );

      const devices = await this.api.listDevices(groupId);
      const usageMap = new Map<string, EnergyUsage>();

      Object.entries(history.data || {}).forEach(([deviceSN, data]: [string, any]) => {
        const device = devices[deviceSN];
        const powerData = Array.isArray(data) ? data : [];
        
        const totalEnergy = powerData.reduce((sum: number, d: any) => sum + (d.energy || 0), 0);
        const powers = powerData.map((d: any) => d.power || 0).filter((p: number) => p > 0);
        const averagePower = powers.length > 0 ? powers.reduce((a: number, b: number) => a + b, 0) / powers.length : 0;
        const peakPower = Math.max(...powers, 0);

        usageMap.set(deviceSN, {
          deviceSN,
          deviceName: device?.nickName || device?.displayName || deviceSN,
          totalEnergy,
          averagePower,
          peakPower,
          cost: totalEnergy * this.electricityRate,
          data: powerData
        });
      });

      return usageMap;
    } catch (error) {
      console.error('Failed to get group power usage:', error);
      throw error;
    }
  }

  async getEnergyInsights(
    groupId: string,
    period: 'today' | 'week' | 'month' = 'month'
  ): Promise<EnergyInsight> {
    try {
      const insights = await this.api.getEnergyInsights(groupId, period);
      
      // 處理 API 返回的數據
      const totalEnergy = insights.totalEnergy || 0;
      const totalCost = totalEnergy * this.electricityRate;
      
      // 找出耗電最多的設備
      const topConsumers = (insights.devices || [])
        .sort((a: any, b: any) => b.energy - a.energy)
        .slice(0, 5)
        .map((d: any) => ({
          deviceSN: d.sn,
          deviceName: d.name,
          energy: d.energy,
          percentage: totalEnergy > 0 ? (d.energy / totalEnergy) * 100 : 0
        }));

      // 生成建議
      const recommendations = this.generateRecommendations(insights);
      
      // 計算節能潛力
      const savingsPotential = this.calculateSavingsPotential(insights);

      // 與上期比較
      let comparisonWithLastPeriod;
      if (insights.comparison) {
        comparisonWithLastPeriod = {
          energyChange: insights.comparison.energyChange || 0,
          costChange: (insights.comparison.energyChange || 0) * this.electricityRate,
          trend: insights.comparison.trend || 'stable' as 'up' | 'down' | 'stable'
        };
      }

      return {
        period,
        totalEnergy,
        totalCost,
        topConsumers,
        recommendations,
        savingsPotential,
        comparisonWithLastPeriod
      };
    } catch (error) {
      console.error('Failed to get energy insights:', error);
      
      // 提供基本的洞察數據
      return {
        period,
        totalEnergy: 0,
        totalCost: 0,
        topConsumers: [],
        recommendations: ['無法獲取能源洞察數據'],
        savingsPotential: 0
      };
    }
  }

  private generateRecommendations(insights: any): string[] {
    const recommendations: string[] = [];

    // 檢查高耗電設備
    if (insights.devices) {
      const highConsumers = insights.devices.filter((d: any) => d.energy > 50);
      if (highConsumers.length > 0) {
        recommendations.push(`${highConsumers.length} 個設備耗電量超過 50 kWh，建議檢查使用時間`);
      }
    }

    // 檢查待機功耗
    if (insights.standbyPower > 10) {
      recommendations.push('待機功耗偏高，建議使用智能插座完全關閉不使用的設備');
    }

    // 檢查尖峰時段使用
    if (insights.peakHourUsage > insights.offPeakUsage * 1.5) {
      recommendations.push('尖峰時段用電量偏高，建議將部分用電移至離峰時段');
    }

    // 檢查冷氣使用
    const acDevices = (insights.devices || []).filter((d: any) => 
      d.type === 'airConditioner' || d.name?.includes('冷氣')
    );
    if (acDevices.length > 0 && acDevices.some((d: any) => d.energy > 100)) {
      recommendations.push('冷氣耗電量偏高，建議調高溫度設定或使用定時功能');
    }

    // 如果沒有特別的建議
    if (recommendations.length === 0) {
      recommendations.push('能源使用正常，繼續保持良好的用電習慣');
    }

    return recommendations;
  }

  private calculateSavingsPotential(insights: any): number {
    let potential = 0;

    // 估算待機功耗節省
    if (insights.standbyPower) {
      potential += insights.standbyPower * 0.5; // 假設可以節省 50% 的待機功耗
    }

    // 估算尖峰時段轉移節省
    if (insights.peakHourUsage && insights.offPeakUsage) {
      const shiftable = Math.min(insights.peakHourUsage * 0.3, insights.offPeakUsage);
      potential += shiftable * 0.2; // 假設尖峰與離峰電價差 20%
    }

    // 估算溫度調整節省
    const acDevices = (insights.devices || []).filter((d: any) => 
      d.type === 'airConditioner' || d.name?.includes('冷氣')
    );
    acDevices.forEach((ac: any) => {
      potential += ac.energy * 0.1; // 假設調高 1 度可節省 10%
    });

    return potential * this.electricityRate;
  }

  // 獲取歷史趨勢
  async getEnergyTrend(
    groupId: string,
    days: number = 30
  ): Promise<Array<{ date: string; energy: number; cost: number }>> {
    try {
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      const history = await this.api.getPowerHistory(
        groupId,
        'daily',
        startTime,
        endTime
      );

      const trend: Array<{ date: string; energy: number; cost: number }> = [];
      
      if (history.timeline && history.data) {
        history.timeline.forEach((date: string, index: number) => {
          let dailyEnergy = 0;
          
          Object.values(history.data).forEach((deviceData: any) => {
            if (Array.isArray(deviceData) && deviceData[index]) {
              dailyEnergy += deviceData[index].energy || 0;
            }
          });
          
          trend.push({
            date,
            energy: dailyEnergy,
            cost: dailyEnergy * this.electricityRate
          });
        });
      }

      return trend;
    } catch (error) {
      console.error('Failed to get energy trend:', error);
      return [];
    }
  }

  // 設定能源使用目標
  async setEnergyGoal(
    groupId: string,
    monthlyTarget: number
  ): Promise<{ currentUsage: number; targetUsage: number; remainingDays: number; dailyAllowance: number }> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const daysInMonth = endOfMonth.getDate();
      const daysPassed = now.getDate();
      const remainingDays = daysInMonth - daysPassed;

      const history = await this.api.getPowerHistory(
        groupId,
        'daily',
        startOfMonth.toISOString(),
        now.toISOString()
      );

      let currentUsage = 0;
      if (history.data) {
        Object.values(history.data).forEach((deviceData: any) => {
          if (Array.isArray(deviceData)) {
            deviceData.forEach(d => {
              currentUsage += d.energy || 0;
            });
          }
        });
      }

      const remainingAllowance = Math.max(0, monthlyTarget - currentUsage);
      const dailyAllowance = remainingDays > 0 ? remainingAllowance / remainingDays : 0;

      return {
        currentUsage,
        targetUsage: monthlyTarget,
        remainingDays,
        dailyAllowance
      };
    } catch (error) {
      console.error('Failed to set energy goal:', error);
      throw error;
    }
  }

  // 獲取設備能效評級
  getDeviceEfficiencyRating(averagePower: number, deviceType: string): {
    rating: 'A++' | 'A+' | 'A' | 'B' | 'C' | 'D' | 'E';
    color: string;
    description: string;
  } {
    // 根據設備類型和平均功率計算能效等級
    let rating: 'A++' | 'A+' | 'A' | 'B' | 'C' | 'D' | 'E';
    let thresholds: number[] = [];

    switch (deviceType) {
      case 'light':
        thresholds = [5, 10, 15, 25, 40, 60]; // LED vs 傳統燈泡
        break;
      case 'airConditioner':
        thresholds = [500, 800, 1200, 1800, 2500, 3500];
        break;
      case 'outlet':
      case 'other':
        thresholds = [10, 50, 100, 200, 500, 1000];
        break;
      default:
        thresholds = [10, 50, 100, 200, 500, 1000];
    }

    if (averagePower <= thresholds[0]) rating = 'A++';
    else if (averagePower <= thresholds[1]) rating = 'A+';
    else if (averagePower <= thresholds[2]) rating = 'A';
    else if (averagePower <= thresholds[3]) rating = 'B';
    else if (averagePower <= thresholds[4]) rating = 'C';
    else if (averagePower <= thresholds[5]) rating = 'D';
    else rating = 'E';

    const ratingInfo = {
      'A++': { color: '#00c853', description: '極佳能效' },
      'A+': { color: '#64dd17', description: '優秀能效' },
      'A': { color: '#aeea00', description: '良好能效' },
      'B': { color: '#ffd600', description: '一般能效' },
      'C': { color: '#ffab00', description: '能效偏低' },
      'D': { color: '#ff6d00', description: '能效不佳' },
      'E': { color: '#dd2c00', description: '能效極差' }
    };

    return {
      rating,
      ...ratingInfo[rating]
    };
  }
}

export default EnergyService;