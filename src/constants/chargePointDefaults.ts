import type { DeviceSettings, OcppConfiguration } from '@/types/ocpp'

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export const DEFAULT_DEVICE_SETTINGS: DeviceSettings = {
  deviceName: 'Simülatör-CP',
  model: 'EVSE-Sim v1',
  acdc: 'AC',
  connectors: 1,
  maxPowerKw: 22,
  nominalVoltageV: 400,
  maxCurrentA: 32,
  energyKwh: 0,
  socketType: ['Type2'],
  cableLock: [true],
  hasRfid: true,
  hasDisplay: true,
  timezone: 'Europe/Istanbul',
  phaseRotation: 'RST',
  pricePerKwh: 0.25,
  batteryStartPercent: 30,
}

export const DEFAULT_OCPP_CONFIGURATION: OcppConfiguration = {
  HeartbeatInterval: 60,
  ConnectionTimeOut: 120,
  MeterValueSampleInterval: 5,
  ClockAlignedDataInterval: 300,
  MeterValuesSampledData: 'Energy.Active.Import.Register,Power.Active.Import,Current.Offered,Voltage,SoC',
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
  NumberOfConnectors: 1,
  TransactionMessageAttempts: 3,
  TransactionMessageRetryInterval: 10,
  UnlockConnectorOnEVSideDisconnect: true,
  BlinkRepeat: 3,
  LightIntensity: 50,
  ConnectorPhaseRotation: '1.RST',
  GetConfigurationMaxKeys: 50,
  SupportedFeatureProfiles: 'Core,RemoteTrigger,Firmware,Reservation,LocalAuthList,MeterValues',
  Availability: ['Operative'],
  IdTagWhitelist: ['04A1B23C', '7B3C9F22'],
  WsSecure: false,
  'BootNotification.intervalHint': 60,
  FirmwareVersion: '1.0.0-web',
  ChargeProfileEnabled: false,
  ReservationEnabled: false,
}

function firstOrFallback<T>(list: T[] | undefined, fallback: T): T {
  if (Array.isArray(list) && list.length > 0 && list[0] !== undefined) {
    return list[0]
  }
  return fallback
}

const toNumber = (value: unknown, fallback: number) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

export function normalizeDeviceSettings(
  partial?: Partial<DeviceSettings>
): DeviceSettings {
  const acdcNormalized = partial?.acdc === 'DC' ? 'DC' : 'AC'

  const merged: DeviceSettings = {
    ...DEFAULT_DEVICE_SETTINGS,
    ...(partial || {}),
    connectors: 1,
    acdc: acdcNormalized,
  }

  const socket = firstOrFallback(partial?.socketType ?? merged.socketType, DEFAULT_DEVICE_SETTINGS.socketType[0])
  const cable = firstOrFallback(partial?.cableLock ?? merged.cableLock, DEFAULT_DEVICE_SETTINGS.cableLock[0])

  const batteryStart = clamp(
    Number.isFinite(partial?.batteryStartPercent)
      ? (partial?.batteryStartPercent as number)
      : merged.batteryStartPercent,
    0,
    100
  )

  return {
    ...merged,
    acdc: acdcNormalized,
    socketType: [socket],
    cableLock: [Boolean(cable)],
    batteryStartPercent: batteryStart,
  }
}

export function normalizeOcppConfiguration(
  partial?: Partial<OcppConfiguration>
): OcppConfiguration {
  const merged: OcppConfiguration = {
    ...DEFAULT_OCPP_CONFIGURATION,
    ...(partial || {}),
    NumberOfConnectors: 1,
  }

  const availabilityList = Array.isArray(partial?.Availability)
    ? partial?.Availability
    : merged.Availability

  let sampledData = String(merged.MeterValuesSampledData || DEFAULT_OCPP_CONFIGURATION.MeterValuesSampledData)
  const requiredMeasurands = ['Energy.Active.Import.Register', 'Power.Active.Import', 'Current.Offered', 'Voltage', 'SoC']
  const existingMeasurands = sampledData.split(',').map(s => s.trim()).filter(Boolean)
  const missingMeasurands = requiredMeasurands.filter(m => !existingMeasurands.includes(m))
  if (missingMeasurands.length > 0) {
    sampledData = [...existingMeasurands, ...missingMeasurands].join(',')
  }

  const normalized: OcppConfiguration = {
    ...merged,
    MeterValuesSampledData: sampledData,
    Availability: [availabilityList && availabilityList[0] ? availabilityList[0] : 'Operative'],
    HeartbeatInterval: toNumber(merged.HeartbeatInterval, DEFAULT_OCPP_CONFIGURATION.HeartbeatInterval),
    ConnectionTimeOut: toNumber(merged.ConnectionTimeOut, DEFAULT_OCPP_CONFIGURATION.ConnectionTimeOut),
    MeterValueSampleInterval: toNumber(merged.MeterValueSampleInterval, DEFAULT_OCPP_CONFIGURATION.MeterValueSampleInterval),
    ClockAlignedDataInterval: toNumber(merged.ClockAlignedDataInterval, DEFAULT_OCPP_CONFIGURATION.ClockAlignedDataInterval),
    MaxEnergyOnInvalidId: toNumber(merged.MaxEnergyOnInvalidId, DEFAULT_OCPP_CONFIGURATION.MaxEnergyOnInvalidId),
    MinimumStatusDuration: toNumber(merged.MinimumStatusDuration, DEFAULT_OCPP_CONFIGURATION.MinimumStatusDuration),
    NumberOfConnectors: 1,
    TransactionMessageAttempts: toNumber(merged.TransactionMessageAttempts, DEFAULT_OCPP_CONFIGURATION.TransactionMessageAttempts),
    TransactionMessageRetryInterval: toNumber(merged.TransactionMessageRetryInterval, DEFAULT_OCPP_CONFIGURATION.TransactionMessageRetryInterval),
    BlinkRepeat: toNumber(merged.BlinkRepeat, DEFAULT_OCPP_CONFIGURATION.BlinkRepeat),
    LightIntensity: toNumber(merged.LightIntensity, DEFAULT_OCPP_CONFIGURATION.LightIntensity),
    GetConfigurationMaxKeys: toNumber(merged.GetConfigurationMaxKeys, DEFAULT_OCPP_CONFIGURATION.GetConfigurationMaxKeys),
    'BootNotification.intervalHint': toNumber(
      merged['BootNotification.intervalHint'],
      DEFAULT_OCPP_CONFIGURATION['BootNotification.intervalHint']
    ),
  }

  return normalized
}
