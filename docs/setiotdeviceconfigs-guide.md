# SetIotDeviceConfigs Guide

## Overview

The **SetIotDeviceConfigs** API allows you to configure various device-specific settings and parameters for IoT devices. This API uses a flexible configuration system where each configuration type has its own structure and validation rules.

## API Endpoint

```
POST /usr/v4/SetIotDeviceConfigs
```

## Request Structure

```json
{
  "sn": "DEVICE_SERIAL_NUMBER",
  "iotConfigs": [
    {
      "config": "CONFIG_NAME",
      "iotName": "OPTIONAL_IOT_ENDPOINT_NAME",
      "items": {
        // Configuration-specific structure
      }
    }
  ]
}
```

### Parameters

* **`sn`**: Device serial number (required)
* **`iotConfigs`**: Array of configuration objects (required)
  * **`config`**: Configuration type name (required)
  * **`iotName`**: Optional IoT endpoint name for multi-endpoint devices
  * **`items`**: Configuration-specific data structure (required), or `null` to reset/clear the configuration

## Retrieving Current Device Configurations

Before setting or modifying device configurations, you can retrieve the current configuration state using the **GetGroupDevices** API.

### API Endpoint

```
POST /usr/v4/GetGroupDevices
```

### Request Structure

```json
{
  "groupId": "YOUR_LOCATION_ID"
}
```

### Example Request

```bash
curl -X POST "https://api.ultroncloud.com/usr/v4/GetGroupDevices" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Ultron-Cloud-Appid: YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "YOUR_LOCATION_ID"
  }'
```

### Response Structure

The response includes device information with current configurations in the `configs` field. The `devices` field is a map where keys are ProductSN (device serial numbers), and the `models` field is a map where keys are IoT endpoint names:

```json
{
  "result": 0,
  "devices": {
    "DEVICE_SERIAL_NUMBER_1": {
      "sn": "DEVICE_SERIAL_NUMBER_1",
      "displayName": "Smart Light",
      "activated": true,
      "models": {
        "light_main": {
          "type": "LIGHT",
          "traits": ["OnOff", "Brightness"],
          "nickname": "Main Light",
          "disabled": false,
          "attrs": [
            {
              "name": "commandOnlyOnOff",
              "value": false
            },
            {
              "name": "availableDimmingTypes",
              "value": ["0-10V", "1-10V"]
            }
          ]
        }
      },
      "configs": [
        {
          "config": "BrightnessRange",
          "items": {
            "min": 10,
            "max": 100
          }
        },
        {
          "config": "Scheduler",
          "items": [
            {
              "taskId": 1001,
              "name": "Morning Light",
              "iot": "light_main",
              "firstShot": 1640995200,
              "interval": 86400,
              "cmd": {
                "command": "OnOff",
                "params": {
                  "on": true
                }
              }
            }
          ]
        }
      ],
      "createdTime": "2023-01-01T00:00:00Z"
    },
    "DEVICE_SERIAL_NUMBER_2": {
      "sn": "DEVICE_SERIAL_NUMBER_2",
      "displayName": "Temperature Sensor",
      "activated": true,
      "models": {
        "temp_sensor": {
          "type": "SENSOR",
          "traits": ["TemperatureControl", "SensorState"],
          "nickname": "Temperature Sensor",
          "disabled": false,
          "attrs": [
            {
              "name": "temperatureRange",
              "value": {
                "min": -40,
                "max": 85
              }
            }
          ]
        }
      },
      "configs": [
        {
          "config": "IotIntervals",
          "items": {
            "reportStates": 1800,
            "sensor": {
              "temp_sensor": {
                "temperature": {
                  "tolerance": 0.5,
                  "report": 300
                }
              }
            }
          }
        }
      ],
      "createdTime": "2023-01-01T00:00:00Z"
    }
  }
}
```

### Configuration Management Workflow

#### 1. Retrieve Current Configurations

