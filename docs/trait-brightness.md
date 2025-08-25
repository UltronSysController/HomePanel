# Brightness

## Overview

The **Brightness** trait enables devices to control light intensity levels. This trait is commonly used for dimmable lights, LED strips, and other lighting devices that support variable brightness control beyond simple on/off functionality.

## Supported Attributes

### 1. `commandOnlyBrightness` (Boolean)

* **Type**: Boolean
* **Description**: When `true`, the device only accepts brightness commands and cannot be queried for its current brightness level
* **Default**: `false`
* **Usage**: Set to `true` for devices that can receive brightness commands but don't report their brightness state back

### 2. `availableDimmingTypes` (Array)

* **Type**: Array of strings
* **Description**: Specifies the dimming control methods supported by the device
* **Possible Values**: `["0-10V", "1-10V"]`
* **Usage**: Indicates the electrical dimming method used by the device

### 3. `fade` (Object)

* **Type**: Object containing fade configuration
* **Description**: Defines fade effect capabilities and constraints
* **Structure**:
  ```json
  {
    "durationRange": {
      "min": 1,
      "max": 60
    }
  }
  ```
* **Usage**: Enables smooth brightness transitions with configurable duration

### 4. `colorProfile` (Object)

* **Type**: Object defining color characteristics
* **Description**: Specifies color rendering and profile information for the lighting device
* **Usage**: Used for advanced color management and calibration

### 5. `brightnessRangeConfigurable` (Boolean)

* **Type**: Boolean
* **Description**: When `true`, the device allows configuration of its minimum and maximum brightness range
* **Default**: `false`
* **Usage**: Enables custom brightness range settings for specific installations

## Supported Commands

### 1. `BrightnessAbsolute`

Sets the device to a specific brightness level.

#### Parameters

```typescript
{
  brightness: number  // Required: Brightness level (0-100)
}
```

#### Parameter Validation

* `brightness`: Must be between 0