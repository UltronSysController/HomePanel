# UltronSMART Personal API - Complete SendCommand Documentation

## Overview
The SendCommand API allows you to control IoT devices through the UltronSMART Personal API. Commands are organized by traits, which represent different capabilities of devices.

## API Structure
```json
{
  "sn": "DEVICE_SERIAL_NUMBER",
  "iotDevs": ["device_name"],
  "iotCmds": [
    {
      "command": "CommandName",
      "params": {
        // Command-specific parameters
      }
    }
  ]
}
```

## Traits and Commands by Category

### 1. Lighting Control

#### OnOff Trait
Controls basic on/off functionality for devices.

**Command: OnOff**
- Parameters:
  - `on` (boolean, required): true = on, false = off
  - `onInterval` (number, optional): Duration in milliseconds for on state (intermittent mode)
  - `offInterval` (number, optional): Duration in milliseconds for off state (intermittent mode)
  - `fadeSetting` (object, optional): Fade configuration
    - `fadeType`: "noFade" or "withFade"
    - `brightnessStart`: 0-100
    - `brightnessEnd`: 0-100
    - `duration`: seconds
    - `temperature`: Kelvin
    - `spectrumRGB`: color value
    - `spectrumHSV`: {hue, saturation, value}

Examples:
```json
// Basic on/off
{"command": "OnOff", "params": {"on": true}}

// Blinking light
{"command": "OnOff", "params": {"on": true, "onInterval": 1000, "offInterval": 500}}

// With fade
{"command": "OnOff", "params": {"on": true, "fadeSetting": {"fadeType": "withFade", "duration": 2}}}
```

#### Brightness Trait
Controls brightness levels for dimmable devices.

**Command: BrightnessAbsolute**
- Parameters:
  - `brightness` (number): 0-100 (percentage)
- Notes: For dimming devices, minimum is 1 (cannot be 0)

**Command: BrightnessRelative**
- Parameters:
  - `brightnessRelativePercent` (number): -100 to +100
- Notes: Final brightness is clamped to 0-100 range

Examples:
```json
// Set to 75% brightness
{"command": "BrightnessAbsolute", "params": {"brightness": 75}}

// Increase brightness by 20%
{"command": "BrightnessRelative", "params": {"brightnessRelativePercent": 20}}
```

#### ColorSetting Trait
Controls color for RGB/HSV lights and color temperature.

**Command: ColorAbsolute**
- Parameters (choose one):
  - `spectrumRGB` (integer): 0-16,777,215
  - `spectrumHSV` (object):
    - `hue`: 0-360 degrees
    - `saturation`: 0.0-1.0
    - `value`: 0.0-1.0
  - `temperature` (number): Color temperature in Kelvin

Examples:
```json
// RGB Red
{"command": "ColorAbsolute", "params": {"spectrumRGB": 16711680}}

// HSV Blue
{"command": "ColorAbsolute", "params": {"spectrumHSV": {"hue": 240, "saturation": 1.0, "value": 1.0}}}

// Warm white
{"command": "ColorAbsolute", "params": {"temperature": 2700}}
```

### 2. Climate Control

#### TemperatureSetting Trait
Controls thermostat and temperature settings.

**Command: ThermostatTemperatureSetpoint**
- Parameters:
  - `thermostatTemperatureSetpoint` (number): Target temperature

**Command: ThermostatTemperatureSetRange**
- Parameters:
  - `thermostatTemperatureSetpointHigh` (number): Upper limit
  - `thermostatTemperatureSetpointLow` (number): Lower limit

**Command: ThermostatSetMode**
- Parameters:
  - `thermostatMode` (string): "off", "heat", "cool", "auto", "fan-only", "eco", "dry", "purifier"

**Command: TemperatureRelative**
- Parameters:
  - `thermostatTemperatureRelativeDegree` (number): Adjustment amount