```bash
# Get current device configurations
curl -X POST "https://api.ultroncloud.com/usr/v4/GetGroupDevices" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Ultron-Cloud-Appid: YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "YOUR_LOCATION_ID"
  }'
```

#### 2. Modify Specific Configuration

```bash
# Update brightness range based on current settings
curl -X POST "https://api.ultroncloud.com/usr/v4/SetIotDeviceConfigs" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Ultron-Cloud-Appid: YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "sn": "SMART_LIGHT_001",
    "iotConfigs": [
      {
        "config": "BrightnessRange",
        "items": {
          "min": 5,
          "max": 95
        }
      }
    ]
  }'
```

#### 3. Verify Configuration Changes

```bash
# Retrieve updated configurations to verify changes
curl -X POST "https://api.ultroncloud.com/usr/v4/GetGroupDevices" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Ultron-Cloud-Appid: YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "YOUR_LOCATION_ID"
  }'
```

### Configuration Inspection Examples

#### Check Scheduled Tasks

```javascript
// Find and display current scheduled tasks for a specific device
const device = response.devices["SMART_LIGHT_SERIAL"];
if (device) {
  const schedulerConfig = device.configs.find(config => config.config === "Scheduler");
  if (schedulerConfig && schedulerConfig.items) {
    console.log("Current Scheduled Tasks:");
    schedulerConfig.items.forEach(task => {
      console.log(`- Task ${task.taskId}: ${task.name} (${task.iot})`);
      console.log(`  Next execution: ${new Date(task.firstShot * 1000)}`);
      console.log(`  Command: ${task.cmd.command}`);
    });
  }
}
```

#### Check IoT Communication Intervals

```javascript
// Inspect current IoT interval settings for a specific device
const device = response.devices["SENSOR_DEVICE_SERIAL"];
if (device) {
  const intervalConfig = device.configs.find(config => config.config === "IotIntervals");
  if (intervalConfig) {
    const intervals = intervalConfig.items;
    console.log("Report States Interval:", intervals.reportStates, "seconds");
    console.log("BLE Topology Interval:", intervals.bleTopology, "seconds");
    console.log("MQTT Keep Alive:", intervals.mqttConfig.keepAlive, "seconds");
  }
}
```

### Configuration Backup and Restore

#### Backup Current Configurations

```javascript
// Save current configurations for backup
async function backupDeviceConfigs(groupId) {
  const response = await fetch('/usr/v4/GetGroupDevices', {
    method: 'POST',
    headers: {
      'X-Api-Key': 'YOUR_API_KEY',
      'Ultron-Cloud-Appid': 'YOUR_APP_ID',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ groupId })
  });
  
  const data = await response.json();
  const backup = {};
  
  // Iterate through devices map (key = ProductSN, value = DeviceDoc)
  for (const [deviceSN, device] of Object.entries(data.devices)) {
    if (device.configs && device.configs.length > 0) {
      backup[deviceSN] = device.configs;
    }
  }
  
  // Save backup to storage
  localStorage.setItem('deviceConfigBackup', JSON.stringify(backup));
  return backup;
}
```

#### Restore Configurations from Backup

```javascript
// Restore configurations from backup
async function restoreDeviceConfigs(backupData) {
  for (const [deviceSn, configs] of Object.entries(backupData)) {
    await fetch('/usr/v4/SetIotDeviceConfigs', {
      method: 'POST',
      headers: {
        'X-Api-Key': 'YOUR_API_KEY',
        'Ultron-Cloud-Appid': 'YOUR_APP_ID',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sn: deviceSn,
        iotConfigs: configs
      })
    });
  }
}
```

## Configuration Reset/Clear

To reset or clear a specific configuration, set the `items` field to `null`. This will remove the configuration and restore the device to its default settings for that configuration type.

### Reset Structure

```json
{
  "config": "CONFIG_NAME",
  "iotName": "optional_endpoint",
  "items": null
}
```

