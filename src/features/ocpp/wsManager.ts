// @ts-nocheck
import { normalizeDeviceSettings, normalizeOcppConfiguration } from '@/constants/chargePointDefaults';
import { handleInboundFrame } from '@/services/inboundDispatcher';
import { ensureMeterForCp, getMeterForCp } from '@/services/meterModel';
import { store } from '@/store/store';
import { QueryClient } from '@tanstack/react-query';
import {
  createOCPPCall,
  createOCPPError,
  createOCPPResult,
  parseOCPPFrame,
  uuidv4,
} from '../../utils/ocpp';
import { setTransactionId } from './ocppSlice';
import {
  loadDeviceSettings,
  loadOcppConfiguration,
  saveFrames,
  type Frame as PersistedFrame,
} from './storage';

type Pending = {
  resolve: (v: any) => void;
  reject: (e: any) => void;
  action: string;
  payload: any;
};

interface Client {
  ws: WebSocket;
  pending: Map<string, Pending>;
}

const clients = new Map<string, Client>();
const meterIntervals = new Map<string, any>();
const heartbeatIntervals = new Map<string, any>();
const bootNotificationIntervals = new Map<string, any>();

export function connectWs(
  id: string,
  url: string,
  protocol: string,
  queryClient: QueryClient,
  onOpen?: () => void,
  onClose?: () => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket(url, [protocol]);
      const client: Client = { ws, pending: new Map() };
      clients.set(id, client);

      ws.onopen = () => {
        // remember queryClient for this id so we can push frames from helpers
        clientsQuery.set(id, queryClient);
        onOpen?.();
        pushFrame(queryClient, id, {
          ts: new Date().toISOString(),
          dir: 'out',
          type: 'OPEN',
          action: url,
          id: protocol,
          raw: ['OPEN', url, protocol],
        });
        // Ensure a meter instance exists and start ticking
        try {
          const state = store.getState();
          const cp = state.ocpp.items[id];

          const storedDeviceSettings = loadDeviceSettings(id);
          const deviceSettings = normalizeDeviceSettings({
            deviceName:
              storedDeviceSettings?.deviceName ||
              cp?.chargePointConfig?.deviceSettings?.deviceName ||
              `Simülatör-${id}`,
            ...(cp?.chargePointConfig?.deviceSettings || {}),
            ...(storedDeviceSettings || {}),
          });

          const storedOcppConfig = loadOcppConfiguration(id);
          const ocppConfig = normalizeOcppConfiguration({
            ...(cp?.chargePointConfig?.ocppConfig || {}),
            ...(storedOcppConfig || {}),
          });

          const meter = ensureMeterForCp(
            id,
            {
              nowISO: () => new Date().toISOString(),
              sendCall: (action: string, payload: any) => callAction(id, action, payload),
              getActiveConnectorId: () => store.getState().ocpp.items[id]?.runtime?.connectorId,
              getTransactionId: () => store.getState().ocpp.items[id]?.runtime?.transactionId,
              getMeterValuesMeasurands: () => {
                const sampledData = String(
                  ocppConfig.MeterValuesSampledData ||
                    'Energy.Active.Import.Register,Power.Active.Import,Current.Offered,Voltage,SoC'
                );
                return sampledData.split(',').map((s) => s.trim()).filter(Boolean);
              },
              getSoCMode: () => (deviceSettings.acdc === 'DC' ? 'outlet' : 'ev'),
            } as any,
            {
              stationMaxKW: deviceSettings.maxPowerKw || 22,
              packVoltageMinV: Math.max(100, (deviceSettings.nominalVoltageV || 400) * 0.8),
              packVoltageMaxV: Math.min(1000, (deviceSettings.nominalVoltageV || 400) * 1.2),
              socStartPct: deviceSettings.batteryStartPercent,
              samplePeriodSec: Math.max(1, ocppConfig.MeterValueSampleInterval || 5),
              noiseKW: 0.5,
              virtualCapacityKWh: Math.max(10, deviceSettings.energyKwh || 60),
              offeredCurrentA: deviceSettings.maxCurrentA || 32,
            }
          );
          // Refresh interval if present
          const prev = meterIntervals.get(id);
          if (prev) clearInterval(prev);
          const handle = setInterval(() => {
            meter.tick().catch(() => {});
          }, Math.max(1, ocppConfig.MeterValueSampleInterval || 5) * 1000);
          meterIntervals.set(id, handle);

          const prevHeartbeat = heartbeatIntervals.get(id);
          if (prevHeartbeat) clearInterval(prevHeartbeat);
          const heartbeatInterval = Math.max(
            10,
            ocppConfig.HeartbeatInterval || 60
          );
          const heartbeatHandle = setInterval(() => {
            try {
              callAction(id, 'Heartbeat', {}).catch(() => {});
            } catch {}
          }, heartbeatInterval * 1000);
          heartbeatIntervals.set(id, heartbeatHandle);

          const prevBootNotification = bootNotificationIntervals.get(id);
          if (prevBootNotification) clearInterval(prevBootNotification);
          const bootNotificationInterval = Math.max(
            30,
            ocppConfig['BootNotification.intervalHint'] || 60
          );
          const sendBootNotification = () => {
            try {
              const state = store.getState();
              const cp = state.ocpp.items[id];
              const storedDeviceSettings = loadDeviceSettings(id);
              const deviceSettings = normalizeDeviceSettings({
                deviceName:
                  storedDeviceSettings?.deviceName ||
                  cp?.chargePointConfig?.deviceSettings?.deviceName ||
                  `Simülatör-${id}`,
                ...(cp?.chargePointConfig?.deviceSettings || {}),
                ...(storedDeviceSettings || {}),
              });
              callAction(id, 'BootNotification', {
                chargePointVendor: 'EVS-Sim',
                chargePointModel: deviceSettings.deviceName || 'Browser-CP',
              }).catch(() => {});
            } catch {}
          };
          sendBootNotification();
          const bootNotificationHandle = setInterval(
            sendBootNotification,
            bootNotificationInterval * 1000
          );
          bootNotificationIntervals.set(id, bootNotificationHandle);
        } catch {}
        resolve();
      };

      ws.onclose = (ev) => {
        onClose?.();
        pushFrame(queryClient, id, {
          ts: new Date().toISOString(),
          dir: 'in',
          type: 'CLOSE',
          action: String(ev.code),
          id: ev.reason || '',
          raw: ['CLOSE', ev.code, ev.reason],
        });
        clients.delete(id);
        clientsQuery.delete(id);
        const h = meterIntervals.get(id)
        if (h) {
          clearInterval(h)
          meterIntervals.delete(id)
        }
        const hb = heartbeatIntervals.get(id);
        if (hb) {
          clearInterval(hb);
          heartbeatIntervals.delete(id);
        }
        const bn = bootNotificationIntervals.get(id);
        if (bn) {
          clearInterval(bn);
          bootNotificationIntervals.delete(id);
        }
      };

      ws.onerror = (e) => {
        pushFrame(queryClient, id, {
          ts: new Date().toISOString(),
          dir: 'in',
          type: 'ERROR',
          action: String(e),
          id: '',
          raw: ['ERROR', String(e)],
        });
      };

      ws.onmessage = async (ev) => {
        try {
          const arr = JSON.parse(ev.data);
          const meta = parseOCPPFrame(arr);
          pushFrame(queryClient, id, {
            ts: new Date().toISOString(),
            dir: 'in',
            type: (meta.type || 'CALL') as any,
            action: meta.action,
            id: meta.id,
            raw: arr,
          });

          // resolve/reject pending by id
          if (meta.type === 'CALLRESULT') {
            const p = client.pending.get(meta.id);
            if (p) {
              client.pending.delete(meta.id);
              // Hook Start/Stop transaction for meter lifecycle
              try {
                if (p.action === 'StartTransaction') {
                  const body = arr[2] || {};
                  const txid =
                    typeof body?.transactionId === 'number'
                      ? body.transactionId
                      : Math.floor(Math.random() * 100000);
                  // Update app runtime (idempotent)
                  try { store.dispatch(setTransactionId({ id, transactionId: txid })); } catch {}
                  const conn = Number(p.payload?.connectorId) || (store.getState().ocpp.items[id]?.runtime?.connectorId ?? 1)
                  const meterStart = Number(p.payload?.meterStart) || 0
                  console.log('Starting meter for transaction:', { txid, conn, meterStart, cpId: id })
                  const meter = getMeterForCp(id)
                  if (meter) {
                    const currentDeviceSettings = normalizeDeviceSettings({
                      ...(store.getState().ocpp.items[id]?.chargePointConfig?.deviceSettings || {}),
                      ...(loadDeviceSettings(id) || {}),
                    })
                    meter.start(txid, conn, meterStart, currentDeviceSettings.batteryStartPercent)
                    console.log('Meter started successfully')
                  } else {
                    console.log('No meter found for CP:', id)
                  }
                } else if (p.action === 'StopTransaction') {
                  getMeterForCp(id)?.stop()
                }
              } catch {}
              p.resolve(arr[2]);
            }
          } else if (meta.type === 'CALLERROR') {
            const p = client.pending.get(meta.id);
            if (p) {
              client.pending.delete(meta.id);
              p.reject(new Error(`${arr[2]}: ${arr[3]}`));
            }
          } else if (meta.type === 'CALL' || arr[0] === 2) {
            // Handle inbound CALL using inbound dispatcher
            try {
              const reply = await handleInboundFrame(arr, {
                nowISO: () => new Date().toISOString(),
                sendCall: (action: string, payload: any) =>
                  callAction(id, action, payload),
                getActiveConnectorId: () =>
                  store.getState().ocpp.items[id]?.runtime?.activeConnectorId || 1,
                getTransactionId: () =>
                  store.getState().ocpp.items[id]?.runtime?.connectors?.find(c => c.id === (store.getState().ocpp.items[id]?.runtime?.activeConnectorId || 1))?.transactionId,
                getBattery: () => {
                  try {
                    const activeConn = store.getState().ocpp.items[id]?.runtime?.activeConnectorId || 1
                    const st = getMeterForCp(id)?.getState(activeConn)
                    if (!st) return undefined
                    return { soc: st.socPct, currentA: st.currentA, energyWh: st.energyWh }
                  } catch {
                    return undefined
                  }
                },
                getConfig: (keys?: string[]) => {
                  const state = store.getState();
                  const cp = state.ocpp.items[id];
                  const ocppConfig = normalizeOcppConfiguration({
                    ...(cp?.chargePointConfig?.ocppConfig || {}),
                    ...(loadOcppConfiguration(id) || {}),
                  });
                  const deviceSettings = normalizeDeviceSettings({
                    ...(cp?.chargePointConfig?.deviceSettings || {}),
                    ...(loadDeviceSettings(id) || {}),
                  });
                  
                  const allConfig = [
                    { key: 'HeartbeatInterval', readonly: false, value: String(ocppConfig.HeartbeatInterval) },
                    { key: 'ConnectionTimeOut', readonly: false, value: String(ocppConfig.ConnectionTimeOut) },
                    { key: 'MeterValueSampleInterval', readonly: false, value: String(ocppConfig.MeterValueSampleInterval) },
                    { key: 'ClockAlignedDataInterval', readonly: false, value: String(ocppConfig.ClockAlignedDataInterval) },
                    { key: 'MeterValuesSampledData', readonly: false, value: String(ocppConfig.MeterValuesSampledData) },
                    { key: 'MeterValuesAlignedData', readonly: false, value: String(ocppConfig.MeterValuesAlignedData) },
                    { key: 'StopTxnSampledData', readonly: false, value: String(ocppConfig.StopTxnSampledData) },
                    { key: 'StopTxnAlignedData', readonly: false, value: String(ocppConfig.StopTxnAlignedData) },
                    { key: 'AuthorizeRemoteTxRequests', readonly: false, value: String(ocppConfig.AuthorizeRemoteTxRequests !== false) },
                    { key: 'LocalAuthorizeOffline', readonly: false, value: String(ocppConfig.LocalAuthorizeOffline !== false) },
                    { key: 'LocalPreAuthorize', readonly: false, value: String(ocppConfig.LocalPreAuthorize === true) },
                    { key: 'AuthorizationCacheEnabled', readonly: false, value: String(ocppConfig.AuthorizationCacheEnabled !== false) },
                    { key: 'AllowOfflineTxForUnknownId', readonly: false, value: String(ocppConfig.AllowOfflineTxForUnknownId === true) },
                    { key: 'StopTransactionOnEVSideDisconnect', readonly: false, value: String(ocppConfig.StopTransactionOnEVSideDisconnect !== false) },
                    { key: 'StopTransactionOnInvalidId', readonly: false, value: String(ocppConfig.StopTransactionOnInvalidId !== false) },
                    { key: 'MaxEnergyOnInvalidId', readonly: false, value: String(ocppConfig.MaxEnergyOnInvalidId) },
                    { key: 'MinimumStatusDuration', readonly: false, value: String(ocppConfig.MinimumStatusDuration) },
                    { key: 'NumberOfConnectors', readonly: true, value: String(deviceSettings.connectors) },
                    { key: 'TransactionMessageAttempts', readonly: false, value: String(ocppConfig.TransactionMessageAttempts) },
                    { key: 'TransactionMessageRetryInterval', readonly: false, value: String(ocppConfig.TransactionMessageRetryInterval) },
                    { key: 'UnlockConnectorOnEVSideDisconnect', readonly: false, value: String(ocppConfig.UnlockConnectorOnEVSideDisconnect !== false) },
                    { key: 'BlinkRepeat', readonly: false, value: String(ocppConfig.BlinkRepeat) },
                    { key: 'LightIntensity', readonly: false, value: String(ocppConfig.LightIntensity) },
                    { key: 'ConnectorPhaseRotation', readonly: false, value: String(ocppConfig.ConnectorPhaseRotation) },
                    { key: 'GetConfigurationMaxKeys', readonly: true, value: String(ocppConfig.GetConfigurationMaxKeys) },
                    { key: 'SupportedFeatureProfiles', readonly: true, value: String(ocppConfig.SupportedFeatureProfiles) },
                    { key: 'WsSecure', readonly: true, value: String(ocppConfig.WsSecure === true) },
                    { key: 'FirmwareVersion', readonly: true, value: String(ocppConfig.FirmwareVersion) },
                    { key: 'ChargeProfileEnabled', readonly: true, value: String(ocppConfig.ChargeProfileEnabled === true) },
                    { key: 'ReservationEnabled', readonly: true, value: String(ocppConfig.ReservationEnabled === true) },
                  ];
                  
                  return {
                    configurationKey: keys?.length 
                      ? allConfig.filter((c) => keys.includes(c.key))
                      : allConfig,
                    unknownKey: keys?.length ? keys.filter((k: string) => !allConfig.some(c => c.key === k)) : [],
                  };
                },
                getMeterValuesMeasurands: () => {
                  const state = store.getState();
                  const cp = state.ocpp.items[id];
                  const ocppConfig = normalizeOcppConfiguration({
                    ...(cp?.chargePointConfig?.ocppConfig || {}),
                    ...(loadOcppConfiguration(id) || {}),
                  });
                  const sampledData = String(ocppConfig.MeterValuesSampledData);
                  return sampledData.split(',').map(s => s.trim()).filter(Boolean);
                },
                getSoCMode: () => {
                  const state = store.getState();
                  const cpCurrent = state.ocpp.items[id];
                  const ds = normalizeDeviceSettings({
                    ...(cpCurrent?.chargePointConfig?.deviceSettings || {}),
                    ...(loadDeviceSettings(id) || {}),
                  });
                  return ds.acdc === 'DC' ? 'outlet' : 'ev';
                },
                // Hooks for remote start/stop flows
                startLocalFlow: async ({ connectorId, idTag }) => {
                  const state = store.getState();
                  const cp = state.ocpp.items[id];
                  const conn = connectorId ?? cp?.runtime?.connectorId ?? 1;
                  const tag = idTag ?? cp?.runtime?.idTag ?? 'DEMO1234';
                  try {
                    await callAction(id, 'Authorize', { idTag: tag });
                  } catch {}
                  await callAction(id, 'StatusNotification', {
                    connectorId: conn,
                    status: 'Preparing',
                    errorCode: 'NoError',
                  });
                  const meterStart = Math.floor(1000 + Math.random() * 1000);
                  const res = await callAction(id, 'StartTransaction', {
                    connectorId: conn,
                    idTag: tag,
                    meterStart,
                    timestamp: new Date().toISOString(),
                  });
                  const txid =
                    typeof res?.transactionId === 'number'
                      ? res.transactionId
                      : Math.floor(Math.random() * 100000);
                  store.dispatch(setTransactionId({ id, transactionId: txid }));
                },
                stopLocalFlow: async ({ transactionId }) => {
                  const state = store.getState();
                  const cp = state.ocpp.items[id];
                  const conn = cp?.runtime?.connectorId ?? 1;
                  const tag = cp?.runtime?.idTag ?? 'DEMO1234';
                  let meterStop = 0
                  try {
                    const m = getMeterForCp(id)
                    await m?.tick()
                    const st = m?.getState()
                    meterStop = Math.floor(Math.max(0, Number(st?.energyWh || 0)))
                  } catch {}
                  await callAction(id, 'StopTransaction', {
                    transactionId,
                    idTag: tag,
                    meterStop,
                    timestamp: new Date().toISOString(),
                    reason: 'Remote',
                  });
                  store.dispatch(
                    setTransactionId({ id, transactionId: undefined })
                  );
                  await callAction(id, 'StatusNotification', {
                    connectorId: conn,
                    status: 'Finishing',
                    errorCode: 'NoError',
                  });
                },
              } as any);
              if (reply) {
                client.ws.send(JSON.stringify(reply));
                // Log outbound reply
                const rmeta = parseOCPPFrame(reply as any);
                pushFrame(queryClient, id, {
                  ts: new Date().toISOString(),
                  dir: 'out',
                  type: (rmeta.type || 'CALLRESULT') as any,
                  action: rmeta.action,
                  id: rmeta.id,
                  raw: reply as any,
                });
              }
            } catch (err) {
              // If dispatcher threw, try to send a generic error
              try {
                const mid = Array.isArray(arr) ? arr[1] : '';
                const errFrame = createOCPPError(
                  mid,
                  'InternalError',
                  String(err),
                  {}
                );
                client.ws.send(JSON.stringify(errFrame));
                const emeta = parseOCPPFrame(errFrame as any);
                pushFrame(queryClient, id, {
                  ts: new Date().toISOString(),
                  dir: 'out',
                  type: (emeta.type || 'CALLERROR') as any,
                  action: emeta.action,
                  id: emeta.id,
                  raw: errFrame as any,
                });
              } catch {}
            }
          }
        } catch (err) {
          pushFrame(queryClient, id, {
            ts: new Date().toISOString(),
            dir: 'in',
            type: 'PARSE_ERR',
            action: String(err),
            id: '',
            raw: ['PARSE_ERR', String(err)],
          });
        }
      };
    } catch (e) {
      reject(e);
    }
  });
}

