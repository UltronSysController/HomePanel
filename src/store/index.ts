import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApiConfig, Device, Group, Room, DeviceGroup } from '../types';
import UltronSmartAPI from '../services/ultron-api';

interface SmartHomeState {
  // API 配置
  apiConfig: ApiConfig | null;
  api: UltronSmartAPI | null;
  
  // 群組和設備
  groups: Group[];
  currentGroupId: string | null;
  devices: Record<string, Device>;
  
  // 房間（虛擬）
  rooms: Room[];
  roomOrder: string[]; // 房間順序
  deviceOrder: Record<string, string[]>; // 每個房間的設備順序
  
  // 圖示資料
  typeIcons: Record<string, string>; // TypeId -> IconUrl
  
  // 載入狀態
  isLoading: boolean;
  error: string | null;
  
  // 設備房間分配（用於持久化）
  deviceRoomAssignments: Record<string, string>;
  
  // 自訂設備名稱（用於持久化）
  customDeviceNames: Record<string, string>; // deviceSn -> custom name
  
  // 設備群組
  deviceGroups: DeviceGroup[];
  
  // Actions
  setApiConfig: (config: ApiConfig) => void;
  loadGroups: () => Promise<void>;
  selectGroup: (groupId: string) => Promise<void>;
  refreshDeviceStates: (groupId: string) => Promise<void>;
  fetchDeviceSensorData: (groupId: string, sn: string) => Promise<void>;
  getDeviceState: (deviceSn: string) => Promise<any>;
  toggleDevice: (deviceSn: string) => Promise<void>;
  updateDeviceState: (deviceSn: string, state: any) => Promise<void>;
  updateDeviceRoom: (deviceSn: string, roomId: string) => void;
  updateDeviceName: (deviceSn: string, name: string) => void;
  createRoom: (room: Room) => void;
  addRoom: (roomData: { name: string; icon: string }) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  deleteRoom: (roomId: string) => void;
  updateRoomOrder: (roomIds: string[]) => void;
  updateDeviceOrder: (roomId: string, deviceSns: string[]) => void;
  clearError: () => void;
  
  // 群組相關 actions
  createDeviceGroup: (name: string, deviceIds: string[], roomId: string) => void;
  addDeviceToGroup: (groupId: string, deviceId: string) => void;
  removeDeviceFromGroup: (groupId: string, deviceId: string) => void;
  dissolveGroup: (groupId: string) => void;
  updateGroupName: (groupId: string, name: string) => void;
  toggleGroup: (groupId: string) => Promise<void>;
}

// Helper function to get state from iotState object
const getIotDeviceState = (iotState: any): any => {
  // Try different possible keys for the main controller
  const possibleKeys = ['Light', 'main_controller', 'Main Controller', 'main', 'Main', 'default', '1', '0'];
  
  for (const key of possibleKeys) {
    if (iotState[key]) {
      return iotState[key];
    }
  }
  
  // If no standard key found, try to get the first available device state
  const keys = Object.keys(iotState);
  if (keys.length > 0) {
    // Skip 'Ultron Device' and other metadata keys
    const deviceKey = keys.find(k => 
      k !== 'Ultron Device' && 
      k !== 'ultron_device' && 
      k !== 'metadata' &&
      k !== 'status'
    ) || keys[0];
    return iotState[deviceKey] || {};
  }
  
  return {};
};