### Reset Examples

#### Reset Brightness Range to Default

```json
{
  "sn": "DIMMABLE_LIGHT_SERIAL",
  "iotConfigs": [
    {
      "config": "BrightnessRange",
      "items": null
    }
  ]
}
```

#### Clear All Scheduled Tasks

```json
{
  "sn": "SMART_DEVICE_SERIAL",
  "iotConfigs": [
    {
      "config": "Scheduler",
      "items": null
    }
  ]
}
```

#### Reset IoT Communication Intervals

```json
{
  "sn": "SENSOR_DEVICE_SERIAL",
  "iotConfigs": [
    {
      "config": "IotIntervals",
      "items": null
    }
  ]
}
```

### Multiple Configuration Reset

You can reset multiple configurations in a single request:

```bash
curl -X POST "https://api.ultroncloud.com/usr/v4/SetIotDeviceConfigs" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Ultron-Cloud-Appid: YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "sn": "MULTI_CONFIG_DEVICE",
    "iotConfigs": [
      {
        "config": "BrightnessRange",
        "items": null
      },
      {
        "config": "Scheduler",
        "items": null
      },
      {
        "config": "Fade",
        "items": null
      }
    ]
  }'
```

### Reset Specific Endpoint Configuration

For multi-endpoint devices, you can reset configuration for a specific endpoint:

```json
{
  "sn": "MULTI_ENDPOINT_DEVICE",
  "iotConfigs": [
    {
      "config": "IotIntervals",
      "iotName": "sensor_endpoint_1",
      "items": null
    }
  ]
}
```

### Reset Behavior

When a configuration is reset (`items: null`):

1. **Device Default Restoration**: The device returns to its factory default settings for that configuration type
2. **Memory Cleanup**: Any stored configuration data is cleared from device memory
3. **Immediate Effect**: The reset takes effect immediately (no restart required)
4. **Validation Bypass**: No validation is performed since the configuration is being removed
5. **Dependency Handling**: Dependent configurations may also be affected

### Reset Use Cases

#### Troubleshooting

* Clear problematic configurations that cause device issues
* Reset to known good state during debugging
* Remove conflicting configuration settings

#### Maintenance

* Clear temporary configurations after testing
* Reset devices before reassignment or relocation
* Prepare devices for firmware updates

#### Security

* Reset access control configurations

## Configuration Types

### 1. Scheduler - Timer Task Configuration

Configure scheduled tasks and automation for devices.

#### Structure

```json
{
  "config": "Scheduler",
  "items": [
    {
      "taskId": 1001,
      "name": "Morning Light On",
      "iot": "light_main",
      "firstShot": 1640995200,
      "interval": 86400,
      "validBefore": 1672531200,
      "disabled": false,
      "cmd": {
        "command": "OnOff",
        "params": {
          "on": true
        }
      }
    }
  ]
}
```

#### Example

```json
{
  "sn": "SMART_LIGHT_SERIAL",
  "iotConfigs": [
    {
      "config": "Scheduler",
      "items": [
        {
          "taskId": 1001,
          "name": "Evening Dim",
          "iot": "light_main",
          "firstShot": 1640995200,
          "interval": 86400,
          "cmd": {
            "command": "BrightnessAbsolute",
            "params": {
              "brightness": 30
            }
          }
        }
      ]
    }
  ]
}
```

### 2. BrightnessRange - Brightness Range Configuration

Configure custom brightness ranges for dimmable lights.

#### Structure

```json
{
  "config": "BrightnessRange",
  "items": {
    "min": 10,
    "max": 100
  }
}
```

#### Example

```json
{
  "sn": "DIMMABLE_LIGHT_SERIAL",
  "iotConfigs": [
    {
      "config": "BrightnessRange",
      "items": {
        "min": 5,
        "max": 95
      }
    }
  ]
}
```

### 3. IotIntervals - Device Communication Intervals