export function disconnectWs(id: string) {
  const c = clients.get(id);
  if (c) c.ws.close(1000, 'Client disconnect');
}

export function callAction(
  id: string,
  action: string,
  payload: any
): Promise<any> {
  const c = clients.get(id);
  if (!c) throw new Error('No client for id ' + id);
  if (c.ws.readyState !== WebSocket.OPEN) throw new Error('WebSocket not open');
  const mid = uuidv4();
  const arr = createOCPPCall(action, payload, mid);
  c.ws.send(JSON.stringify(arr));
  // log sent CALL
  // Note: we don't have queryClient here, so we can't push directly.
  // We will piggyback on a queryClient from any active connect by storing it in a map.
  pushFrameForClient(id, {
    ts: new Date().toISOString(),
    dir: 'out',
    type: 'CALL',
    action,
    id: mid,
    raw: arr,
  });
  return new Promise((resolve, reject) => {
    c.pending.set(mid, { resolve, reject, action, payload });
  });
}

export function replyResult(id: string, msgId: string, payload: any) {
  const c = clients.get(id);
  if (!c) throw new Error('No client for id ' + id);
  const arr = createOCPPResult(msgId, payload);
  c.ws.send(JSON.stringify(arr));
  pushFrameForClient(id, {
    ts: new Date().toISOString(),
    dir: 'out',
    type: 'CALLRESULT',
    action: '(result)',
    id: msgId,
    raw: arr,
  });
}

