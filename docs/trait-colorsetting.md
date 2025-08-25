# ColorSetting

## Overview

The **ColorSetting** trait enables sophisticated color control for lighting devices. This trait supports multiple color models including RGB spectrum control, HSV (Hue, Saturation, Value), and color temperature adjustment, providing comprehensive color management capabilities for smart lighting systems.

## Supported Attributes

### 1. `commandOnlyColorSetting` (Boolean)

* **Type**: Boolean
* **Description**: When `true`, the device only accepts color commands and cannot be queried for its current color state
* **Default**: `false`
* **Usage**: Set to `true` for devices that can receive color commands but don't report their color state back

### 2. `colorModel` (String)

* **Type**: String
* **Description**: Defines the primary color model supported by the device
* **Possible Values**: 
  - `"rgb"`: RGB color model
  - `"hsv"`: HSV color model
  - `"ct"`: Color temperature only
  - `"rgb_ct"`: Both RGB and color temperature
* **Default**: `"rgb"`
* **Usage**: Determines which color parameters the device accepts

### 3. `colorTemperatureRange` (Object)

* **Type**: Object with `minK` and `maxK` properties
* **Description**: Defines the supported color temperature range in Kelvin
* **Structure**:
  ```json
  {
    "minK": 2000,
    "maxK": 6500
  }
  ```
* **Usage**: Validates color temperature values for devices supporting temperature control

### 4. `supportsRgbwControl` (Boolean)

* **Type**: Boolean
* **Description**: When `true`, the device supports separate white channel control in addition to RGB
* **Default**: `false`
* **Usage**: Enables RGBW color control for devices with dedicated white LEDs

### 5. `colorGamut` (Object)

* **Type**: Object defining color space boundaries
* **Description**: Specifies the device's color reproduction capabilities
* **Structure**:
  ```json
  {
    "red": {"x": 0.680, "y": 0.320},
    "green": {"x": 0.265, "y": 0.690},
    "blue": {"x": 0.150, "y": 0.060}
  }
  ```
* **Usage**: Defines the CIE color space triangle for accurate color reproduction

### 6. `effectsList` (Array)

* **Type**: Array of strings
* **Description**: List of predefined color effects supported by the device
* **Example**: `["rainbow", "pulse", "strobe", "smooth"]`
* **Usage**: Enables special color animation effects

## Supported Commands

### 1. `ColorAbsolute`

Sets the device to a specific color using various color models.

#### Parameters

```typescript
{
  color: {
    spectrumRGB?: number,      // RGB as integer (0x000000 to 0xFFFFFF)
    spectrumHSV?: {           // HSV color model
      hue: number,            // 0-360 degrees
      saturation: number,     // 0-1
      value: number          // 0-1
    },
    temperatureK?: number     // Color temperature in Kelvin
  }
}
```

#### Parameter Validation

* **RGB Color** (`spectrumRGB`):
  - Range: 0 to 16777215 (0x000000 to 0xFFFFFF)
  - Format: Integer representing RGB values
  - Calculation: `(red << 16) | (green << 8) | blue`

* **HSV Color** (`spectrumHSV`):
  - `hue`: 0-360 degrees
  - `saturation`: 0-1 (0% to 100%)
  - `value`: 0-1 (0% to 100% brightness)

* **Color Temperature** (`temperatureK`):
  - Must be within device's `colorTemperatureRange`
  - Typical range: 2000K (warm) to 6500K (cool)

## Usage Examples

### Setting RGB Color

```json
// Set to red
{
  "deviceControl": {
    "commandName": "ColorAbsolute",
    "parameters": {
      "color": {
        "spectrumRGB": 16711680  // 0xFF0000
      }
    }
  },
  "devicesIds": ["rgb-light-001"]
}

// Set to blue
{
  "deviceControl": {
    "commandName": "ColorAbsolute",
    "parameters": {
      "color": {
        "spectrumRGB": 255  // 0x0000FF
      }
    }
  },
  "devicesIds": ["rgb-light-001"]
}
```

### Setting HSV Color

```json
{
  "deviceControl": {
    "commandName": "ColorAbsolute",
    "parameters": {
      "color": {
        "spectrumHSV": {
          "hue": 120,         // Green
          "saturation": 1,    // Full saturation
          "value": 0.8        // 80% brightness
        }
      }
    }
  },
  "devicesIds": ["hsv-light-001"]
}
```

### Setting Color Temperature

```json
// Warm white
{
  "deviceControl": {
    "commandName": "ColorAbsolute",
    "parameters": {
      "color": {
        "temperatureK": 2700
      }
    }
  },
  "devicesIds": ["ct-light-001"]
}

// Cool daylight
{
  "deviceControl": {
    "commandName": "ColorAbsolute",
    "parameters": {
      "color": {
        "temperatureK": 5600
      }
    }
  },
  "devicesIds": ["ct-light-001"]
}
```

### Combined with Brightness

Many devices support setting color and brightness simultaneously:

```json
{
  "deviceControl": {
    "commandName": "ColorAbsolute",
    "parameters": {
      "color": {
        "spectrumRGB": 16776960  // Yellow (0xFFFF00)
      },
      "brightness": 50  // 50% brightness
    }
  },
  "devicesIds": ["rgb-light-001"]
}
```

## Device Types

### RGB Light Strip
```json
{
  "traits": ["OnOff", "Brightness", "ColorSetting"],
  "attributes": {
    "colorModel": "rgb",
    "supportsRgbwControl": false,
    "effectsList": ["rainbow", "pulse", "strobe"]
  }
}
```

