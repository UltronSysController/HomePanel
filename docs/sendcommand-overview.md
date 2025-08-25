# SendCommand Guide

## Overview

The SendCommand API is the core interface for controlling IoT devices in the UltronSMART ecosystem. This guide covers command structure, trait-based control patterns, and device-specific implementations.

## Command Structure

### Basic Request Format

```json
{
  "deviceControl": {
    "commandName": "OnOff",
    "parameters": {
      "on": true
    }
  },
  "devicesIds": ["device-123", "device-456"]
}
```

### Core Components

1. **deviceControl**: Contains the command and its parameters
2. **commandName**: The specific trait command to execute
3. **parameters**: Command-specific parameters
4. **devicesIds**: Array of target device identifiers

## Common Trait Commands

### OnOff Trait

Controls basic on/off functionality for devices.

```json
{
  "deviceControl": {
    "commandName": "OnOff",
    "parameters": {
      "on": true
    }
  }
}
```

#### Parameters:
- `on` (boolean): `true` to turn on, `false` to turn off
- `onInterval` (number, optional): On duration in milliseconds for intermittent operation
- `offInterval` (number, optional): Off duration in milliseconds for intermittent operation

### Brightness Trait

Controls light intensity for dimmable devices.

```json
{
  "deviceControl": {
    "commandName": "BrightnessAbsolute",
    "parameters": {
      "brightness": 75
    }
  }
}
```

#### Parameters:
- `brightness` (number): Brightness level from 0-100
- `duration` (number, optional): Fade duration in seconds

### ColorSetting Trait

Manages color properties for RGB/color temperature devices.

#### RGB Color Control
```json
{
  "deviceControl": {
    "commandName": "ColorAbsolute",
    "parameters": {
      "color": {
        "spectrumRGB": 16711680  // Red color (0xFF0000)
      }
    }
  }
}
```

#### Color Temperature Control
```json
{
  "deviceControl": {
    "commandName": "ColorAbsolute",
    "parameters": {
      "color": {
        "temperatureK": 3000  // Warm white
      }
    }
  }
}
```

#### Parameters:
- `color.spectrumRGB` (number): RGB color value as integer
- `color.temperatureK` (number): Color temperature in Kelvin (typically 2000-6500K)

### FanSpeed Trait

Controls fan speed settings.

```json
{
  "deviceControl": {
    "commandName": "SetSpeed",
    "parameters": {
      "speed": "HIGH"
    }
  }
}
```

#### Parameters:
- `speed` (string): Speed setting (e.g., "LOW", "MEDIUM", "HIGH", "AUTO")
- `percent` (number, optional): Speed as percentage (0-100)

### TemperatureSetting Trait

Manages temperature control for thermostats and HVAC devices.

```json
{
  "deviceControl": {
    "commandName": "ThermostatTemperatureSetpoint",
    "parameters": {
      "thermostatTemperatureSetpoint": 22.5
    }
  }
}
```

#### Parameters:
- `thermostatTemperatureSetpoint` (number): Target temperature in Celsius
- `thermostatMode` (string): Mode selection ("HEAT", "COOL", "AUTO", "OFF")
- `thermostatTemperatureSetpointHigh` (number): High setpoint for AUTO mode
- `thermostatTemperatureSetpointLow` (number): Low setpoint for AUTO mode

### OpenClose Trait

Controls devices that open and close (doors, curtains, valves).

```json
{
  "deviceControl": {
    "commandName": "OpenClose",
    "parameters": {
      "openPercent": 50
    }
  }
}
```

#### Parameters:
- `openPercent` (number): Opening percentage (0-100)
- `openDirection` (string, optional): Direction for multi-directional devices

### Modes Trait

Manages device operational modes.

```json
{
  "deviceControl": {
    "commandName": "SetModes",
    "parameters": {
      "updateModeSettings": {
        "lightingMode": "READING"
      }
    }
  }
}
```

#### Parameters:
- `updateModeSettings` (object): Key-value pairs of mode names and their settings

### Scene Trait

Activates predefined device scenes.

```json
{
  "deviceControl": {
    "commandName": "ActivateScene",
    "parameters": {
      "sceneID": "evening_ambiance"
    }
  }
}
```

#### Parameters:
- `sceneID` (string): Identifier of the scene to activate
- `deactivate` (boolean, optional): If true, deactivates the scene

## Device-Specific Examples

### Smart Light Bulb

Full-featured RGB bulb with dimming:

```json
{
  "deviceControl": {
    "commandName": "OnOff",
    "parameters": {
      "on": true
    }
  },
  "devicesIds": ["bulb-001"]
}
```

