# OnOff

## Overview

The **OnOff** trait provides basic on/off control functionality for IoT devices. This is one of the most fundamental traits, allowing devices to be turned on or off, with optional advanced features like fade effects, intermittent operation, and delegation support.

## Supported Attributes

### 1. `commandOnlyOnOff` (Boolean)

* **Type**: Boolean
* **Description**: When `true`, the device only accepts commands and cannot be queried for its current on/off state
* **Default**: `false`
* **Usage**: Set to `true` for devices that can receive commands but don't report their state back

### 2. `queryOnlyOnOff` (Boolean)

* **Type**: Boolean
* **Description**: When `true`, the device can only be queried for its state but cannot accept on/off commands
* **Default**: `false`
* **Usage**: Set to `true` for read-only devices or sensors that report on/off status but cannot be controlled

### 3. `intermittent` (Boolean)

* **Type**: Boolean
* **Description**: When `true`, the device supports intermittent operation (blinking, pulsing, etc.)
* **Default**: `false`
* **Usage**: Enables `onInterval` and `offInterval` parameters in commands

### 4. `timeStepRange` (Object)

* **Type**: Object with `min` and `max` properties
* **Description**: Defines the valid range for time intervals in milliseconds when using intermittent operation
* **Structure**:
  ```json
  {
    "min": 100,
    "max": 10000
  }
  ```
* **Usage**: Validates `onInterval` and `offInterval` parameter values

### 5. `supportOnOffDelegated` (Boolean)

* **Type**: Boolean
* **Description**: When `true`, the on/off functionality is delegated to another device
* **Default**: `false`
* **Usage**: Typically used with `queryOnlyOnOff: true` for devices that control other devices

### 6. `detectFunctions` (Array)