### Tunable White Bulb
```json
{
  "traits": ["OnOff", "Brightness", "ColorSetting"],
  "attributes": {
    "colorModel": "ct",
    "colorTemperatureRange": {
      "minK": 2200,
      "maxK": 6500
    }
  }
}
```

### Full-Feature Smart Bulb
```json
{
  "traits": ["OnOff", "Brightness", "ColorSetting"],
  "attributes": {
    "colorModel": "rgb_ct",
    "colorTemperatureRange": {
      "minK": 2000,
      "maxK": 6500
    },
    "supportsRgbwControl": true,
    "effectsList": ["smooth", "pulse"]
  }
}
```

## Color Model Configurations

### RGB-Only Devices
- Accept only `spectrumRGB` parameter
- Full color spectrum support
- No white temperature adjustment

### Color Temperature-Only Devices
- Accept only `temperatureK` parameter
- Limited to white spectrum
- Ideal for ambient lighting

### Dual-Mode Devices (RGB + CT)
- Accept either `spectrumRGB` or `temperatureK`
- Switch between color and white modes
- Cannot use both simultaneously

### RGBW Devices
- Support `spectrumRGB` with separate white channel
- Enhanced white light quality
- Better color accuracy

## Color References

### Common RGB Values

| Color | Hex | Decimal | Description |
|-------|-----|---------|-------------|
| Red | #FF0000 | 16711680 | Pure red |
| Green | #00FF00 | 65280 | Pure green |
| Blue | #0000FF | 255 | Pure blue |
| White | #FFFFFF | 16777215 | All channels max |
| Yellow | #FFFF00 | 16776960 | Red + Green |
| Cyan | #00FFFF | 65535 | Green + Blue |
| Magenta | #FF00FF | 16711935 | Red + Blue |
| Orange | #FFA500 | 16753920 | Warm orange |
| Purple | #800080 | 8388736 | Deep purple |
| Pink | #FFC0CB | 16761035 | Light pink |

### Common Color Temperatures

| Temperature | Description | Use Case |
|-------------|-------------|----------|
| 2000K | Candlelight | Very warm, romantic |
| 2700K | Warm White | Cozy, residential |
| 3000K | Soft White | Comfortable, living spaces |
| 3500K | Neutral White | Balanced, kitchens |
| 4000K | Cool White | Productive, offices |
| 5000K | Daylight | Bright, detailed work |
| 6500K | Cool Daylight | Energizing, focus |

## Best Practices

### 1. Color Model Selection
- Use the appropriate color model for the device
- Check device attributes before sending commands
- Don't mix incompatible color parameters

### 2. Smooth Transitions
- Consider using fade effects when available
- Gradual changes are more pleasant for users
- Avoid rapid color cycling in living spaces

### 3. Color Accuracy
- RGB values may vary between devices
- Use color calibration if available
- Test actual output for critical applications

### 4. Energy Efficiency
- Warmer colors typically use less energy
- Full brightness white uses maximum power
- Consider dimming for extended use

### 5. User Experience
- Provide presets for common scenarios
- Allow fine-tuning for personal preferences
- Remember last settings for convenience

## Related Traits

### Works With
- **OnOff**: Basic power control
- **Brightness**: Intensity adjustment
- **LightEffects**: Advanced animations
- **Scene**: Preset configurations

### Common Combinations
```json
// Full lighting control
{
  "traits": ["OnOff", "Brightness", "ColorSetting", "Scene"],
  "commands": [
    "OnOff",
    "BrightnessAbsolute",
    "ColorAbsolute",
    "ActivateScene"
  ]
}
```

## State Reporting

### Query Response Format
```json
{
  "on": true,
  "brightness": 80,
  "color": {
    "spectrumRGB": 16776960,
    "temperatureK": 3000  // If in temperature mode
  },
  "currentColorMode": "rgb"  // or "temperature"
}
```

### State Transitions
- Switching between RGB and temperature modes
- Maintaining brightness across color changes
- Preserving last color when turning off/on

## Advanced Features

### Color Effects
```json
{
  "deviceControl": {
    "commandName": "StartEffect",
    "parameters": {
      "effect": "rainbow",
      "speed": 50,        // Effect speed (0-100)
      "intensity": 75     // Effect intensity
    }
  }
}
```

### Color Scenes
```json
{
  "deviceControl": {
    "commandName": "ActivateScene",
    "parameters": {
      "sceneID": "sunset",
      "transition": 30    // 30-second transition
    }
  }
}
```

### Scheduled Color Changes
```json
{
  "deviceControl": {
    "commandName": "ScheduleColorChange",
    "parameters": {
      "schedule": [
        {
          "time": "07:00",
          "color": {"temperatureK": 5000}
        },
        {
          "time": "20:00",
          "color": {"temperatureK": 2700}
        }
      ]
    }
  }
}
```

## Technical Considerations

### Color Space Conversion
- RGB to HSV conversion may lose precision
- Temperature to RGB approximation varies
- Device-specific color profiles affect output

### Performance
- Rapid color changes may impact device lifespan
- Network latency affects synchronization
- Batch commands for multiple devices

### Compatibility
- Not all devices support all color models
- Legacy devices may have limited ranges
- Check firmware versions for features

---

*The ColorSetting trait provides comprehensive color control capabilities. Always verify device-specific implementations and test color outputs for optimal results.*