Set color and brightness:
```json
{
  "deviceControl": {
    "commandName": "ColorAbsolute",
    "parameters": {
      "color": {
        "spectrumRGB": 65280  // Green
      },
      "brightness": 80
    }
  },
  "devicesIds": ["bulb-001"]
}
```

### Smart Thermostat

Set temperature and mode:
```json
{
  "deviceControl": {
    "commandName": "ThermostatTemperatureSetpoint",
    "parameters": {
      "thermostatTemperatureSetpoint": 21,
      "thermostatMode": "HEAT"
    }
  },
  "devicesIds": ["thermostat-001"]
}
```

### Smart Curtain

Open curtains to specific position:
```json
{
  "deviceControl": {
    "commandName": "OpenClose",
    "parameters": {
      "openPercent": 75
    }
  },
  "devicesIds": ["curtain-001"]
}
```

### Smart Lock

Lock/unlock control:
```json
{
  "deviceControl": {
    "commandName": "LockUnlock",
    "parameters": {
      "lock": true
    }
  },
  "devicesIds": ["lock-001"]
}
```

## Advanced Features

### Batch Control

Control multiple devices simultaneously:

```json
{
  "deviceControl": {
    "commandName": "OnOff",
    "parameters": {
      "on": false
    }
  },
  "devicesIds": ["light-001", "light-002", "light-003"]
}
```

### Combined Commands

Some devices support multiple trait commands in sequence. Check device capabilities for support.

### Conditional Parameters

Some traits support conditional parameters based on device state or capabilities. Always verify device attributes before sending commands.

## Error Handling

### Common Error Responses

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Brightness value must be between 0 and 100"
  }
}
```

### Error Codes
- `DEVICE_NOT_FOUND`: Specified device ID doesn't exist
- `INVALID_PARAMETER`: Parameter value out of range or invalid type
- `UNSUPPORTED_COMMAND`: Device doesn't support the requested command
- `DEVICE_OFFLINE`: Device is not currently connected
- `RATE_LIMIT_EXCEEDED`: Too many requests in short period

## Best Practices

1. **Verify Device Capabilities**: Check device traits and attributes before sending commands
2. **Use Appropriate Commands**: Match commands to device types and capabilities
3. **Handle Errors Gracefully**: Implement proper error handling for all API calls
4. **Batch When Possible**: Use device arrays for simultaneous control
5. **Respect Rate Limits**: Implement appropriate delays between rapid commands
6. **Validate Parameters**: Ensure parameter values are within acceptable ranges
7. **Monitor Device State**: Query device state when necessary to verify command execution

## Testing Commands

### Test Environment
Use the development API endpoint for testing:
```
https://beta-doraemon-cms.appspot.com
```

### Sample Test Flow

1. Query device capabilities
2. Send test command
3. Verify command execution
4. Handle any errors appropriately

## Common Use Cases

### Morning Routine
```json
// Turn on lights gradually
{
  "deviceControl": {
    "commandName": "BrightnessAbsolute",
    "parameters": {
      "brightness": 100,
      "duration": 300  // 5-minute fade
    }
  },
  "devicesIds": ["bedroom-light", "hallway-light"]
}

// Set thermostat to comfortable temperature
{
  "deviceControl": {
    "commandName": "ThermostatTemperatureSetpoint",
    "parameters": {
      "thermostatTemperatureSetpoint": 22,
      "thermostatMode": "HEAT"
    }
  },
  "devicesIds": ["main-thermostat"]
}
```

### Security Mode
```json
// Lock all doors
{
  "deviceControl": {
    "commandName": "LockUnlock",
    "parameters": {
      "lock": true
    }
  },
  "devicesIds": ["front-door", "back-door", "garage-door"]
}

// Turn off all lights
{
  "deviceControl": {
    "commandName": "OnOff",
    "parameters": {
      "on": false
    }
  },
  "devicesIds": ["all-lights-group"]
}
```

## Trait Reference Quick Links

- [OnOff Trait](trait-onoff.md)
- [Brightness Trait](trait-brightness.md)
- [ColorSetting Trait](trait-colorsetting.md)
- [FanSpeed Trait](trait-fanspeed.md)
- [TemperatureSetting Trait](trait-temperaturesetting.md)
- [OpenClose Trait](trait-openclose.md)
- [Modes Trait](trait-modes.md)
- [Scene Trait](trait-scene.md)
- [Sensor Trait](trait-sensor.md)

---

*This guide covers the SendCommand API structure and common device control patterns. Always refer to device-specific documentation and SKU information for detailed capabilities and parameter ranges.*