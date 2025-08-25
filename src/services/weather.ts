interface WeatherData {
  temperature: number;
  description: string;
  location: string;
  weatherCode: number;
  humidity?: number;
  windSpeed?: number;
}

class WeatherService {
  private cache: {
    data: WeatherData | null;
    timestamp: number;
  } = {
    data: null,
    timestamp: 0
  };
  
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 小時快取

  // 獲取 IP 位址和地理位置
  private async getLocation(): Promise<{ city: string; country: string; lat: number; lon: number }> {
    try {
      // 使用 ipapi.co 免費服務獲取 IP 地理位置（支援 HTTPS）
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      if (data.city && data.latitude && data.longitude) {
        return {
          city: data.city,
          country: data.country_name || data.country,
          lat: data.latitude,
          lon: data.longitude
        };
      }
      
      // 預設位置（台北）
      return {
        city: 'Taipei',
        country: 'Taiwan',
        lat: 25.033,
        lon: 121.5654
      };
    } catch (error) {
      console.error('Failed to get location:', error);
      // 預設位置（台北）
      return {
        city: 'Taipei',
        country: 'Taiwan',
        lat: 25.033,
        lon: 121.5654
      };
    }
  }

  // 獲取天氣資訊
  async getWeather(): Promise<WeatherData | null> {
    // 檢查快取
    const now = Date.now();
    if (this.cache.data && (now - this.cache.timestamp) < this.CACHE_DURATION) {
      return this.cache.data;
    }

    try {
      // 獲取位置
      const location = await this.getLocation();
      
      // 使用 Open-Meteo 免費天氣 API（不需要 API key）
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
      
      const weatherResponse = await fetch(weatherUrl);
      const weatherData = await weatherResponse.json();
      
      if (weatherData.current) {
        const weather: WeatherData = {
          temperature: Math.round(weatherData.current.temperature_2m),
          description: this.getWeatherDescription(weatherData.current.weather_code),
          location: `${location.city}, ${location.country}`,
          weatherCode: weatherData.current.weather_code,
          humidity: weatherData.current.relative_humidity_2m,
          windSpeed: weatherData.current.wind_speed_10m
        };
        
        // 更新快取
        this.cache = {
          data: weather,
          timestamp: now
        };
        
        return weather;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get weather:', error);
      return null;
    }
  }

  // 根據天氣代碼獲取描述
  private getWeatherDescription(code: number): string {
    // WMO Weather interpretation codes
    const weatherCodes: { [key: number]: string } = {
      0: '晴朗',
      1: '大致晴朗',
      2: '部分多雲',
      3: '陰天',
      45: '有霧',
      48: '霧凇',
      51: '細雨',
      53: '中雨',
      55: '大雨',
      61: '小雨',
      63: '中雨',
      65: '大雨',
      71: '小雪',
      73: '中雪',
      75: '大雪',
      77: '雪粒',
      80: '陣雨',
      81: '中陣雨',
      82: '大陣雨',
      85: '陣雪',
      86: '大陣雪',
      95: '雷雨',
      96: '冰雹雷雨',
      99: '強冰雹雷雨'
    };
    
    return weatherCodes[code] || '未知';
  }
}

export default new WeatherService();