const useSmartHomeStore = create<SmartHomeState>()(
  persist(
    (set, get) => ({
      // 初始狀態
      apiConfig: null,
      api: null,
      groups: [],
      currentGroupId: null,
      devices: {},
      rooms: [
        { id: 'living-room', name: '客廳', icon: '🛋️', devices: [] },
        { id: 'bedroom', name: '臥室', icon: '🛏️', devices: [] },
        { id: 'kitchen', name: '廚房', icon: '🍳', devices: [] },
        { id: 'bathroom', name: '浴室', icon: '🚿', devices: [] },
      ],
      roomOrder: ['living-room', 'bedroom', 'kitchen', 'bathroom'],
      deviceOrder: {},
      typeIcons: {},
      isLoading: false,
      error: null,
      deviceRoomAssignments: {},
      customDeviceNames: {},
      deviceGroups: [],

      // 設定 API 配置
      setApiConfig: (config) => {
        const api = new UltronSmartAPI(config);
        set({ apiConfig: config, api });
      },

      // 載入群組
      loadGroups: async () => {
        const { api } = get();
        if (!api) return;

        set({ isLoading: true, error: null });
        try {
          // 同時載入群組和圖示列表
          const [groups, { typeIconList }] = await Promise.all([
            api.listLocations(),
            api.getTypeIconList()
          ]);
          
          // 處理圖示資料
          const typeIcons: Record<string, string> = {};
          typeIconList.forEach(icon => {
            // 使用 TypeId 和 Serial 作為 key
            typeIcons[`${icon.TypeId}-${icon.Serial}`] = icon.IconUrl;
            // 也儲存不帶 Serial 的版本作為預設
            if (!typeIcons[icon.TypeId]) {
              typeIcons[icon.TypeId] = icon.IconUrl;
            }
          });
          
          // 轉換為舊格式以保持相容性
          const formattedGroups = groups.map(g => ({
            groupId: g.groupId,
            name: g.name,
            deviceCount: g.usedDeviceQuota || 0,
            members: g.members || [],
            owner: g.owner ? {
              uid: g.owner,
              displayName: g.owner,
              email: ''
            } : undefined
          }));
          
          set({ groups: formattedGroups, typeIcons, isLoading: false });

          // 自動選擇第一個群組
          if (groups.length > 0 && !get().currentGroupId) {
            await get().selectGroup(groups[0].groupId);
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '載入群組失敗',
            isLoading: false 
          });
        }
      },

      // 選擇群組
      selectGroup: async (groupId) => {
        const { api } = get();
        if (!api) return;

        set({ isLoading: true, error: null, currentGroupId: groupId });
        try {
          // 同時獲取設備列表和狀態
          const [devices, deviceStates] = await Promise.all([
            api.listDevices(groupId),
            api.getDeviceStates(groupId)
          ]);
          
          console.log('Devices:', devices);
          console.log('Device States:', deviceStates);
          
          // 特別診斷 BF2Z 設備的原始 API 狀態
          Object.entries(deviceStates).forEach(([sn, state]: [string, any]) => {
            if (sn.includes('BF2Z')) {
              console.log(`🔴 Raw API State for ${sn}:`, {
                fullState: state,
                stateData: state.stateData,
                iotState: state.stateData?.iotState,
                onlineData: state.onlineData,
                'Light state': state.stateData?.iotState?.Light,
                'State keys': state.stateData?.iotState ? Object.keys(state.stateData.iotState) : []
              });
            }
          });
          
          // 處理設備資料
          const processedDevices: Record<string, Device> = {};
          
          // 輔助函數：將有多個子設備的設備拆分
          const splitMultipleDevices = (sn: string, device: any, deviceState: any): Array<[string, any, any]> => {
            const results: Array<[string, any, any]> = [];
            
            // 一律檢查是否有多個 iotDevs
            const iotState = deviceState.stateData?.iotState || {};
            const iotDevKeys = Object.keys(iotState);
            
            // 過濾掉系統裝置和輔助功能
            const deviceKeys = iotDevKeys.filter(key => 
              !key.includes('Ultron') && 
              !key.includes('System') &&
              key !== 'main_controller' &&
              key !== 'Power Meter' &&  // Power Meter 是輔助功能，不是獨立設備
              key !== 'power_meter' &&
              key !== 'PowerMeter'
            );
            
            // 判斷是否需要拆分的設備類型
            const isVRF = sn.includes('UT2200');  // VRF 系統
            const isMultiOutlet = sn.includes('UT3M');  // 多插座設備（如 UT3M0F）
            const isSmartPlug = sn.includes('UT3702');  // 智慧插座（不拆分）
            
            // VRF 設備使用數字作為 key
            const vrfKeys = isVRF ? deviceKeys.filter(key => /^\d+$/.test(key)) : [];
            
            // 診斷日誌
            if (sn.includes('UT3702') || sn.includes('UT3M') || isVRF) {
              console.log(`🔍 Device Split Analysis ${sn}:`, {
                iotDevKeys,
                deviceKeys,
                isVRF,
                isMultiOutlet,
                isSmartPlug,
                vrfKeys,
                shouldSplit: (isVRF && vrfKeys.length > 0) || (isMultiOutlet && deviceKeys.length > 1)
              });
            }
            
            // 檢查是否有多個 outlets
            const outletKeys = deviceKeys.filter(key => key.startsWith('OUTLET'));
            
            // 智慧插座（UT3702）不拆分，即使有 Power Meter
            if (isSmartPlug) {
              // 不拆分，直接返回原始設備
              results.push([sn, device, deviceState]);
            }
            // VRF 設備拆分
            else if (isVRF && vrfKeys.length > 0) {
              // UT2200 VRF 設備，拆分每個子機
              vrfKeys.forEach((vrfKey) => {
                const subDeviceSn = `${sn}#${vrfKey}`;
                const subDevice = {
                  ...device,
                  sn: subDeviceSn,
                  originalSn: sn,
                  subDeviceIndex: parseInt(vrfKey),
                  iotDev: vrfKey,
                  name: `${device.name || device.displayName || 'VRF'} Unit ${parseInt(vrfKey) + 1}`,
                  displayName: `${device.displayName || device.name || 'VRF'} Unit ${parseInt(vrfKey) + 1}`
                };
                
                const subDeviceState = {
                  ...deviceState,
                  stateData: {
                    ...deviceState.stateData,
                    iotState: {
                      [vrfKey]: iotState[vrfKey]
                    }
                  }
                };
                
                results.push([subDeviceSn, subDevice, subDeviceState]);
              });
              // 如果沒有找到子設備，還是要返回原始設備
              if (results.length === 0) {
                results.push([sn, device, deviceState]);
              }
            } 
            // 多插座設備（如 UT3M0F）拆分
            else if (isMultiOutlet && outletKeys.length > 1) {
              // 有多個插座，拆分成獨立設備
              outletKeys.forEach((outletKey, index) => {
                const subDeviceSn = `${sn}_${outletKey}`;
                const subDevice = {
                  ...device,
                  sn: subDeviceSn,
                  originalSn: sn,
                  subDeviceIndex: index,
                  iotDev: outletKey,
                  name: `${device.name || device.displayName || 'Outlet'} ${index + 1}`,
                  displayName: `${device.displayName || device.name || 'Outlet'} ${index + 1}`
                };
                
                const subDeviceState = {
                  ...deviceState,
                  stateData: {
                    ...deviceState.stateData,
                    iotState: {
                      [outletKey]: iotState[outletKey]
                    }
                  }
                };
                
                results.push([subDeviceSn, subDevice, subDeviceState]);
              });
            } else if (deviceKeys.length > 1) {
              // 一律拆分所有有多個 iotDev 的設備
              deviceKeys.forEach((iotDevKey, index) => {
                const subDeviceSn = `${sn}#${index}`;
                const subDevice = {
                  ...device,
                  sn: subDeviceSn,
                  originalSn: sn,
                  subDeviceIndex: index,
                  iotDev: iotDevKey,
                  name: `${device.name || device.displayName || sn} - ${iotDevKey}`,
                  displayName: `${device.displayName || device.name || sn} - ${iotDevKey}`
                };
                
                const subDeviceState = {
                  ...deviceState,
                  stateData: {
                    ...deviceState.stateData,
                    iotState: {
                      [iotDevKey]: iotState[iotDevKey]
                    }
                  }
                };
                
                results.push([subDeviceSn, subDevice, subDeviceState]);
              });
            } else if (device.endpoint?.iotDevs) {
              // 檢查是否有多個 toggles (switches)
              const toggleDevices = Object.entries(device.endpoint.iotDevs)
                .filter(([key, value]: [string, any]) => value.toggles && Object.keys(value.toggles).length > 0);
              
              if (toggleDevices.length > 0) {
                toggleDevices.forEach(([iotDevKey, iotDevData]: [string, any]) => {
                  const toggles = Object.keys(iotDevData.toggles || {});
                  if (toggles.length > 1) {
                    // 有多個開關，拆分成獨立設備
                    toggles.forEach((toggleKey, index) => {
                      const subDeviceSn = `${sn}#${iotDevKey}_${toggleKey}`;
                      const subDevice = {
                        ...device,
                        sn: subDeviceSn,
                        originalSn: sn,
                        subDeviceIndex: index,
                        iotDev: iotDevKey,
                        toggleKey: toggleKey,
                        name: `${device.name || device.displayName || 'Switch'} ${index + 1}`,
                        displayName: `${device.displayName || device.name || 'Switch'} ${index + 1}`
                      };
                      
                      const subDeviceState = {
                        ...deviceState,
                        stateData: {
                          ...deviceState.stateData,
                          iotState: {
                            [iotDevKey]: {
                              toggles: {
                                [toggleKey]: iotDevData.toggles[toggleKey]
                              }
                            }
                          }
                        }
                      };
                      
                      results.push([subDeviceSn, subDevice, subDeviceState]);
                    });
                  } else {
                    // 只有一個開關，保持原樣
                    results.push([sn, device, deviceState]);
                  }
                });
              } else {
                // 沒有多個子設備，保持原樣
                results.push([sn, device, deviceState]);
              }
            } else {
              // 沒有多個子設備，保持原樣
              results.push([sn, device, deviceState]);
            }
            
            return results.length > 0 ? results : [[sn, device, deviceState]];
          };
          
          Object.entries(devices).forEach(([sn, device]: [string, any]) => {
            // 從 deviceStates 獲取即時狀態（如果 API 回傳空物件，則使用 device 本身的狀態）
            const deviceState = deviceStates[sn] || {};
            
            // 拆分有多個子設備的設備
            const splitDevices = splitMultipleDevices(sn, device, deviceState);
            
            // 處理每個拆分後的設備（或原始設備）
            splitDevices.forEach(([processSn, processDevice, processDeviceState]) => {
            
            // 解析設備狀態
            const state: any = { power: false };
            
            // 從 processDeviceState (拆分後的狀態) 中提取狀態，而不是原始的 deviceState
            const iotState = processDeviceState.stateData?.iotState || {};
            
            // 診斷原始狀態資料
            if (processSn.includes('BF2Z')) {
              console.log(`📊 Processing ${processSn} iotState:`, iotState);
            }
            
            // 根據設備類型獲取正確的狀態
            let deviceSpecificState = {};
            let powerMeterState: any = {};
            
            if (iotState.Light) {
              deviceSpecificState = iotState.Light;
            } else if (iotState.OUTLET1) {
              deviceSpecificState = iotState.OUTLET1;
              // 對於智慧插座，也檢查 Power Meter
              if (iotState['Power Meter']) {
                powerMeterState = iotState['Power Meter'];
                console.log(`Found Power Meter for ${processSn}:`, powerMeterState);
              } else if (iotState.PowerMeter) {
                powerMeterState = iotState.PowerMeter;
                console.log(`Found PowerMeter for ${processSn}:`, powerMeterState);
              } else if (iotState.power_meter) {
                powerMeterState = iotState.power_meter;
                console.log(`Found power_meter for ${processSn}:`, powerMeterState);
              }
            } else {
              // 使用 helper function 獲取設備狀態
              deviceSpecificState = getIotDeviceState(iotState);
            }
            
            // 特別處理 UT3702 - 標記需要獲取 sensor data
            if (processSn.includes('UT3702')) {
              console.log(`UT3702 detected: ${processSn}`);
              console.log('Full iotState:', JSON.stringify(iotState, null, 2));
              console.log('deviceSpecificState:', JSON.stringify(deviceSpecificState, null, 2));
              console.log('powerMeterState:', JSON.stringify(powerMeterState, null, 2));
              
              // 先用基本的電力資料
              const devState = deviceSpecificState as any;
              if (devState.watt !== undefined || devState.power !== undefined) {
                powerMeterState.watt = devState.watt || devState.power;
              }
            }
            
            // 不要使用 device.status，它可能是過時的資料
            // const status = processDevice.status || {};
            
            // 只使用從 API 獲取的即時狀態
            const allStates: any = deviceSpecificState;
            
            // 檢查電源狀態 - 根據 MCP 文檔，BF2Z 系列使用 'on' 欄位
            if (allStates.on !== undefined) {
              state.power = allStates.on;
            } else if (allStates.onOff !== undefined) {
              // 有些設備可能使用小寫的 onOff
              state.power = allStates.onOff;
            } else if (allStates.OnOff !== undefined) {
              // 字串格式的 OnOff
              state.power = allStates.OnOff === 'On' || allStates.OnOff === true;
            } else if (allStates.power !== undefined) {
              // 直接的 power 欄位
              state.power = allStates.power;
            }
            
            // 特別處理 BF2Z 系列燈具的狀態不一致問題
            // 如果亮度大於 5（排除極低亮度），則認為燈是開啟的
            if (processSn.includes('BF2Z') && allStates.brightness !== undefined) {
              const actuallyOn = allStates.brightness > 5;
              if (actuallyOn !== state.power) {
                console.warn(`⚠️ BF2Z Device ${processSn}: brightness=${allStates.brightness}, on=${allStates.on}, correcting power to ${actuallyOn}`);
                state.power = actuallyOn;
              }
            }
            
            // 對於冷氣，檢查 thermostatMode
            if (allStates.thermostatMode) {
              state.power = allStates.thermostatMode !== 'off';
              state.mode = allStates.thermostatMode;
            }
            
            // 亮度
            if (allStates.brightness !== undefined) {
              state.brightness = allStates.brightness;
              // 只有當亮度為 0 時，強制設定電源狀態為關閉
              if (device.type === 'light' && state.brightness === 0) {
                state.power = false;
              }
            }
            
            // 色溫 - 根據 API 文檔，色溫可能在不同的欄位中
            if (allStates.colorTemperature?.temperatureK !== undefined) {
              state.colorTemperature = allStates.colorTemperature.temperatureK;
              state.colorTemperatureRange = {
                min: allStates.colorTemperature?.minMireds ? Math.round(1000000 / allStates.colorTemperature.minMireds) : 2700,
                max: allStates.colorTemperature?.maxMireds ? Math.round(1000000 / allStates.colorTemperature.maxMireds) : 6500
              };
            } else if (allStates.color?.temperatureK !== undefined) {
              // 有些設備使用 color.temperatureK 而不是 colorTemperature.temperatureK
              state.colorTemperature = allStates.color.temperatureK;
              state.colorTemperatureRange = {
                min: 2700,
                max: 6500
              };
            } else if (allStates.temperature !== undefined && device.type === 'light') {
              // 對於燈具，temperature 欄位可能直接表示色溫
              state.colorTemperature = allStates.temperature;
              state.colorTemperatureRange = {
                min: 2700,
                max: 6500
              };
            }
            
            // 溫度
            if (allStates.thermostatTemperatureSetpoint !== undefined) {
              state.temperature = allStates.thermostatTemperatureSetpoint;
            } else if (allStates.temperature !== undefined) {
              state.temperature = allStates.temperature;
            }
            
            // 濕度
            if (allStates.thermostatHumidityAmbient !== undefined) {
              state.humidity = allStates.thermostatHumidityAmbient;
            } else if (allStates.humidity !== undefined) {
              state.humidity = allStates.humidity;
            }
            
            // 功率 - 從設備狀態或 Power Meter 獲取
            if (allStates.watt !== undefined) {
              state.watt = allStates.watt;
            }
            
            // Power Meter 資料（針對智慧插座）
            if (Object.keys(powerMeterState).length > 0) {
              console.log(`Setting Power Meter data for ${processSn}:`, powerMeterState);
              const pmState = powerMeterState as any;
              if (pmState.watt !== undefined) state.watt = pmState.watt;
              if (pmState.voltage !== undefined) state.voltage = pmState.voltage;
              if (pmState.current !== undefined) state.current = pmState.current;
              if (pmState.kwh !== undefined) state.kwh = pmState.kwh;
              if (pmState.kWh !== undefined) state.kwh = pmState.kWh;
              if (pmState.power !== undefined && !state.watt) state.watt = pmState.power;
            }
            
            // 其他感應器數據
            if (allStates.pm25 !== undefined) state.pm25 = allStates.pm25;
            if (allStates.co2 !== undefined) state.co2 = allStates.co2;
            if (allStates.illuminance !== undefined) state.illuminance = allStates.illuminance;
            if (allStates.motion !== undefined) state.motion = allStates.motion;
            if (allStates.contact !== undefined) state.contact = allStates.contact;
            
            // 額外檢查可能的溫濕度欄位名稱
            if (allStates.temp !== undefined) state.temperature = allStates.temp;
            if (allStates.hum !== undefined) state.humidity = allStates.hum;
            if (allStates.Temperature !== undefined) state.temperature = allStates.Temperature;
            if (allStates.Humidity !== undefined) state.humidity = allStates.Humidity;
            
            // 獲取 iotDevs - 從 models 中獲取實際的設備模型名稱
            let iotDevs: string[] = [];
            if (device.models) {
              // 過濾出實際的設備模型（排除 Ultron Device）
              iotDevs = Object.keys(device.models).filter(key => 
                key !== 'Ultron Device' && device.models[key].type !== 'ULTRON'
              );
            }
            if (iotDevs.length === 0) {
              iotDevs = ['main_controller'];
            }
            
            // 獲取 toggles (for switches)
            const toggles = device.endpoint?.iotDevs?.main_controller?.toggles ? 
              Object.keys(device.endpoint.iotDevs.main_controller.toggles) : undefined;
            
            // 判斷設備是否在線
            // 優先從 deviceState 的 onlineData 判斷，否則使用 device.online
            const isOnline = deviceState.onlineData?.online ?? device.online ?? false;
            
            // 根據設備的 hwType 或類型獲取圖示
            const { typeIcons } = get();
            let iconUrl: string | undefined;
            
            // 嘗試從 hwType 獲取圖示
            if (device.hwType && typeIcons[device.hwType]) {
              iconUrl = typeIcons[device.hwType];
            } else if (device.models) {
              // 嘗試從 models 的類型獲取圖示
              const deviceType = detectDeviceType(device);
              // 根據設備類型映射到 TypeId
              const typeMapping: Record<string, string> = {
                'light': '2Z', // 燈泡
                'outlet': '37', // 插座
                'sensor': '08', // 感應器
                'fan': '2N', // 風扇
              };
              if (typeMapping[deviceType] && typeIcons[typeMapping[deviceType]]) {
                iconUrl = typeIcons[typeMapping[deviceType]];
              }
            }
            
            // 使用自訂名稱（如果有的話）
            const customNames = get().customDeviceNames || {};
            const deviceName = customNames[processSn] || processDevice.displayName || processDevice.bundleName || processSn;
            
            processedDevices[processSn] = {
              ...processDevice,
              sn: processSn,
              name: deviceName,
              type: detectDeviceType(processDevice),
              online: isOnline,
              state,
              iotDevs,
              toggles,
              icon: iconUrl,
              traits: processDevice.traits || []
            };
            
            // 特別為 BF2Z 系列燈具增加診斷
            if (processSn.includes('BF2Z')) {
              console.log(`🔍 BF2Z Device ${processSn} Detailed Analysis:`, {
                '1. Device Info': {
                  name: processedDevices[processSn].name,
                  type: processedDevices[processSn].type,
                  online: processedDevices[processSn].online,
                  hwType: processDevice.hwType,
                  models: processDevice.models
                },
                '2. Raw State Data': {
                  rawDeviceState: processDeviceState,
                  iotState: iotState,
                  deviceSpecificState: deviceSpecificState
                },
                '3. Parsed State': {
                  allStates: allStates,
                  finalState: state,
                  power: state.power,
                  brightness: state.brightness,
                  colorTemp: state.colorTemperature
                },
                '4. Power Detection': {
                  'allStates.on': allStates.on,
                  'allStates.OnOff': allStates.OnOff,
                  'parsed as': state.power
                }
              });
            } else {
              console.log(`Device ${processSn}:`, {
                name: processedDevices[processSn].name,
                type: processedDevices[processSn].type,
                online: processedDevices[processSn].online,
                state: processedDevices[processSn].state,
                traits: processedDevices[processSn].traits,
                hwType: processDevice.hwType,
                icon: iconUrl,
                iotDevs: processedDevices[processSn].iotDevs,
                rawDeviceState: processDeviceState,
                iotState: iotState,
                deviceSpecificState: deviceSpecificState,
                allStates: allStates,
                powerState: state.power
              });
            }
            }); // end of splitDevices.forEach
          }); // end of Object.entries.forEach

          // 恢復持久化的房間分配
          const savedAssignments = get().deviceRoomAssignments || {};
          const currentRooms = get().rooms;
          
          
          // 清空所有房間的設備列表
          const updatedRooms = currentRooms.map(room => ({
            ...room,
            devices: [] as string[]
          }));
          
          // 恢復設備的房間分配並更新房間的設備列表
          Object.entries(savedAssignments).forEach(([sn, roomId]) => {
            if (processedDevices[sn]) {
              processedDevices[sn].roomId = roomId;
              
              // 找到對應的房間並添加設備
              const roomIndex = updatedRooms.findIndex(r => r.id === roomId);
              if (roomIndex !== -1) {
                updatedRooms[roomIndex].devices.push(sn);
              }
            }
          });

          // 保留所有已保存的房間分配
          const newAssignments: Record<string, string> = { ...savedAssignments };
          
          // 更新當前載入的設備的房間分配（如果他們已經有 roomId）
          Object.entries(processedDevices).forEach(([sn, device]) => {
            if (device.roomId) {
              newAssignments[sn] = device.roomId;
            } else if (!newAssignments[sn]) {
              // 如果設備沒有房間分配，且之前也沒有保存的分配，則移除
              delete newAssignments[sn];
            }
          });

          set({ 
            devices: processedDevices, 
            rooms: updatedRooms,
            deviceRoomAssignments: newAssignments,
            isLoading: false 
          });
          
          // 對 UT3702 設備獲取 sensor data
          Object.entries(processedDevices).forEach(([sn, device]) => {
            if (sn.includes('UT3702')) {
              console.log(`Fetching sensor data for UT3702: ${sn}`);
              get().fetchDeviceSensorData(groupId, sn);
            }
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '載入設備失敗',
            isLoading: false 
          });
        }
      },

      // 獲取設備的 sensor data（包含 Power Meter）
      fetchDeviceSensorData: async (groupId: string, sn: string) => {
        const { api, devices } = get();
        if (!api) return;
        
        try {
          console.log(`Fetching sensor data for ${sn}`);
          const sensorData = await api.getSensorDataOfDevice(groupId, sn, 5);
          
          if (sensorData && sensorData.records && devices[sn]) {
            console.log(`Got sensor data for ${sn}:`, sensorData.records);
            const records = sensorData.records;
            
            if (records && records.length > 0) {
              const latestRecord = records[records.length - 1];
              if (latestRecord) {
                const updatedDevice = {
                  ...devices[sn],
                  state: {
                    ...devices[sn].state,
                    watt: latestRecord.watt || latestRecord.power || devices[sn].state?.watt,
                    voltage: latestRecord.voltage || devices[sn].state?.voltage,
                    current: latestRecord.current || devices[sn].state?.current,
                    kwh: latestRecord.kwh || latestRecord.kWh || devices[sn].state?.kwh
                  }
                };
                
                set({ 
                  devices: {
                    ...devices,
                    [sn]: updatedDevice
                  }
                });
                
                console.log(`Updated ${sn} with sensor data:`, updatedDevice.state);
              }
            }
          }
        } catch (error) {
          console.error(`Failed to fetch sensor data for ${sn}:`, error);
        }
      },
      
      // 更新設備狀態（用於定時刷新）
      refreshDeviceStates: async (groupId) => {
        const { api, devices } = get();
        if (!api) return;

        try {
          // 獲取最新的設備狀態
          const deviceStates = await api.getDeviceStates(groupId);
          
          // 更新現有設備的狀態
          const updatedDevices = { ...devices };
          
          Object.entries(deviceStates).forEach(([sn, deviceState]) => {
            if (updatedDevices[sn] && deviceState) {
              // 檢查設備是否在線
              const isOnline = deviceState?.onlineData?.online ?? false;
              
              // 解析所有狀態 - 從 stateData.iotState 中獲取
              const iotState = deviceState.stateData?.iotState || {};
              
              // 根據設備類型獲取正確的狀態
              let deviceSpecificState = {};
              let powerMeterState: any = {};
              
              if (iotState.Light) {
                deviceSpecificState = iotState.Light;
              } else if (iotState.OUTLET1) {
                deviceSpecificState = iotState.OUTLET1;
                // 對於智慧插座，也檢查 Power Meter
                if (iotState['Power Meter']) {
                  powerMeterState = iotState['Power Meter'];
                } else if (iotState.PowerMeter) {
                  powerMeterState = iotState.PowerMeter;
                } else if (iotState.power_meter) {
                  powerMeterState = iotState.power_meter;
                }
              } else {
                deviceSpecificState = getIotDeviceState(iotState);
              }
              
              const allStates: any = deviceSpecificState;
              const newState: any = { ...updatedDevices[sn].state };
              
              // 檢查開關狀態 - 使用與 selectGroup 相同的邏輯
              if (allStates.on !== undefined) {
                newState.power = allStates.on;
              } else if (allStates.OnOff !== undefined) {
                newState.power = allStates.OnOff === 'On';
              }
              
              // 對於冷氣，檢查 thermostatMode
              if (allStates.thermostatMode) {
                newState.power = allStates.thermostatMode !== 'off';
                newState.mode = allStates.thermostatMode;
              }
              
              // 亮度
              if (allStates.brightness !== undefined) {
                newState.brightness = allStates.brightness;
                // 只有當亮度為 0 時，強制設定電源狀態為關閉
                if (updatedDevices[sn].type === 'light' && newState.brightness === 0) {
                  newState.power = false;
                }
              }
              
              // 色溫
              if (allStates.colorTemperature?.temperatureK !== undefined) {
                newState.colorTemperature = allStates.colorTemperature.temperatureK;
                newState.colorTemperatureRange = {
                  min: allStates.colorTemperature?.minMireds ? Math.round(1000000 / allStates.colorTemperature.minMireds) : 2700,
                  max: allStates.colorTemperature?.maxMireds ? Math.round(1000000 / allStates.colorTemperature.maxMireds) : 6500
                };
              }
              
              // 溫度
              if (allStates.thermostatTemperatureSetpoint !== undefined) {
                newState.temperature = allStates.thermostatTemperatureSetpoint;
              } else if (allStates.temperature !== undefined) {
                newState.temperature = allStates.temperature;
              }
              
              // 濕度
              if (allStates.thermostatHumidityAmbient !== undefined) {
                newState.humidity = allStates.thermostatHumidityAmbient;
              } else if (allStates.humidity !== undefined) {
                newState.humidity = allStates.humidity;
              }
              
              // 功率 - 從設備狀態或 Power Meter 獲取
              if (allStates.watt !== undefined) {
                newState.watt = allStates.watt;
              }
              
              // Power Meter 資料（針對智慧插座）
              if (Object.keys(powerMeterState).length > 0) {
                console.log('Power Meter State found:', powerMeterState);
                const pmState = powerMeterState as any;
                if (pmState.watt !== undefined) newState.watt = pmState.watt;
                if (pmState.voltage !== undefined) newState.voltage = pmState.voltage;
                if (pmState.current !== undefined) newState.current = pmState.current;
                if (pmState.kwh !== undefined) newState.kwh = pmState.kwh;
                if (pmState.kWh !== undefined) newState.kwh = pmState.kWh;
                if (pmState.power !== undefined) newState.watt = pmState.power;
              }
              
              // 其他感應器數據
              if (allStates.pm25 !== undefined) newState.pm25 = allStates.pm25;
              if (allStates.co2 !== undefined) newState.co2 = allStates.co2;
              if (allStates.illuminance !== undefined) newState.illuminance = allStates.illuminance;
              if (allStates.motion !== undefined) newState.motion = allStates.motion;
              if (allStates.contact !== undefined) newState.contact = allStates.contact;
              
              // 額外檢查可能的溫濕度欄位名稱
              if (allStates.temp !== undefined) newState.temperature = allStates.temp;
              if (allStates.hum !== undefined) newState.humidity = allStates.hum;
              if (allStates.Temperature !== undefined) newState.temperature = allStates.Temperature;
              if (allStates.Humidity !== undefined) newState.humidity = allStates.Humidity;
              
              // 更新設備狀態
              updatedDevices[sn] = {
                ...updatedDevices[sn],
                online: isOnline,
                state: newState
              };
              
              console.log(`Updated device ${sn} state:`, {
                name: updatedDevices[sn].name,
                online: isOnline,
                power: newState.power,
                allStates: allStates
              });
            }
          });
          
          set({ devices: updatedDevices });
        } catch (error) {
          console.error('Failed to refresh device states:', error);
        }
      },

      // 獲取單個設備的最新狀態
      getDeviceState: async (deviceSn) => {
        const { api, currentGroupId, devices } = get();
        if (!api || !currentGroupId) return null;
        
        try {
          // 獲取最新的設備狀態
          const deviceStates = await api.getDeviceStates(currentGroupId);
          const deviceState = deviceStates[deviceSn];
          
          if (deviceState) {
            // 檢查設備是否在線
            const isOnline = deviceState.onlineData?.online ?? false;
            
            // 解析所有狀態 - 從 stateData.iotState 中獲取
            const iotState = deviceState.stateData?.iotState || {};
            
            // 根據設備類型獲取正確的狀態
            let deviceSpecificState = {};
            if (iotState.Light) {
              deviceSpecificState = iotState.Light;
            } else if (iotState.OUTLET1) {
              deviceSpecificState = iotState.OUTLET1;
            } else {
              deviceSpecificState = getIotDeviceState(iotState);
            }
            
            const allStates: any = deviceSpecificState;
            const newState: any = {};
            
            // 檢查開關狀態
            if (allStates.on !== undefined) {
              newState.power = allStates.on;
            } else if (allStates.OnOff !== undefined) {
              newState.power = allStates.OnOff === 'On';
            }
            
            // 對於冷氣，檢查 thermostatMode
            if (allStates.thermostatMode) {
              newState.power = allStates.thermostatMode !== 'off';
              newState.mode = allStates.thermostatMode;
            }
            
            // 亮度
            if (allStates.brightness !== undefined) {
              newState.brightness = allStates.brightness;
              // 只有當亮度為 0 時，強制設定電源狀態為關閉
              if (devices[deviceSn] && devices[deviceSn].type === 'light' && newState.brightness === 0) {
                newState.power = false;
              }
            }
            
            // 色溫 - 根據 API 文檔，色溫可能在不同的欄位中
            if (allStates.colorTemperature?.temperatureK !== undefined) {
              newState.colorTemperature = allStates.colorTemperature.temperatureK;
              newState.colorTemperatureRange = {
                min: allStates.colorTemperature?.minMireds ? Math.round(1000000 / allStates.colorTemperature.minMireds) : 2700,
                max: allStates.colorTemperature?.maxMireds ? Math.round(1000000 / allStates.colorTemperature.maxMireds) : 6500
              };
            } else if (allStates.color?.temperatureK !== undefined) {
              newState.colorTemperature = allStates.color.temperatureK;
              newState.colorTemperatureRange = {
                min: 2700,
                max: 6500
              };
            } else if (allStates.temperature !== undefined && devices[deviceSn]?.type === 'light') {
              // 對於燈具，temperature 欄位可能直接表示色溫
              newState.colorTemperature = allStates.temperature;
              newState.colorTemperatureRange = {
                min: 2700,
                max: 6500
              };
            }
            
            // 溫度
            if (allStates.thermostatTemperatureSetpoint !== undefined) {
              newState.temperature = allStates.thermostatTemperatureSetpoint;
            } else if (allStates.temperature !== undefined) {
              newState.temperature = allStates.temperature;
            }
            
            // 濕度
            if (allStates.thermostatHumidityAmbient !== undefined) {
              newState.humidity = allStates.thermostatHumidityAmbient;
            } else if (allStates.humidity !== undefined) {
              newState.humidity = allStates.humidity;
            }
            
            // 功率
            if (allStates.watt !== undefined) {
              newState.watt = allStates.watt;
            }
            
            // 其他感應器數據
            if (allStates.pm25 !== undefined) newState.pm25 = allStates.pm25;
            if (allStates.co2 !== undefined) newState.co2 = allStates.co2;
            if (allStates.illuminance !== undefined) newState.illuminance = allStates.illuminance;
            if (allStates.motion !== undefined) newState.motion = allStates.motion;
            if (allStates.contact !== undefined) newState.contact = allStates.contact;
            
            // 額外檢查可能的溫濕度欄位名稱
            if (allStates.temp !== undefined) newState.temperature = allStates.temp;
            if (allStates.hum !== undefined) newState.humidity = allStates.hum;
            if (allStates.Temperature !== undefined) newState.temperature = allStates.Temperature;
            if (allStates.Humidity !== undefined) newState.humidity = allStates.Humidity;
            
            // 更新設備狀態
            const updatedDevices = { ...devices };
            if (updatedDevices[deviceSn]) {
              updatedDevices[deviceSn] = {
                ...updatedDevices[deviceSn],
                online: isOnline,
                state: newState
              };
              set({ devices: updatedDevices });
            }
            
            return newState;
          }
          
          return null;
        } catch (error) {
          console.error('Failed to get device state:', error);
          return null;
        }
      },

      // 切換設備狀態
      toggleDevice: async (deviceSn) => {
        const { api, devices } = get();
        if (!api) return;

        const device = devices[deviceSn];
        if (!device) return;

        try {
          const newPower = !device.state.power;
          
          // 使用原始 SN（如果是子設備的話）
          const actualSn = device.originalSn || deviceSn;
          
          // 從設備資訊中獲取 iotDev
          // 對於燈具，通常使用 "Light" 模型
          // 對於插座，通常使用 "OUTLET1" 模型
          let iotDev = device.iotDevs?.[0] || 'main_controller';
          
          // 如果設備已經有指定的 iotDev（拆分的子設備），直接使用
          if (device.iotDev) {
            iotDev = device.iotDev;
          } else if (device.type === 'light' && device.iotDevs?.includes('Light')) {
            iotDev = 'Light';
          } else if (device.type === 'outlet' && device.iotDevs?.find((dev: string) => dev.startsWith('OUTLET'))) {
            iotDev = device.iotDevs.find((dev: string) => dev.startsWith('OUTLET')) || 'OUTLET1';
          }
          
          // 根據設備類型發送不同的命令
          let command: any;
          if (device.type === 'light') {
            // 燈具使用 OnOff
            command = {
              command: 'OnOff',
              params: { on: newPower }
            };
          } else if (device.type === 'airConditioner') {
            // 冷氣使用 ThermostatSetMode
            if (newPower) {
              command = {
                command: 'ThermostatSetMode',
                params: { thermostatMode: 'cool' }
              };
            } else {
              command = {
                command: 'ThermostatSetMode',
                params: { thermostatMode: 'off' }
              };
            }
          } else if (device.type === 'switch') {
            // 開關使用 SetToggles
            const switchName = device.toggles?.[0] || 'switch1';
            command = {
              command: 'SetToggles',
              params: {
                updateToggleSettings: {
                  [switchName]: newPower
                }
              }
            };
          } else {
            // 其他設備使用 OnOff
            command = {
              command: 'OnOff',
              params: { on: newPower }
            };
          }
          
          console.log('Toggling device:', actualSn, 'iotDev:', iotDev, 'Command:', command);
          
          // 使用新的 API 方法
          if (device.type === 'light' || device.type === 'outlet') {
            if (newPower) {
              await api.turnOnDevice(actualSn, iotDev);
            } else {
              await api.turnOffDevice(actualSn, iotDev);
            }
          } else if (device.type === 'airConditioner') {
            if (newPower) {
              await api.controlDevice(actualSn, iotDev, 'ThermostatSetMode', { thermostatMode: 'cool' });
            } else {
              await api.controlDevice(actualSn, iotDev, 'ThermostatSetMode', { thermostatMode: 'off' });
            }
          } else if (device.type === 'switch') {
            const switchName = device.toggles?.[0] || 'switch1';
            await api.controlDevice(actualSn, iotDev, 'SetToggles', {
              updateToggleSettings: {
                [switchName]: newPower
              }
            });
          } else {
            if (newPower) {
              await api.turnOnDevice(actualSn, iotDev);
            } else {
              await api.turnOffDevice(actualSn, iotDev);
            }
          }

          // 更新本地狀態
          set({
            devices: {
              ...devices,
              [deviceSn]: {
                ...device,
                state: { ...device.state, power: newPower }
              }
            }
          });
        } catch (error) {
          console.error('Toggle device error:', error);
          set({ 
            error: error instanceof Error ? error.message : '控制設備失敗'
          });
        }
      },

      // 更新設備狀態（亮度、顏色等）
      updateDeviceState: async (deviceSn, state) => {
        const { api, devices } = get();
        if (!api) return;

        const device = devices[deviceSn];
        if (!device) return;

        try {
          // 獲取正確的 iotDev
          let iotDev = device.iotDevs?.[0] || 'main_controller';
          if (device.type === 'light' && device.iotDevs?.includes('Light')) {
            iotDev = 'Light';
          }
          
          // 準備命令
          const commands: any[] = [];
          
          // 處理亮度變更
          if (state.brightness !== undefined) {
            // 如果亮度為 0，關閉燈具
            if (state.brightness === 0) {
              commands.push({
                command: 'OnOff',
                params: { on: false }
              });
            } else {
              // 如果設備目前是關閉的，先開啟
              if (!device.state?.power) {
                commands.push({
                  command: 'OnOff',
                  params: { on: true }
                });
              }
              // 然後設定亮度
              commands.push({
                command: 'BrightnessAbsolute',
                params: { 
                  brightness: state.brightness // 直接使用 0-100 的值
                }
              });
            }
          }
          
          // 處理色溫變更
          if (state.colorTemperature !== undefined) {
            // 如果設備是關閉的，先開啟
            if (!device.state?.power) {
              commands.push({
                command: 'OnOff',
                params: { on: true }
              });
            }
            // 設定色溫 - 使用 ColorAbsolute 命令與 color.temperature 格式
            commands.push({
              command: 'ColorAbsolute',
              params: { 
                color: {
                  temperature: state.colorTemperature  // 使用 temperature 而非 temperatureK
                }
              }
            });
          }
          
          // 發送所有命令
          for (const command of commands) {
            console.log('Sending command:', deviceSn, iotDev, command);
            
            // 使用新的 API 方法
            if (command.command === 'OnOff') {
              if (command.params.on) {
                await api.turnOnDevice(deviceSn, iotDev);
              } else {
                await api.turnOffDevice(deviceSn, iotDev);
              }
            } else if (command.command === 'BrightnessAbsolute') {
              await api.setBrightness(deviceSn, command.params.brightness, iotDev);
            } else if (command.command === 'ColorAbsolute' && command.params.color?.temperature) {
              await api.setColorTemperature(deviceSn, command.params.color.temperature, iotDev);
            } else {
              await api.controlDevice(deviceSn, iotDev, command.command, command.params);
            }
          }
          
          // 更新本地狀態
          const updatedState = { ...device.state, ...state };
          // 只有當亮度為 0 時，才強制設定電源狀態為關閉
          if (device.type === 'light' && state.brightness === 0) {
            updatedState.power = false;
          }
          
          set({
            devices: {
              ...devices,
              [deviceSn]: {
                ...device,
                state: updatedState
              }
            }
          });
          
          // 延遲後獲取最新狀態
          setTimeout(async () => {
            await get().getDeviceState(deviceSn);
          }, 1000);
          
        } catch (error) {
          console.error('Update device state error:', error);
          set({ 
            error: error instanceof Error ? error.message : '更新設備狀態失敗'
          });
        }
      },

      // 更新設備房間
      updateDeviceRoom: (deviceSn, roomId) => {
        const { devices, rooms, deviceRoomAssignments } = get();
        const device = devices[deviceSn];
        if (!device) return;

        // 從舊房間移除
        const updatedRooms = rooms.map(room => ({
          ...room,
          devices: room.devices.filter(sn => sn !== deviceSn)
        }));

        // 加入新房間
        const targetRoom = updatedRooms.find(r => r.id === roomId);
        if (targetRoom) {
          targetRoom.devices.push(deviceSn);
        }

        // 更新設備的房間 ID
        const updatedDevices = {
          ...devices,
          [deviceSn]: { ...device, roomId }
        };
        
        // 更新持久化的房間分配 - 基於現有的 deviceRoomAssignments
        const updatedAssignments = {
          ...deviceRoomAssignments,
          [deviceSn]: roomId
        };
        
        set({
          devices: updatedDevices,
          rooms: updatedRooms,
          deviceRoomAssignments: updatedAssignments
        });
      },

      // 創建房間
      createRoom: (room) => {
        const { rooms, roomOrder } = get();
        set({ 
          rooms: [...rooms, room],
          roomOrder: [...roomOrder, room.id]
        });
      },
      
      // 新增房間（自動生成 ID）
      addRoom: (roomData) => {
        const newRoom: Room = {
          id: `room-${Date.now()}`,
          name: roomData.name,
          icon: roomData.icon,
          devices: []
        };
        const { rooms, roomOrder } = get();
        set({ 
          rooms: [...rooms, newRoom],
          roomOrder: [...roomOrder, newRoom.id]
        });
      },
      
      // 更新房間資訊
      updateRoom: (roomId, updates) => {
        const { rooms } = get();
        const updatedRooms = rooms.map(room => 
          room.id === roomId 
            ? { ...room, ...updates }
            : room
        );
        set({ rooms: updatedRooms });
      },

      // 刪除房間
      deleteRoom: (roomId) => {
        const { rooms, devices, roomOrder, deviceOrder } = get();
        
        // 清除設備的房間關聯
        const updatedDevices = { ...devices };
        Object.values(updatedDevices).forEach(device => {
          if (device.roomId === roomId) {
            device.roomId = undefined;
          }
        });

        // 移除房間的設備順序
        const updatedDeviceOrder = { ...deviceOrder };
        delete updatedDeviceOrder[roomId];

        set({
          rooms: rooms.filter(r => r.id !== roomId),
          roomOrder: roomOrder.filter(id => id !== roomId),
          devices: updatedDevices,
          deviceOrder: updatedDeviceOrder
        });
      },

      // 更新房間順序
      updateRoomOrder: (roomIds) => {
        set({ roomOrder: roomIds });
      },

      // 更新設備順序
      updateDeviceOrder: (roomId, deviceSns) => {
        const { deviceOrder } = get();
        set({
          deviceOrder: {
            ...deviceOrder,
            [roomId]: deviceSns
          }
        });
      },
      
      // 更新設備名稱
      updateDeviceName: (deviceSn, name) => {
        const { devices, customDeviceNames } = get();
        const device = devices[deviceSn];
        if (!device) return;
        
        // 更新設備名稱
        const updatedDevices = {
          ...devices,
          [deviceSn]: { ...device, name }
        };
        
        // 更新自訂名稱記錄
        const updatedCustomNames = {
          ...customDeviceNames,
          [deviceSn]: name
        };
        
        set({
          devices: updatedDevices,
          customDeviceNames: updatedCustomNames
        });
      },
      
      // 創建設備群組
      createDeviceGroup: (name, deviceIds, roomId) => {
        const { devices, deviceGroups } = get();
        
        // 確保所有設備都是相同類型
        const deviceTypes = deviceIds.map(id => devices[id]?.type).filter(Boolean);
        
        if (deviceTypes.length === 0 || !deviceTypes.every(type => type === deviceTypes[0])) {
          console.error('Cannot create group: devices must be of the same type');
          return;
        }
        
        const newGroup: DeviceGroup = {
          id: `group-${Date.now()}`,
          name,
          type: deviceTypes[0],
          deviceIds,
          roomId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        set({ deviceGroups: [...deviceGroups, newGroup] });
      },
      
      // 添加設備到群組
      addDeviceToGroup: (groupId, deviceId) => {
        const { deviceGroups, devices } = get();
        const group = deviceGroups.find(g => g.id === groupId);
        const device = devices[deviceId];
        
        if (!group || !device) return;
        
        // 確保設備類型匹配
        if (device.type !== group.type) {
          console.error('Cannot add device: type mismatch');
          return;
        }
        
        // 確保設備不在其他群組中
        const inOtherGroup = deviceGroups.some(g => 
          g.id !== groupId && g.deviceIds.includes(deviceId)
        );
        if (inOtherGroup) {
          console.error('Device is already in another group');
          return;
        }
        
        const updatedGroups = deviceGroups.map(g =>
          g.id === groupId
            ? { ...g, deviceIds: [...g.deviceIds, deviceId], updatedAt: Date.now() }
            : g
        );
        
        set({ deviceGroups: updatedGroups });
      },
      
      // 從群組中移除設備
      removeDeviceFromGroup: (groupId, deviceId) => {
        const { deviceGroups } = get();
        const group = deviceGroups.find(g => g.id === groupId);
        
        if (!group) return;
        
        const updatedDeviceIds = group.deviceIds.filter(id => id !== deviceId);
        
        // 如果群組只剩一個設備，解散群組
        if (updatedDeviceIds.length <= 1) {
          set({ deviceGroups: deviceGroups.filter(g => g.id !== groupId) });
        } else {
          const updatedGroups = deviceGroups.map(g =>
            g.id === groupId
              ? { ...g, deviceIds: updatedDeviceIds, updatedAt: Date.now() }
              : g
          );
          set({ deviceGroups: updatedGroups });
        }
      },
      
      // 解散群組
      dissolveGroup: (groupId) => {
        const { deviceGroups } = get();
        set({ deviceGroups: deviceGroups.filter(g => g.id !== groupId) });
      },
      
      // 更新群組名稱
      updateGroupName: (groupId, name) => {
        const { deviceGroups } = get();
        const updatedGroups = deviceGroups.map(g =>
          g.id === groupId
            ? { ...g, name, updatedAt: Date.now() }
            : g
        );
        set({ deviceGroups: updatedGroups });
      },
      
      // 開關群組內所有設備
      toggleGroup: async (groupId) => {
        const { deviceGroups, devices, api } = get();
        const group = deviceGroups.find(g => g.id === groupId);
        
        if (!group || !api) return;
        
        // 獲取群組內所有設備
        const groupDevices = group.deviceIds
          .map(id => devices[id])
          .filter(Boolean);
        
        if (groupDevices.length === 0) return;
        
        // 確定目標狀態（如果有任何設備是開的，就全部關閉；否則全部開啟）
        const anyOn = groupDevices.some(d => d.state?.power);
        const targetState = !anyOn;
        
        try {
          // 先更新本地狀態，讓UI立即響應
          set((state) => ({
            devices: {
              ...state.devices,
              ...Object.fromEntries(
                groupDevices.map(device => [
                  device.sn,
                  {
                    ...device,
                    state: {
                      ...device.state,
                      power: targetState
                    }
                  }
                ])
              )
            }
          }));
          
          // 使用 Promise.all 同時發送所有命令，確保同步控制
          const commands = groupDevices.map(device => {
            // 獲取正確的 iotDev
            let iotDev = device.iotDevs?.[0] || 'main_controller';
            if (device.type === 'light' && device.iotDevs?.includes('Light')) {
              iotDev = 'Light';
            } else if (device.type === 'outlet' && device.iotDevs?.find((dev: string) => dev.startsWith('OUTLET'))) {
              iotDev = device.iotDevs.find((dev: string) => dev.startsWith('OUTLET')) || 'OUTLET1';
            }
            
            // 根據設備類型構建正確的命令
            let command;
            if (device.type === 'switch' && device.toggles && device.toggles.length > 0) {
              // 對於開關，使用 SetToggles
              const switchName = device.toggles[0];
              command = {
                command: 'SetToggles',
                params: {
                  updateToggleSettings: {
                    [switchName]: targetState
                  }
                }
              };
            } else {
              // 其他設備使用 OnOff
              command = {
                command: 'OnOff',
                params: { on: targetState }
              };
            }
            
            // 使用新的 API 方法
            if (command.command === 'OnOff') {
              if (targetState) {
                return api.turnOnDevice(device.sn, iotDev);
              } else {
                return api.turnOffDevice(device.sn, iotDev);
              }
            } else if (command.command === 'SetToggles') {
              return api.controlDevice(device.sn, iotDev, command.command, command.params);
            } else {
              return api.controlDevice(device.sn, iotDev, command.command, command.params);
            }
          });
          
          await Promise.all(commands);
          
          // 延遲後重新獲取設備狀態以確保與服務器同步
          setTimeout(() => {
            const { currentGroupId } = get();
            if (currentGroupId) {
              get().refreshDeviceStates(currentGroupId);
            }
          }, 1500);
          
        } catch (error) {
          console.error('Failed to control group:', error);
          set({ error: 'Failed to control group devices' });
          // 如果失敗，重新獲取狀態以恢復真實狀態
          const { currentGroupId } = get();
          if (currentGroupId) {
            get().refreshDeviceStates(currentGroupId);
          }
        }
      },

      // 清除錯誤
      clearError: () => set({ error: null })
    }),
    {
      name: 'smart-home-storage',
      partialize: (state) => ({
        apiConfig: state.apiConfig,
        rooms: state.rooms,
        roomOrder: state.roomOrder,
        deviceOrder: state.deviceOrder,
        currentGroupId: state.currentGroupId,
        // 直接保存 deviceRoomAssignments 狀態
        deviceRoomAssignments: state.deviceRoomAssignments,
        // 保存自訂設備名稱
        customDeviceNames: state.customDeviceNames,
        // 保存設備群組
        deviceGroups: state.deviceGroups
      })
    }
  )
);

