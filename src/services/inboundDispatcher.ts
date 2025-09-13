// OCPP 1.6J Inbound Dispatcher — TypeScript
// Drop-in module for a React/WebSocket client charge-point simulator
// - Validates inbound CALL frames (type=2)
// - Returns CALLRESULT/CALLERROR frames
// - Triggers follow-up CP->CSMS messages via ctx.sendCall
// No external deps.

export type OcppCall = [2, string, string, any];
export type OcppCallResult = [3, string, any];
export type OcppCallError = [4, string, string, string, any];
export type OcppFrame = OcppCall | OcppCallResult | OcppCallError;

export type StatusSimple = 'Accepted' | 'Rejected' | 'NotImplemented' | 'Unknown';

export interface HandlerContext {
  nowISO(): string;
  // Send a CP-initiated CALL (e.g., BootNotification, StartTransaction...)
  sendCall(action: string, payload: any): Promise<any>;
  // Live state accessors (provided by the app)
  getActiveConnectorId?(): number | undefined;
  getTransactionId?(): number | undefined;
  getBattery?(): { soc: number; currentA: number; energyWh: number } | undefined;
  getMeterValuesMeasurands?(): string[] | undefined;
  getSoCMode?(): 'none' | 'ev' | undefined;
  // Optional helpers/state your app can inject
  log?(...args: any[]): void;
  getConnectorCount?(): number;
  setAvailability?(connectorId: number, operative: boolean): void;
  applyChargingProfile?(connectorId: number, profile: any): void;
  clearChargingProfile?(filter: { id?: number; connectorId?: number; purpose?: string; stackLevel?: number }): void;
  getCompositeSchedule?(connectorId: number, duration: number, unit?: 'A'|'W'): any;
  reserve?(args: { connectorId: number; idTag: string; reservationId: number; expiryDate: string; parentIdTag?: string }): StatusSimple;
  cancelReservation?(reservationId: number): StatusSimple;
  unlock?(connectorId: number): 'Unlocked' | 'UnlockFailed' | 'NotSupported';
  // Firmware/Diagnostics hooks should handle async lifecycle + status notifications
  updateFirmware?(args: { location: string; retrieveDate: string; retries?: number; retryInterval?: number }): void;
  getDiagnostics?(args: { location: string; startTime?: string; stopTime?: string; retries?: number; retryInterval?: number }): Promise<string | undefined>; // returns fileName if any
  // Local auth list
  setLocalList?(args: { listVersion: number; updateType: 'Full'|'Differential'; localAuthorizationList?: any[] }): 'Accepted'|'Failed'|'VersionMismatch';
  getLocalListVersion?(): number;
  // Config
  changeConfig?(key: string, value: string): 'Accepted'|'Rejected'|'NotSupported'|'RebootRequired';
  getConfig?(keys?: string[]): { configurationKey: Array<{ key: string; readonly: boolean; value?: string }>; unknownKey: string[] };
  // Transaction flow
  canStartTx?(connectorId?: number): boolean;
  startLocalFlow?(args: { connectorId?: number; idTag?: string }): Promise<void> | void; // e.g., Authorize->Status(Preparing)->StartTransaction
  stopLocalFlow?(args: { transactionId: number }): Promise<void> | void; // e.g., StopTransaction + Status
}

// ---------------- Utilities ----------------
const asInt = (x: any) => (Number.isInteger(x) ? (x as number) : undefined);
const asStr = (x: any) => (typeof x === 'string' ? (x as string) : undefined);
const assert = (cond: any, msg: string) => {
  if (!cond) throw ['FormationViolation', msg, {}] as const;
};

export const makeResult = (uid: string, payload: any): OcppCallResult => [3, uid, payload ?? {}];
export const makeError = (uid: string, code: string, desc: string, details?: any): OcppCallError => [4, uid, code, desc, details ?? {}];

// ---------------- Dispatcher ----------------
export type InboundHandler = (uid: string, payload: any, ctx: HandlerContext) => Promise<OcppCallResult | OcppCallError> | OcppCallResult | OcppCallError;

