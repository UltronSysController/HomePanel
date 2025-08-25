# UltronSMART Personal API - 完整指令文件

## 目錄
1. [SendCommand API](#sendcommand-api)
2. [SetIotDeviceConfigs API](#setiotdeviceconfigs-api)
3. [設備類型對照表](#設備類型對照表)

---

## SendCommand API

### 基本結構
```json
{
  "sn": "設備序號",
  "iotDevs": ["設備端點名稱"],
  "iotCmds": [{
    "command": "指令名稱",
    "params": {
      // 指令參數
    }
  }]
}
```

### 指令分類

#### 1. 燈光控制 (Lighting Control)

##### OnOff - 開關控制
```json
// 基本開關
{"command": "OnOff", "params": {"on": true}}

// 閃爍模式
{
  "command": "OnOff", 
  "params": {
    "on": true,
    "onInterval": 1000,  // 開啟時間(毫秒)
    "offInterval": 500   // 關閉時間(毫秒)
  }
}

// 淡入淡出
{
  "command": "OnOff",
  "params": {
    "on": true,
    "fadeSetting": {
      "fadeType": "withFade",
      "duration": 2,  // 秒
      "brightnessStart": 0,
      "brightnessEnd": 100
    }
  }
}
```

##### BrightnessAbsolute - 絕對亮度
```json
// 設定亮度為 75%
{"command": "BrightnessAbsolute", "params": {"brightness": 75}}
```
- 範圍：0-100
- 注意：調光設備最小值為 1（不能為 0）

##### BrightnessRelative - 相對亮度
```json
// 增加 20% 亮度
{"command": "BrightnessRelative", "params": {"brightnessRelativePercent": 20}}

// 減少 30% 亮度
{"command": "BrightnessRelative", "params": {"brightnessRelativePercent": -30}}
```
- 範圍：-100 到 +100

##### ColorAbsolute - 顏色設定
```json
// RGB 顏色（紅色）
{"command": "ColorAbsolute", "params": {"spectrumRGB": 16711680}}

// HSV 顏色（藍色）
{
  "command": "ColorAbsolute",
  "params": {
    "spectrumHSV": {
      "hue": 240,
      "saturation": 1.0,
      "value": 1.0
    }
  }
}

// 色溫（暖白光）
{"command": "ColorAbsolute", "params": {"temperature": 2700}}
```

#### 2. 空調控制 (Climate Control)

##### ThermostatTemperatureSetpoint - 溫度設定
```json
// 設定目標溫度（攝氏）
{"command": "ThermostatTemperatureSetpoint", "params": {"thermostatTemperatureSetpoint": 25}}

// 設定溫度範圍（雙設定點模式）
{
  "command": "ThermostatTemperatureSetpoint",
  "params": {
    "thermostatTemperatureSetpointHigh": 26,
    "thermostatTemperatureSetpointLow": 22
  }
}
```

##### ThermostatSetMode - 模式設定
```json
// 設定模式
{"command": "ThermostatSetMode", "params": {"thermostatMode": "cool"}}
```
- 可用模式：off, heat, cool, on, heatcool, auto, fan-only, purifier, eco, dry

##### SetFanSpeed - 風速控制
```json
// 命名風速
{"command": "SetFanSpeed", "params": {"fanSpeed": "high"}}

// 百分比風速
{"command": "SetFanSpeed", "params": {"fanSpeedPercent": 75}}

// 反轉風扇
{"command": "SetFanSpeed", "params": {"fanSpeed": "low", "fanReverse": true}}
```

#### 3. 窗簾/百葉窗控制 (OpenClose)

```json
// 完全開啟
{"command": "OpenCloseRelative", "params": {"openPercent": 100}}

// 關閉到 30% 位置
{"command": "OpenCloseRelative", "params": {"openPercent": 30}}

// 相對調整（開啟 20%）
{"command": "OpenCloseRelative", "params": {"openRelativePercent": 20}}
```

#### 4. 模式控制 (Modes)

```json
// 設定洗衣機模式
{
  "command": "SetModes",
  "params": {
    "updateModeSettings": {
      "load": "small",
      "temp": "cold"
    }
  }
}
```

#### 5. 開關控制 (Toggles)

```json
// 開啟/關閉多個開關
{
  "command": "SetToggles",
  "params": {
    "updateToggleSettings": {
      "turbo": true,
      "eco": false,
      "quiet": true
    }
  }
}
```

#### 6. 場景控制 (Scene)

```json
// 啟動場景
{"command": "ActivateScene", "params": {"deactivate": false}}

// 停用場景
{"command": "ActivateScene", "params": {"deactivate": true}}
```

#### 7. 系統指令 (UltronCommand)

```json
// 重新啟動
{"command": "UltronCmd", "params": {"cmdName": "Reboot"}}

// 重置設備
{"command": "UltronCmd", "params": {"cmdName": "Reset"}}

// 韌體更新
{
  "command": "UltronCmd",
  "params": {
    "cmdName": "UltronFirmwareUpgrade",
    "options": "stable"  // 或 "beta"
  }
}
```

---

## SetIotDeviceConfigs API

### 基本結構
```json
{
  "sn": "設備序號",
  "iotConfigs": [{
    "config": "配置名稱",
    "iotName": "端點名稱（選填）",
    "items": {
      // 配置內容
    }
  }]
}
```

### 主要配置類型

#### 1. IotIntervals - 通訊間隔設定
```json
{
  "config": "IotIntervals",
  "items": {
    "reportInterval": 60,      // 狀態回報間隔（秒）
    "pingInterval": 30,        // 心跳間隔（秒）
    "retryInterval": 5,        // 重試間隔（秒）
    "retryCount": 3,          // 重試次數
    "timeoutDuration": 10     // 逾時時間（秒）
  }
}
```

#### 2. BrightnessRange - 亮度範圍設定
```json
{
  "config": "BrightnessRange",
  "items": {
    "min": 10,   // 最小亮度 (%)
    "max": 90    // 最大亮度 (%)
  }
}
```

#### 3. SensorConfig - 感測器設定
```json
{
  "config": "SensorConfig",
  "items": {
    "samplingInterval": 5,     // 採樣間隔（秒）
    "reportInterval": 60,      // 回報間隔（秒）
    "threshold": {
      "temperature": {
        "min": 15,
        "max": 30
      },
      "humidity": {
        "min": 30,
        "max": 70
      }
    }
  }
}
```

#### 4. Scheduler - 排程設定
```json
{
  "config": "Scheduler",
  "items": {
    "schedules": [{
      "id": "morning",
      "enabled": true,
      "time": "07:00",
      "days": ["MON", "TUE", "WED", "THU", "FRI"],
      "actions": [{
        "command": "OnOff",
        "params": {"on": true}
      }]
    }]
  }
}
```

#### 5. DefaultActions - 預設動作設定
```json
{
  "config": "DefaultActions",
  "items": {
    "powerOn": {
      "actions": [{
        "command": "OnOff",
        "params": {"on": true}
      }]
    },
    "networkReconnect": {
      "delay": 30,
      "actions": [{
        "command": "UltronCmd",
        "params": {"cmdName": "Reboot"}
      }]
    }
  }
}
```

### 重置配置
要重置任何配置到預設值，設定 items 為 null：
```json
{
  "config": "BrightnessRange",
  "items": null
}
```

### 使用流程
1. 使用 GetGroupDevices 取得目前配置
2. 修改需要的配置項目
3. 使用 SetIotDeviceConfigs 套用變更
4. 驗證變更是否成功

### 注意事項
- 配置必須與設備能力相符
- 數值必須在有效範圍內
- 某些配置可能需要設備重啟才會生效
- 建議在修改前備份原始配置

---

## 設備類型對照表

### 燈具類 (LIGHT)
- 支援 Traits: OnOff, Brightness, ColorSetting, Modes
- 常見型號: BF2Z00, BF2Z01, UTU600
- iotDev 名稱: "Light"

### 插座類 (OUTLET)
- 支援 Traits: OnOff, Sensor (電力監測)
- 常見型號: UT3702
- iotDev 名稱: "OUTLET1", "OUTLET2"

### 感測器類 (SENSOR/ULTRON_SENSOR)
- 支援 Traits: Sensor, Detector
- 類型：溫濕度、門窗、人體感應、煙霧偵測
- iotDev 名稱: 依設備而定

### 空調類 (THERMOSTAT)
- 支援 Traits: OnOff, TemperatureSetting, FanSpeed, Modes
- iotDev 名稱: "AC", "THERMOSTAT"

### 窗簾類 (CURTAIN)
- 支援 Traits: OpenClose, StartStop
- iotDev 名稱: "CURTAIN", "BLIND"

### 場景控制器 (SCENE)
- 支援 Traits: Scene
- 用於觸發預設場景

### 注意事項
1. 發送指令前請確認設備支援該 Trait
2. 使用正確的 iotDev 名稱（可從 GetGroupDevices 取得）
3. 參數值必須在設備支援的範圍內
4. 某些指令可以組合使用（如 OnOff + Brightness）