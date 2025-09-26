import type { ChargePointConfiguration, DeviceSettings, OcppConfiguration } from '@/types/ocpp'
import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice, nanoid } from '@reduxjs/toolkit'

export type Protocol = 'ocpp1.6' | 'ocpp2.0.1'

export interface ConnectionConfig {
  csmsUrl: string
  cpId: string
  protocol: Protocol
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export interface ChargePointRuntime {
  connectorId: number
  idTag: string
  transactionId?: number
}

export interface ChargePoint {
  id: string
  label: string
  config: ConnectionConfig
  status: ConnectionStatus
  paused: boolean
  runtime: ChargePointRuntime
  chargePointConfig?: ChargePointConfiguration
}

interface OcppState {
  items: Record<string, ChargePoint>
  order: string[]
  selectedId?: string
}

const initialState: OcppState = {
  items: {},
  order: [],
  selectedId: undefined,
}

const ocppSlice = createSlice({
  name: 'ocpp',
  initialState,
  reducers: {
    addChargePoint: {
      prepare(partial?: Partial<ChargePoint>) {
        const id = nanoid(8)
        const defaultDeviceSettings: DeviceSettings = {
          deviceName: `Simülatör-${id}`,
          model: 'EVSE-Sim v1',
          acdc: 'AC',
          connectors: 2,
          maxPowerKw: 22,
          nominalVoltageV: 400,
          maxCurrentA: 32,
          energyKwh: 0,
          socketType: ['Type2', 'Type2'],
          cableLock: [true, true],
          hasRfid: true,
          hasDisplay: true,
          timezone: 'Europe/Istanbul',
          phaseRotation: 'RST',
          pricePerKwh: 0.25
        }
        const defaultOcppConfig: OcppConfiguration = {
          HeartbeatInterval: 60,
          ConnectionTimeOut: 120,
          MeterValueSampleInterval: 15,
          ClockAlignedDataInterval: 300,
          MeterValuesSampledData: 'Energy.Active.Import.Register,Voltage,Current',
          MeterValuesAlignedData: 'Energy.Active.Import.Register',
          StopTxnSampledData: 'Power.Active.Import,Voltage',
          StopTxnAlignedData: 'Energy.Active.Import.Register',
          AuthorizeRemoteTxRequests: true,
          LocalAuthorizeOffline: true,
          LocalPreAuthorize: false,
          AuthorizationCacheEnabled: true,
          AllowOfflineTxForUnknownId: false,
          StopTransactionOnEVSideDisconnect: true,
          StopTransactionOnInvalidId: true,
          MaxEnergyOnInvalidId: 0,
          MinimumStatusDuration: 0,
          NumberOfConnectors: 2,
          TransactionMessageAttempts: 3,
          TransactionMessageRetryInterval: 10,
          UnlockConnectorOnEVSideDisconnect: true,
          BlinkRepeat: 3,
          LightIntensity: 50,
          ConnectorPhaseRotation: '1.RST,2.RST',
          GetConfigurationMaxKeys: 50,
          SupportedFeatureProfiles: 'Core,RemoteTrigger,Firmware,Reservation,LocalAuthList,MeterValues',
          Availability: ['Operative', 'Operative'],
          IdTagWhitelist: ['04A1B23C', '7B3C9F22'],
          WsSecure: false,
          'BootNotification.intervalHint': 60,
          FirmwareVersion: '1.0.0-web',
          ChargeProfileEnabled: false,
          ReservationEnabled: false
        }
        return {
          payload: {
            id,
            label: partial?.label || `CP ${id}`,
            config: partial?.config || {
              csmsUrl: 'ws://localhost:9000/ocpp/',
              cpId: `SIM_${id}`,
              protocol: 'ocpp1.6',
            },
            status: 'disconnected' as ConnectionStatus,
            paused: false,
            runtime: partial?.runtime || { connectorId: 1, idTag: 'DEMO1234' },
            chargePointConfig: partial?.chargePointConfig || {
              deviceSettings: defaultDeviceSettings,
              ocppConfig: defaultOcppConfig
            },
          } as ChargePoint,
        }
      },
      reducer(state, action: PayloadAction<ChargePoint>) {
        state.items[action.payload.id] = action.payload
        state.order.unshift(action.payload.id)
        state.selectedId = action.payload.id
      },
    },
    renameChargePoint(state, action: PayloadAction<{ id: string; label: string }>) {
      const cp = state.items[action.payload.id]
      if (cp) cp.label = action.payload.label
    },
    removeChargePoint(state, action: PayloadAction<string>) {
      delete state.items[action.payload]
      state.order = state.order.filter((x) => x !== action.payload)
      if (state.selectedId === action.payload) state.selectedId = state.order[0]
    },
    selectChargePoint(state, action: PayloadAction<string | undefined>) {
      state.selectedId = action.payload
    },
    updateConfig(
      state,
      action: PayloadAction<{ id: string; patch: Partial<ConnectionConfig> }>
    ) {
      const cp = state.items[action.payload.id]
      if (cp) cp.config = { ...cp.config, ...action.payload.patch }
    },
    setStatus(state, action: PayloadAction<{ id: string; status: ConnectionStatus }>) {
      const cp = state.items[action.payload.id]
      if (cp) cp.status = action.payload.status
    },
    setPaused(state, action: PayloadAction<{ id: string; paused: boolean }>) {
      const cp = state.items[action.payload.id]
      if (cp) cp.paused = action.payload.paused
    },
    setConnectorId(state, action: PayloadAction<{ id: string; connectorId: number }>) {
      const cp = state.items[action.payload.id]
      if (cp) cp.runtime = { ...(cp.runtime || { idTag: 'DEMO1234', connectorId: 1 }), connectorId: action.payload.connectorId }
    },
    setIdTag(state, action: PayloadAction<{ id: string; idTag: string }>) {
      const cp = state.items[action.payload.id]
      if (cp) cp.runtime = { ...(cp.runtime || { connectorId: 1 }), idTag: action.payload.idTag }
    },
    setTransactionId(state, action: PayloadAction<{ id: string; transactionId?: number }>) {
      const cp = state.items[action.payload.id]
      if (cp) cp.runtime = { ...(cp.runtime || { connectorId: 1, idTag: 'DEMO1234' }), transactionId: action.payload.transactionId }
    },
    updateDeviceSettings(state, action: PayloadAction<{ id: string; deviceSettings: Partial<DeviceSettings> }>) {
      const cp = state.items[action.payload.id]
      if (cp && cp.chargePointConfig) {
        cp.chargePointConfig.deviceSettings = { ...cp.chargePointConfig.deviceSettings, ...action.payload.deviceSettings }
      }
    },
    updateOcppConfiguration(state, action: PayloadAction<{ id: string; ocppConfig: Partial<OcppConfiguration> }>) {
      const cp = state.items[action.payload.id]
      if (cp && cp.chargePointConfig) {
        cp.chargePointConfig.ocppConfig = { ...cp.chargePointConfig.ocppConfig, ...action.payload.ocppConfig }
      }
    },
  },
})

export const {
  addChargePoint,
  removeChargePoint,
  selectChargePoint,
  updateConfig,
  setStatus,
  setPaused,
  renameChargePoint,
  setConnectorId,
  setIdTag,
  setTransactionId,
  updateDeviceSettings,
  updateOcppConfiguration,
} = ocppSlice.actions

export default ocppSlice.reducer