Examples:
```json
// Set to 22°C
{"command": "ThermostatTemperatureSetpoint", "params": {"thermostatTemperatureSetpoint": 22.0}}

// Set mode to heat
{"command": "ThermostatSetMode", "params": {"thermostatMode": "heat"}}

// Increase by 2°C
{"command": "TemperatureRelative", "params": {"thermostatTemperatureRelativeDegree": 2.0}}
```

#### TemperatureControl Trait
Controls temperature for non-thermostat devices.

**Command: SetTemperature**
- Parameters:
  - `temperature` (number): Temperature in Celsius
- Notes: Must align with device's temperatureStepCelsius

Example:
```json
// Set to 25°C
{"command": "SetTemperature", "params": {"temperature": 25.0}}
```

#### HumiditySetting Trait
Controls humidity levels.

**Command: SetHumidity**
- Parameters:
  - `humidity` (number): 0-100 (percentage)

**Command: HumidityRelative**
- Parameters:
  - `humidityRelativePercent` (number): -100 to +100

Examples:
```json
// Set to 50% humidity
{"command": "SetHumidity", "params": {"humidity": 50}}

// Increase humidity by 10%
{"command": "HumidityRelative", "params": {"humidityRelativePercent": 10}}
```

#### FanSpeed Trait
Controls fan speed and direction.

**Command: SetFanSpeed**
- Parameters (choose one):
  - `fanSpeed` (string): Named speed ("low", "medium", "high", etc.)
  - `fanSpeedPercent` (number): 0-100 (if supported)

**Command: Reverse**
- Parameters: None
- Notes: Only valid if device is reversible

Examples:
```json
// Set to low speed
{"command": "SetFanSpeed", "params": {"fanSpeed": "low"}}

// Set to 25% speed
{"command": "SetFanSpeed", "params": {"fanSpeedPercent": 25}}

// Reverse fan direction
{"command": "Reverse", "params": {}}
```

### 3. Modes and Toggles

#### Modes Trait
Controls device operating modes.

**Command: SetModes**
- Parameters:
  - `updateModeSettings` (object): Map of mode names to values

Examples:
```json
// Single mode
{"command": "SetModes", "params": {"updateModeSettings": {"operation_mode": "cool"}}}

// Multiple modes
{"command": "SetModes", "params": {"updateModeSettings": {"wash_cycle": "delicate", "water_temperature": "cold", "spin_speed": "low"}}}
```

#### Toggles Trait
Controls binary toggle switches.

**Command: SetToggles**
- Parameters:
  - `updateToggleSettings` (object): Map of toggle names to boolean values

Example:
```json
// Set multiple toggles
{"command": "SetToggles", "params": {"updateToggleSettings": {"night_mode": true, "eco_mode": false}}}
```

#### CustomModes/CustomToggles Trait
Device-specific custom modes and toggles.

**Commands: SetToggles, SetModes**
- Parameters vary by device model
- Must retrieve definitions via `/usr/v4/GetCustomControlsByProductSN`

Example:
```json
// Custom toggle
{"command": "SetToggles", "params": {"updateToggleSettings": {"Heater": true}}}

// Custom mode
{"command": "SetModes", "params": {"updateModeSettings": {"AirConditionerSlider": "16"}}}
```

### 4. Mechanical Control

#### OpenClose Trait
Controls devices with open/close positions.

**Command: OpenClose**
- Parameters:
  - `openPercent` (number): 0-100 (0=closed, 100=open)
- Notes: Some devices only support 0 and 100 (discrete)

Examples:
```json
// Fully open
{"command": "OpenClose", "params": {"openPercent": 100}}

// Half open
{"command": "OpenClose", "params": {"openPercent": 50}}

// Fully close
{"command": "OpenClose", "params": {"openPercent": 0}}
```

#### StartStop Trait
Controls device operation start/stop.

**Command: StartStop**
- Parameters:
  - `start` (boolean): true=start, false=stop
  - `zone` (string, optional): Specific zone to control

**Command: PauseUnpause**
- Parameters:
  - `pause` (boolean): true=pause, false=unpause
- Notes: Only valid if device is pausable