Configure communication intervals, retry policies, and sensor reporting settings.

#### Structure

```json
{
  "config": "IotIntervals",
  "items": {
    "reportStates": 3600,
    "bleTopology": 600,
    "retry": {
      "activate": {
        "value": 60,
        "max": 300,
        "backoff": "exponential"
      },
      "mqttConnect": {
        "value": 30,
        "max": 120
      },
      "asyncApi": {
        "value": 10,
        "max": 60
      }
    },
    "mqttConfig": {
      "keepAlive": 290,
      "connTimeout": 30,
      "connectAuthFail": 40
    },
    "sensor": {
      "iot_endpoint_name": {
        "temperature": {
          "tolerance": 0.5,
          "report": 300,
          "sampling": 60
        },
        "humidity": {
          "tolerance": 2.0,
          "report": 300,
          "sampling": 60
        }
      }
    }
  }
}
```

#### Example

```json
{
  "sn": "SENSOR_DEVICE_SERIAL",
  "iotConfigs": [
    {
      "config": "IotIntervals",
      "items": {
        "reportStates": 1800,
        "bleTopology": 300,
        "retry": {
          "activate": {
            "value": 30,
            "max": 180
          },
          "mqttConnect": {
            "value": 15,
            "max": 60
          }
        },
        "mqttConfig": {
          "keepAlive": 240,
          "connTimeout": 20
        },
        "sensor": {
          "temp_sensor": {
            "temperature": {
              "tolerance": 0.3,
              "report": 600,
              "sampling": 120
            }
          }
        }
      }
    }
  ]
}
```

## Complete API Examples

### Configure Smart Light with Multiple Settings

```bash
curl -X POST "https://api.ultroncloud.com/usr/v4/SetIotDeviceConfigs" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Ultron-Cloud-Appid: YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "sn": "SMART_LIGHT_001",
    "iotConfigs": [
      {
        "config": "BrightnessRange",
        "items": {
          "min": 1,
          "max": 100
        }
      },
      {
        "config": "Fade",
        "items": {
          "durationRange": {
            "min": 0.5,
            "max": 10
          },
          "defaultDuration": 2
        }
      },
      {
        "config": "Scheduler",
        "items": [
          {
            "taskId": 1001,
            "name": "Morning On",
            "iot": "light_main",
            "firstShot": 1640995200,
            "interval": 86400,
            "cmd": {
              "command": "OnOff",
              "params": {
                "on": true
              }
            }
          }
        ]
      }
    ]
  }'
```

### Configure Sensor Intervals

```bash
curl -X POST "https://api.ultroncloud.com/usr/v4/SetIotDeviceConfigs" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Ultron-Cloud-Appid: YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "sn": "TEMP_SENSOR_001",
    "iotConfigs": [
      {
        "config": "IotIntervals",
        "items": {
          "reportStates": 1800,
          "retry": {
            "activate": {
              "value": 30,
              "max": 120
            }
          },
          "sensor": {
            "temp_main": {
              "temperature": {
                "tolerance": 0.2,
                "report": 300,
                "sampling": 60
              }
            }
          }
        }
      }
    ]
  }'
```

## Configuration Validation

Each configuration type has specific validation rules:

### Common Validation Rules

1. **Required Fields**: All required fields must be present
2. **Data Types**: Values must match expected data types
3. **Range Validation**: Numeric values must be within acceptable ranges
4. **Device Compatibility**: Configuration must be supported by device attributes
5. **Cross-Field Validation**: Related fields must be consistent

### Validation Examples

#### Timer Task Validation

* FirstShot must be in the future
* Interval must be ≥ 300 seconds if specified
* ValidBefore must be after FirstShot
* Command must be supported by target IoT endpoint

#### Brightness Range Validation

* Min must be ≤ Max
* Values must be 0-100
* Device must support brightness range configuration

## Best Practices

### 1. Configuration Planning