export const inboundHandlers: Record<string, InboundHandler> = {
  // RemoteStartTransaction
  RemoteStartTransaction: async (uid, p, ctx) => {
    const idTag = asStr(p?.idTag);
    const connectorId = p?.connectorId !== undefined ? asInt(p.connectorId) : undefined;
    assert(idTag, 'idTag is required');
    if (ctx.canStartTx && connectorId !== undefined && !ctx.canStartTx(connectorId)) {
      return makeResult(uid, { status: 'Rejected' });
    }
    const res = makeResult(uid, { status: 'Accepted' });
    // Defer local flow to next tick to ensure caller can send the reply first
    setTimeout(() => {
      try { ctx.startLocalFlow?.({ connectorId, idTag }); } catch { /* ignore */ }
    }, 0);
    return res;
  },

  // RemoteStopTransaction
  RemoteStopTransaction: async (uid, p, ctx) => {
    const tx = asInt(p?.transactionId); assert(tx !== undefined, 'transactionId is required');
    ctx.stopLocalFlow?.({ transactionId: tx as number });
    return makeResult(uid, { status: 'Accepted' });
  },

  // ChangeAvailability
  ChangeAvailability: (uid, p, ctx) => {
    const connectorId = asInt(p?.connectorId); assert(connectorId !== undefined, 'connectorId is required');
    const type = asStr(p?.type); assert(type === 'Operative' || type === 'Inoperative', 'type invalid');
    ctx.setAvailability?.((connectorId as number), type === 'Operative');
    return makeResult(uid, { status: 'Accepted' });
  },

  // ChangeConfiguration
  ChangeConfiguration: (uid, p, ctx) => {
    const key = asStr(p?.key); const value = asStr(p?.value);
    assert(key, 'key required'); assert(typeof value === 'string', 'value required');
    const status = ctx.changeConfig ? ctx.changeConfig(key!, value!) : 'Accepted';
    return makeResult(uid, { status });
  },

  // GetConfiguration
  GetConfiguration: (uid, p, ctx) => {
    const keys = Array.isArray(p?.key) ? p.key.filter((k: any) => typeof k === 'string') : undefined;
    const payload = ctx.getConfig ? ctx.getConfig(keys) : { configurationKey: [], unknownKey: keys ?? [] };
    return makeResult(uid, payload);
  },

  // ClearCache
  ClearCache: (uid) => makeResult(uid, { status: 'Accepted' }),

  // SetChargingProfile
  SetChargingProfile: (uid, p, ctx) => {
    const connectorId = asInt(p?.connectorId); assert(connectorId !== undefined, 'connectorId required');
    const prof = p?.csChargingProfiles; assert(prof, 'csChargingProfiles required');
    ctx.applyChargingProfile?.((connectorId as number), prof);
    return makeResult(uid, { status: 'Accepted' });
  },

  // ClearChargingProfile
  ClearChargingProfile: (uid, p, ctx) => {
    ctx.clearChargingProfile?.({ id: asInt(p?.id), connectorId: asInt(p?.connectorId), purpose: asStr(p?.chargingProfilePurpose), stackLevel: asInt(p?.stackLevel) });
    return makeResult(uid, { status: 'Accepted' });
  },

  // GetCompositeSchedule
  GetCompositeSchedule: (uid, p, ctx) => {
    const connectorId = asInt(p?.connectorId); assert(connectorId !== undefined, 'connectorId required');
    const duration = asInt(p?.duration); assert(duration !== undefined, 'duration required');
    const unit = p?.chargingRateUnit === 'A' || p?.chargingRateUnit === 'W' ? p.chargingRateUnit : undefined;
    const schedule = ctx.getCompositeSchedule?.((connectorId as number), (duration as number), unit);
    if (!schedule) return makeResult(uid, { status: 'Rejected' });
    return makeResult(uid, { status: 'Accepted', connectorId, scheduleStart: ctx.nowISO(), chargingSchedule: schedule });
  },

  // ReserveNow
  ReserveNow: (uid, p, ctx) => {
    const connectorId = asInt(p?.connectorId); const expiryDate = asStr(p?.expiryDate); const idTag = asStr(p?.idTag); const reservationId = asInt(p?.reservationId);
    assert(connectorId !== undefined && expiryDate && idTag && reservationId !== undefined, 'missing fields');
    const status = ctx.reserve ? ctx.reserve({ connectorId: (connectorId as number), idTag: (idTag as string), reservationId: (reservationId as number), expiryDate: (expiryDate as string), parentIdTag: asStr(p?.parentIdTag) }) : 'Accepted';
    return makeResult(uid, { status });
  },

  // CancelReservation
  CancelReservation: (uid, p, ctx) => {
    const reservationId = asInt(p?.reservationId); assert(reservationId !== undefined, 'reservationId required');
    const status = ctx.cancelReservation ? ctx.cancelReservation((reservationId as number)) : 'Accepted';
    return makeResult(uid, { status });
  },

  // Reset
  Reset: (uid, p) => {
    const type = asStr(p?.type); assert(type === 'Hard' || type === 'Soft', 'type invalid');
    return makeResult(uid, { status: 'Accepted' });
  },

  // UnlockConnector
  UnlockConnector: (uid, p, ctx) => {
    const connectorId = asInt(p?.connectorId); assert(connectorId !== undefined, 'connectorId required');
    const status = ctx.unlock ? ctx.unlock((connectorId as number)) : 'Unlocked';
    return makeResult(uid, { status });
  },

  // UpdateFirmware
  UpdateFirmware: (uid, p, ctx) => {
    const location = asStr(p?.location); const retrieveDate = asStr(p?.retrieveDate);
    assert(location && retrieveDate, 'location & retrieveDate required');
    ctx.updateFirmware?.({ location: location!, retrieveDate: retrieveDate!, retries: asInt(p?.retries), retryInterval: asInt(p?.retryInterval) ?? undefined });
    return makeResult(uid, {});
  },

  // GetDiagnostics
  GetDiagnostics: async (uid, p, ctx) => {
    const location = asStr(p?.location); assert(location, 'location required');
    const fileName = await (ctx.getDiagnostics?.({ location: (location as string), startTime: asStr(p?.startTime), stopTime: asStr(p?.stopTime), retries: asInt(p?.retries), retryInterval: asInt(p?.retryInterval) ?? undefined }) ?? Promise.resolve(undefined));
    return makeResult(uid, fileName ? { fileName } : {});
  },

  // SendLocalList
  SendLocalList: (uid, p, ctx) => {
    const listVersion = asInt(p?.listVersion); const updateType = asStr(p?.updateType) as 'Full'|'Differential'|undefined;
    assert(listVersion !== undefined && (updateType === 'Full' || updateType === 'Differential'), 'listVersion/updateType invalid');
    const status = ctx.setLocalList ? ctx.setLocalList({ listVersion: listVersion!, updateType: updateType!, localAuthorizationList: Array.isArray(p?.localAuthorizationList) ? p.localAuthorizationList : undefined }) : 'Accepted';
    return makeResult(uid, { status });
  },

  // GetLocalListVersion
  GetLocalListVersion: (uid, _p, ctx) => {
    const v = ctx.getLocalListVersion ? ctx.getLocalListVersion() : 0;
    return makeResult(uid, { listVersion: v });
  },

  // DataTransfer
  DataTransfer: (uid, p) => {
    const vendorId = asStr(p?.vendorId); assert(vendorId, 'vendorId required');
    return makeResult(uid, { status: 'Accepted', data: p?.data ?? 'ok' });
  },

  // TriggerMessage
  TriggerMessage: async (uid, p, ctx) => {
    const requestedMessage = asStr(p?.requestedMessage); assert(requestedMessage, 'requestedMessage required');
    const res = makeResult(uid, { status: 'Accepted' });
    switch (requestedMessage) {
      case 'BootNotification':
        await ctx.sendCall('BootNotification', {
          chargePointVendor: 'EVS-Sim',
          chargePointModel: 'Browser-CP',
          firmwareVersion: 'x.y.z'
        });
        break;
      case 'StatusNotification':
        await ctx.sendCall('StatusNotification', {
          connectorId: 1, status: 'Available', errorCode: 'NoError', timestamp: ctx.nowISO()
        });
        break;
      case 'MeterValues':
        {
          const fmt6 = (n: number) => (Number(n).toFixed(6));
          const connId = ctx.getActiveConnectorId?.() ?? 1;
          const txId = ctx.getTransactionId?.();
          const bat = ctx.getBattery?.();
          const meas = (ctx.getMeterValuesMeasurands?.() ?? ['Energy.Active.Import.Register','Current.Offered','SoC']).map(String);
          const socMode = ctx.getSoCMode?.() ?? 'ev';
          const sampledValue: any[] = [];
          if (bat?.currentA !== undefined && meas.includes('Current.Offered')) {
            sampledValue.push({ context: 'Sample.Periodic', measurand: 'Current.Offered', unit: 'A', value: fmt6(bat.currentA) });
          }
          if (bat?.energyWh !== undefined && meas.includes('Energy.Active.Import.Register')) {
            sampledValue.push({ context: 'Sample.Periodic', measurand: 'Energy.Active.Import.Register', unit: 'Wh', value: fmt6(bat.energyWh) });
          }
          if (bat?.soc !== undefined && meas.includes('SoC') && socMode === 'ev') {
            sampledValue.push({ context: 'Sample.Periodic', location: 'EV', measurand: 'SoC', unit: 'Percent', value: fmt6(bat.soc) });
          }
          const payload: any = {
            connectorId: connId,
            meterValue: [{ timestamp: ctx.nowISO(), sampledValue }],
          };
          if (typeof txId === 'number') payload.transactionId = txId;
          await ctx.sendCall('MeterValues', payload);
        }
        break;
      default:
        break;
    }
    return res;
  },
};

// ---------------- Entry point ----------------
export async function handleInboundFrame(frame: OcppFrame, ctx: HandlerContext): Promise<OcppCallResult | OcppCallError | null> {
  try {
    if (!Array.isArray(frame) || frame[0] !== 2) return null; // only handle CALL here
    const [, uid, action, payload] = frame as OcppCall;
    const handler = inboundHandlers[action];
    if (!handler) return makeError(uid, 'NotImplemented', `Action ${action} not handled`);
    return await handler(uid, payload, ctx);
  } catch (e: any) {
    const uid = Array.isArray(frame) ? (frame as any)[1] : '';
    if (Array.isArray(e) && e.length === 3) {
      const [code, desc, details] = e as [string, string, any];
      return makeError(uid, code, desc, details);
    }
    return makeError(uid, 'InternalError', String(e?.message || e), {});
  }
}