// 輔助函數：偵測設備類型
function detectDeviceType(device: any): Device['type'] {
  // 先從 models 中判斷設備類型
  if (device.models) {
    const modelKeys = Object.keys(device.models);
    
    // 檢查主要設備類型
    for (const key of modelKeys) {
      const model = device.models[key];
      if (!model.type) continue;
      
      switch (model.type) {
        case 'LIGHT':
          return 'light';
        case 'OUTLET':
          return 'outlet';
        case 'SENSOR':
        case 'ULTRON_SENSOR':
          return 'sensor';
        case 'CAMERA':
          return 'camera';
        case 'LOCK':
          return 'lock';
        case 'FAN':
          return 'fan';
        case 'SWITCH':
          return 'switch';
        case 'THERMOSTAT':
        case 'AC':
          return 'airConditioner';
        case 'DEHUMIDIFIER':
          return 'dehumidifier'; // 除濕機
        case 'GATEWAY':
        case 'BRIDGE':
          return 'gateway';
      }
    }
  }
  
  // 如果沒有 models，則從名稱判斷
  const name = device.displayName?.toLowerCase() || device.bundleName?.toLowerCase() || '';
  
  if (name.includes('燈') || name.includes('light')) return 'light';
  if (name.includes('冷氣') || name.includes('空調') || name.includes('ac')) return 'airConditioner';
  if (name.includes('開關') || name.includes('switch')) return 'switch';
  if (name.includes('風扇') || name.includes('fan')) return 'fan';
  if (name.includes('感應') || name.includes('sensor') || name.includes('溫') || name.includes('濕度')) return 'sensor';
  if (name.includes('攝影') || name.includes('camera')) return 'camera';
  if (name.includes('門鎖') || name.includes('lock') || name.includes('門')) return 'lock';
  if (name.includes('插座') || name.includes('outlet') || name.includes('電源')) return 'outlet';
  if (name.includes('bridge') || name.includes('gateway') || name.includes('網關')) return 'gateway';
  
  return 'other';
}

export default useSmartHomeStore;