* **Retrieve current configurations** using GetGroupDevices before making changes
* Review device attributes before configuring
* Understand configuration dependencies
* Plan configuration changes during maintenance windows
* Test configurations in development environment

### 2. Validation Strategy

* **Check existing configurations** to understand current state
* Validate configurations client-side before sending
* **Verify changes** by retrieving configurations after setting
* Handle validation errors gracefully
* Provide clear error messages to users
* Implement configuration rollback procedures

### 3. Security Considerations

* Secure configuration data in transit and at rest
* Audit configuration changes

### 4. Reset and Recovery

* Use `items: null` to reset configurations to defaults
* Reset problematic configurations during troubleshooting
* Clear configurations before device reassignment
* Document reset procedures for maintenance

### 5. Performance Optimization

* Batch multiple configurations in single request
* Use appropriate intervals for sensor reporting
* Configure retry policies based on network conditions
* Monitor device performance after configuration changes

### 6. Maintenance and Monitoring

* **Regularly retrieve and review** device configurations using GetGroupDevices
* Document configuration changes
* Monitor device behavior after configuration
* **Implement configuration backup** using GetGroupDevices data
* Regular review and optimization of settings

## Configuration Dependencies

Some configurations depend on device attributes or other configurations:

### Attribute Dependencies

* **BrightnessRange**: Requires `brightnessRangeConfigurable` attribute
* **Scheduler**: Requires `schedulable` attribute
* **IotIntervals**: Requires `iotConfigurableIntervals` attribute

### Configuration Interactions

* **Scheduler** tasks reference IoT endpoints
* **IotIntervals** impact all device communications
* **Fade** settings affect lighting transitions

## Troubleshooting

### Common Issues

#### Configuration Not Applied

1. **Check current configuration** using GetGroupDevices to see if changes were applied
2. Check device online status
3. Verify configuration syntax and validation
4. Check device attribute compatibility
5. Review device logs for errors
6. **Try resetting the configuration first**: Set `items: null` to clear existing config, then reapply

#### Performance Issues After Configuration

1. **Retrieve current intervals** using GetGroupDevices to identify problematic settings
2. Review interval settings (too frequent reporting)
3. Check retry policy settings
4. Monitor network bandwidth usage
5. Verify sensor tolerance settings
6. **Reset to defaults**: Use `items: null` to restore default intervals

#### Scheduler Not Working

1. **Inspect current tasks** using GetGroupDevices to verify task configuration
2. Verify task timing (firstShot, interval)
3. Check command compatibility with endpoint
4. Ensure device clock synchronization
5. Review task enable/disable status
6. **Clear all tasks**: Use `items: null` to remove all scheduled tasks and start fresh

### Configuration Reset Troubleshooting

#### Reset Not Taking Effect

1. Verify device is online and responsive
2. Check if device requires restart after reset
3. Confirm reset command was properly formatted
4. Monitor device logs for reset confirmation

#### Partial Reset Issues

1. Some configurations may have dependencies
2. Reset dependent configurations in correct order
3. Allow time for device to process reset
4. Verify all related configurations are cleared

<br />

<br />