Examples:
```json
// Start device
{"command": "StartStop", "params": {"start": true}}

// Stop specific zone
{"command": "StartStop", "params": {"start": false, "zone": "living_room"}}

// Pause operation
{"command": "PauseUnpause", "params": {"pause": true}}
```

### 5. Scene Control

#### Scene Trait
Activates predefined scenes.

**Command: ActivateScene**
- Parameters:
  - `scene` (string): Scene identifier
  - `deactivate` (boolean, optional): Reverse scene (if reversible)

Examples:
```json
// Activate scene
{"command": "ActivateScene", "params": {"scene": "morning_routine"}}

// Deactivate scene
{"command": "ActivateScene", "params": {"scene": "party_mode", "deactivate": true}}
```

### 6. Sensor Configuration

#### Detector Trait
Configures detector sensitivity and behavior.

**Command: UltronSetSensitivity**
- Parameters:
  - `sensitivity` (number): 0.0-1.0

**Command: UltronSetCooldownTime**
- Parameters:
  - `cooldownTime` (number): Seconds

Example:
```json
// Set high sensitivity
{"command": "UltronSetSensitivity", "params": {"sensitivity": 0.8}}
```

### 7. System Commands

#### SmartConnect Trait
Initiates Wi-Fi connection for UltronKey devices.

**Command: OnOff**
- Parameters:
  - `on` (boolean): true to initiate connection

Example:
```json
{"command": "OnOff", "params": {"on": true}}
```

#### UltronCommand Trait
System-level device commands (no parameters for any).

**Commands:**
- `UltronReboot`: Reboot device
- `UltronFwUpgrade`: Upgrade firmware
- `UltronReset`: Factory reset
- `UltronDeactivate`: Deactivate device
- `UltronDeauth`: Deauthorize device
- `UltronMqttReconnect`: Reconnect MQTT
- `UltronReactivate`: Reactivate device

Example:
```json
// Reboot device
{"command": "UltronReboot", "params": {}}
```

## Device Categories and Common Trait Combinations

### Lighting Devices
- **Smart Bulbs**: OnOff, Brightness, ColorSetting
- **Dimmers**: OnOff, Brightness
- **Smart Switches**: OnOff
- **LED Strips**: OnOff, Brightness, ColorSetting, Scene

### Climate Control
- **Thermostats**: TemperatureSetting, FanSpeed, Modes
- **Air Conditioners**: OnOff, TemperatureSetting, FanSpeed, Modes
- **Humidifiers**: OnOff, HumiditySetting
- **Fans**: OnOff, FanSpeed

### Home Automation
- **Smart Curtains/Blinds**: OpenClose
- **Smart Locks**: OnOff
- **Garage Doors**: OpenClose
- **Security Systems**: Scene, Detector, Toggles

### Appliances
- **Washing Machines**: StartStop, Modes, PauseUnpause
- **Kitchen Appliances**: StartStop, TemperatureControl, Modes
- **Vacuum Cleaners**: StartStop, Modes, Scene

## Important Notes

1. **Device Capabilities**: Always check device attributes before sending commands
2. **Parameter Validation**: Commands will fail if parameters are outside valid ranges
3. **Unit Consistency**: Temperature is always in Celsius for commands
4. **Command Combinations**: Multiple commands can be sent in a single request
5. **Error Handling**: Invalid commands or parameters will return error responses
6. **State Dependencies**: Some commands may depend on current device state
7. **Custom Controls**: Use GetCustomControlsByProductSN API to retrieve device-specific controls

## Example Multi-Command Request
```json
{
  "sn": "RGB_BULB_12345",
  "iotDevs": ["Living Room Light"],
  "iotCmds": [
    {
      "command": "OnOff",
      "params": {"on": true}
    },
    {
      "command": "BrightnessAbsolute",
      "params": {"brightness": 80}
    },
    {
      "command": "ColorAbsolute",
      "params": {"temperature": 3000}
    }
  ]
}
```

This documentation covers all the traits and commands available in the UltronSMART Personal API SendCommand system. Each trait provides specific functionality for different device types, and devices can support multiple traits depending on their capabilities.