export function replyError(
  id: string,
  msgId: string,
  code: string,
  description: string,
  details: any
) {
  const c = clients.get(id);
  if (!c) throw new Error('No client for id ' + id);
  const arr = createOCPPError(msgId, code, description, details);
  c.ws.send(JSON.stringify(arr));
  pushFrameForClient(id, {
    ts: new Date().toISOString(),
    dir: 'out',
    type: 'CALLERROR',
    action: code,
    id: msgId,
    raw: arr,
  });
}

export type Frame = {
  ts: string;
  dir: 'in' | 'out';
  type:
    | 'CALL'
    | 'CALLRESULT'
    | 'CALLERROR'
    | 'OPEN'
    | 'CLOSE'
    | 'ERROR'
    | 'PARSE_ERR';
  action: string;
  id: string;
  raw: any[];
};

export function pushFrame(queryClient: QueryClient, id: string, frame: Frame) {
  queryClient.setQueryData<Frame[] | undefined>(['frames', id], (prev) => {
    const next = [frame, ...(prev || [])];
    const bounded = next.length > 100 ? next.slice(0, 100) : next;
    // persist to localStorage
    try {
      saveFrames(id, bounded as unknown as PersistedFrame[]);
    } catch {}
    return bounded;
  });
}

// Maintain a per-id last used QueryClient to allow logging from helpers
const clientsQuery = new Map<string, QueryClient>();

// Wrap original pushFrame with a queryClient lookup
function pushFrameForClient(id: string, frame: Frame) {
  const qc = clientsQuery.get(id);
  if (!qc) return;
  pushFrame(qc, id, frame);
}

// Patch connectWs to remember queryClient per client id