<Table align={["left","left","left"]}>
  <thead>
    <tr>
      <th>
        Name
      </th>

      <th>
        Required Attribute
      </th>

      <th>
        Example
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>
        ArbitraryRadioGroups
      </td>

      <td>
        arbitraryRadioGroupDevices
      </td>

      <td>
        ```json
        { 
          "name": "arbitraryRadioGroupDevices", 
          "value": ["1", "2", "3", "4"]
        }
        ```
      </td>
    </tr>

    <tr>
      <td>
        BrightnessRange
      </td>

      <td>
        brightnessRangeConfigurable
      </td>

      <td>
        ```json
        { 
          "name": "brightnessRangeConfigurable", 
          "value": true
        }
        ```
      </td>
    </tr>

    <tr>
      <td>
        CircuitDetector
      </td>

      <td>
        detectDirection
      </td>

      <td>
        ```json
        { 
          "name": "detectDirection", 
          "value": ["OpenToClose", "CloseToOpen"]
        }
        ```
      </td>
    </tr>

    <tr>
      <td>
        ColorPreset
      </td>

      <td>
        colorProfile
      </td>

      <td>
        ```json
        {
          "name": "colorProfile",
          "value": {
            "enabled": true,
            "brightnessStart": 0,
            "brightnessEnd": 50,
            "temperature": 4600,
            "spectrumRGB": null,
            "spectrumHSV": null
          }
        }
        ```

        <br />
      </td>
    </tr>

    <tr>
      <td>
        DefaultActions
      </td>

      <td>
        supportDefaultActions
      </td>

      <td>
        ```json
        {
          "name": "supportDefaultActions",
          "value": {
            "1": {
              "cmdNames": [
                "OnOff"
              ],
              "situations": [
                "power",
                "network"
              ]
            },
            "2": {
              "cmdNames": [
                "OnOff"
              ],
              "situations": [
                "power",
                "network"
              ]
            }
          }
        }
        ```
      </td>
    </tr>

    <tr>
      <td>
        Dimmer
      </td>

      <td>
        availableDimmingTypes
      </td>

      <td>
        ```json
        { 
          "name": "availableDimmingTypes", 
          "value": ["0-10V", "1-10V"]
        }
        ```
      </td>
    </tr>

    <tr>
      <td>
        DisableGateway
      </td>

      <td>
        supportGatewayOff
      </td>

      <td>
        ```json
        { 
          "name": "supportGatewayOff", 
          "value": true
        }
        ```
      </td>
    </tr>

    <tr>
      <td>
        Fade
      </td>

      <td>
        fade
      </td>

      <td>
        ```json
        {
          "name": "fade",
          "value": {
            "enabled": true,
            "duration": 2,
            "durationRange": {
              "min": 1,
              "max": 10
            }
          }
        }
        ```
      </td>
    </tr>

    <tr>
      <td>
        FadePreset
      </td>

      <td>
        fade
      </td>

      <td>
        ```json
        {
          "name": "fade",
          "value": {
            "enabled": true,
            "duration": 2,
            "durationRange": {
              "min": 1,
              "max": 10
            }
          }
        }
        ```
      </td>
    </tr>

    <tr>
      <td>
        IotIntervals
      </td>

      <td>
        iotConfigurableIntervals
      </td>

      <td>
        ```json
        { 
          "name": "iotConfigurableIntervals", 
          "value": true
        }
        ```
      </td>
    </tr>

    <tr>
      <td>
        MotorRotation
      </td>

      <td>
        motorReversible
      </td>

      <td>
        ```json
        { 
          "name": "motorReversible", 
          "value": true
        }
        ```
      </td>
    </tr>

    <tr>
      <td>
        Periodicity
      </td>

      <td>
        schedulable, periodicity,\
        aperiodicity(if support oneShot)
      </td>

      <td>
        ```json
        [
          { 
            "name": "schedulable", 
            "value": true
          },
          {
            "name": "periodicity", 
            "value": true
          },
          {
            "name": "aperiodicity", 
            "value": true
          }
        ]
        ```
      </td>
    </tr>

    <tr>
      <td>
        Scheduler
      </td>

      <td>
        schedulable
      </td>

      <td>
        ```json
        {
          "name": "schedulable",
          "value": {  
            "1": ["OnOff"], 
            "2": ["OnOff"], 
            "3": ["OnOff"],
            "4": ["OnOff"]
          }
        }
        ```
      </td>
    </tr>

    <tr>
      <td>
        TimeStep
      </td>

      <td>
        timeStepRange
      </td>

      <td>
        ```json JSON
        {
          "name": "timeStepRange",
          "value": {
            "max": 84600,
            "min": 1,
            "step": 1
          }
        }
        ```
      </td>
    </tr>
  </tbody>
</Table>