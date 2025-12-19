export const CALL = 2;
export const CALLRESULT = 3;
export const CALLERROR = 4;

export type OCPPFrameType = typeof CALL | typeof CALLRESULT | typeof CALLERROR;

export interface OCPPFrame {
  ts: string;
  dir: 'in' | 'out';
  type: 'CALL' | 'CALLRESULT' | 'CALLERROR' | 'OPEN' | 'CLOSE' | 'ERROR' | 'PARSE_ERR';
  action: string;
  id: string;
  raw: unknown[];
}

export interface ConnectionConfig {
  csmsUrl: string;
  cpId: string;
  protocol: 'ocpp1.6' | 'ocpp2.0.1';
  user: string;
  password: string;
  vendor: string;
  model: string;
  activeConnector: number;
}

export interface BatteryState {
  soc: number;
  power: number;
  current: number;
  energy: number;
  meterStart: number;
  energyWh: number;
}

export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  action: string;
}

export type ConnectionStatus = 'disconnected' | 'connected' | 'charging' | 'idle';

export interface Connector {
  id: number;
  status: 'Available' | 'Preparing' | 'Charging' | 'SuspendedEVSE' | 'SuspendedEV' | 'Finishing' | 'Reserved' | 'Unavailable' | 'Faulted';
  idTag?: string;
  transactionId?: number;
  errorCode?: string;
  info?: string;
  timestamp?: string;
  vendorId?: string;
  vendorErrorCode?: string;
}

export interface NetworkTrafficFilter {
  dir: 'all' | 'in' | 'out';
  kind: 'all' | 'CALL' | 'CALLRESULT' | 'CALLERROR';
  q: string;
}

export interface DeviceSettings {
  deviceName: string;
  model: string;
  acdc: 'AC' | 'DC';
  connectors: number;
  maxPowerKw: number;
  nominalVoltageV: number;
  maxCurrentA: number;
  energyKwh: number;
  socketType: string[];
  cableLock: boolean[];
  hasRfid: boolean;
  hasDisplay: boolean;
  timezone: string;
  phaseRotation: string;
  pricePerKwh: number;
  batteryStartPercent: number;
}

export interface OcppConfiguration {
  HeartbeatInterval: number;
  ConnectionTimeOut: number;
  MeterValueSampleInterval: number;
  ClockAlignedDataInterval: number;
  MeterValuesSampledData: string;
  MeterValuesAlignedData: string;
  StopTxnSampledData: string;
  StopTxnAlignedData: string;
  AuthorizeRemoteTxRequests: boolean;
  LocalAuthorizeOffline: boolean;
  LocalPreAuthorize: boolean;
  AuthorizationCacheEnabled: boolean;
  AllowOfflineTxForUnknownId: boolean;
  StopTransactionOnEVSideDisconnect: boolean;
  StopTransactionOnInvalidId: boolean;
  MaxEnergyOnInvalidId: number;
  MinimumStatusDuration: number;
  NumberOfConnectors: number;
  TransactionMessageAttempts: number;
  TransactionMessageRetryInterval: number;
  UnlockConnectorOnEVSideDisconnect: boolean;
  BlinkRepeat: number;
  LightIntensity: number;
  ConnectorPhaseRotation: string;
  GetConfigurationMaxKeys: number;
  SupportedFeatureProfiles: string;
  Availability: string[];
  IdTagWhitelist: string[];
  WsSecure: boolean;
  'BootNotification.intervalHint': number;
  FirmwareVersion: string;
  ChargeProfileEnabled: boolean;
  ReservationEnabled: boolean;
}

export interface ChargePointConfiguration {
  deviceSettings: DeviceSettings;
  ocppConfig: OcppConfiguration;
}
