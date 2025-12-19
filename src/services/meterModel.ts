// Deterministic DC fast-charge meter model for OCPP 1.6J
// Drives periodic MeterValues based on a 120 kW taper curve

import type { HandlerContext } from './inboundDispatcher'

export type MeterConfig = {
  stationMaxKW: number // e.g., 120
  packVoltageMinV: number // e.g., 350
  packVoltageMaxV: number // e.g., 800
  socStartPct: number // seed if unknown
  samplePeriodSec: number // e.g., 5
  noiseKW?: number // +/- jitter
  virtualCapacityKWh?: number // default 60
  offeredCurrentA?: number // max offered current
}

export type MeterState = {
  socPct: number
  energyWh: number
  powerKW: number
  currentA: number
  voltageV: number
  lastSampleIso: string
}

export type MeterModel = {
  start: (txId: number, connectorId: number, initialMeterWh: number, initialSocPct?: number) => void
  stop: (txId?: number) => void
  tick: () => Promise<void>
  getState: (connectorId?: number) => Readonly<MeterState>
  applyLimitKW: (kW?: number, connectorId?: number) => void
}

type Context = Pick<
  HandlerContext,
  | 'nowISO'
  | 'sendCall'
  | 'getActiveConnectorId'
  | 'getTransactionId'
  | 'getMeterValuesMeasurands'
  | 'getSoCMode'
>

type PersistKey = { cpId: string; connectorId: number; txId: number }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const safeNum = (v: any, def = 0) => (Number.isFinite(v) ? (v as number) : def)

const DEFAULTS: Required<MeterConfig> = {
  stationMaxKW: 120,
  packVoltageMinV: 350,
  packVoltageMaxV: 800,
  socStartPct: 30,
  samplePeriodSec: 5,
  noiseKW: 0.5,
  virtualCapacityKWh: 60,
  offeredCurrentA: 32,
}

function localKey(k: PersistKey) {
  return `meter:${k.cpId}:${k.connectorId}:${k.txId}`
}

function loadState(k: PersistKey): MeterState | undefined {
  try {
    const raw = localStorage.getItem(localKey(k))
    if (!raw) return undefined
    const obj = JSON.parse(raw)
    if (
      typeof obj?.socPct === 'number' &&
      typeof obj?.energyWh === 'number' &&
      typeof obj?.powerKW === 'number' &&
      typeof obj?.currentA === 'number' &&
      typeof obj?.voltageV === 'number' &&
      typeof obj?.lastSampleIso === 'string'
    ) {
      return obj as MeterState
    }
  } catch {}
  return undefined
}

function saveState(k: PersistKey, st: MeterState) {
  try {
    // Serialize with reasonable rounding
    const ser: MeterState = {
      socPct: Number(st.socPct.toFixed(4)),
      energyWh: Number(st.energyWh.toFixed(3)),
      powerKW: Number(st.powerKW.toFixed(4)),
      currentA: Number(st.currentA.toFixed(3)),
      voltageV: Number(st.voltageV.toFixed(2)),
      lastSampleIso: st.lastSampleIso,
    }
    localStorage.setItem(localKey(k), JSON.stringify(ser))
  } catch {}
}

function removeState(k: PersistKey) {
  try {
    localStorage.removeItem(localKey(k))
  } catch {}
}

function computeTaperKW(socPct: number, maxKW: number): number {
  const soc = clamp(socPct, 0, 100)
  if (soc >= 100) return 0
  if (soc < 60) return maxKW
  if (soc < 80) {
    // 60–80: linear down maxKW -> 0.5*maxKW
    const t = (soc - 60) / 20
    return maxKW - t * (maxKW - 0.5 * maxKW)
  }
  // 80–100: linear down 0.5*maxKW -> 0.15*maxKW
  const t = (soc - 80) / 20
  return 0.5 * maxKW - t * (0.5 * maxKW - 0.15 * maxKW)
}

function estimateVoltageV(cfg: Required<MeterConfig>, socPct: number): number {
  const ratio = clamp(socPct / 100, 0, 1)
  const v = cfg.packVoltageMinV + (cfg.packVoltageMaxV - cfg.packVoltageMinV) * ratio
  return clamp(v, 50, 1000)
}

function jitterKW(noiseKW: number | undefined): number {
  if (!noiseKW || noiseKW <= 0) return 0
  const r = Math.random() * 2 - 1 // -1..1
  return r * noiseKW
}

export function createMeterModel(cpId: string, ctx: Context, cfgPartial?: Partial<MeterConfig>): MeterModel {
  const cfg: Required<MeterConfig> = { ...DEFAULTS, ...(cfgPartial || {}) }

  const activeSessions = new Map<number, { txId: number; st: MeterState; limitKW?: number }>()

  function persist(connectorId: number, st: MeterState) {
    const txId = activeSessions.get(connectorId)?.txId
    if (txId) saveState({ cpId, connectorId, txId }, st)
  }

  function recomputeForSession(session: { txId: number; st: MeterState; limitKW?: number }, dtSec: number) {
    const st = session.st
    const limitKW = session.limitKW
    // Base power from taper
    let pKW = computeTaperKW(st.socPct, cfg.stationMaxKW)
    // Clamp to >=2 kW only if session active and SOC < 100
    if (st.socPct < 100) pKW = Math.max(pKW, 2)
    // Apply external limit, if any
    if (limitKW != null && Number.isFinite(limitKW)) pKW = Math.min(pKW, Math.max(0, limitKW))
    // Apply jitter
    pKW = Math.max(0, pKW + jitterKW(cfg.noiseKW))

    // If suspended (limit 0) or soc 100 stop power
    if (st.socPct >= 100 || pKW <= 0.0001) pKW = 0

    const voltage = estimateVoltageV(cfg, st.socPct)
    const current = pKW > 0 ? (pKW * 1000) / voltage : 0

    // Accumulate energy (Wh)
    const dWh = (pKW * (dtSec / 3600)) * 1000
    if (st.socPct < 100 && pKW > 0) {
      st.energyWh = Math.max(0, st.energyWh + dWh)
      // Evolve SOC
      const dSoc = ((pKW * (dtSec / 3600)) / cfg.virtualCapacityKWh) * 100
      st.socPct = clamp(st.socPct + dSoc, 0, 100)
    }

    st.powerKW = safeNum(pKW)
    st.voltageV = safeNum(voltage)
    st.currentA = safeNum(current)
  }

  async function emitIfNeededForSession(session: { txId: number; st: MeterState }, connectorId: number) {
    try {
      const txId = session.txId
      const st = session.st
      const connId = connectorId
      const timestamp = ctx.nowISO()
      const meas = (ctx.getMeterValuesMeasurands?.() ?? [
        'Energy.Active.Import.Register',
        'Power.Active.Import',
        'Current.Import',
        'Voltage',
        'SoC',
      ]).map(String)
      const socMode = ctx.getSoCMode?.() ?? 'ev'

      const sampledValue: any[] = []
      const push = (m: string, unit: string, value: number, extra?: any) => {
        sampledValue.push({ context: 'Sample.Periodic', measurand: m, unit, value: String(value), ...(extra || {}) })
      }
      if (meas.includes('Energy.Active.Import.Register')) {
        push('Energy.Active.Import.Register', 'Wh', Math.max(0, Number(st.energyWh.toFixed(3))))
      }
      if (meas.includes('Power.Active.Import')) push('Power.Active.Import', 'W', Math.max(0, Number((st.powerKW * 1000).toFixed(0))))
      if (meas.includes('Current.Import')) push('Current.Import', 'A', Math.max(0, Number(st.currentA.toFixed(3))))
      if (meas.includes('Current.Offered')) {
        const offered = Math.min(
          Math.max(0, cfg.offeredCurrentA),
          (cfg.stationMaxKW * 1000) / Math.max(1, st.voltageV || cfg.packVoltageMaxV)
        )
        push('Current.Offered', 'A', Number(offered.toFixed(3)))
      }
      if (meas.includes('Voltage')) push('Voltage', 'V', Math.max(0, Number(st.voltageV.toFixed(2))))
      if (meas.includes('SoC')) {
        const mode = String(socMode || '').toLowerCase()
        const location =
          mode === 'outlet' ? 'Outlet' :
          mode === 'evse' ? 'EVSE' :
          mode === 'none' ? undefined :
          'EV'
        const socSample: any = {
          context: 'Sample.Periodic',
          measurand: 'SoC',
          unit: 'Percent',
          value: String(Number(clamp(st.socPct, 0, 100).toFixed(3))),
        }
        if (location) socSample.location = location
        sampledValue.push(socSample)
      }

      const payload: any = {
        connectorId: connId,
        meterValue: [{ timestamp, sampledValue }],
        transactionId: txId,
      }
      console.log('Sending MeterValues:', payload)
      await ctx.sendCall('MeterValues', payload)
      console.log('MeterValues sent successfully')
    } catch (err) {
      console.log('Error sending MeterValues:', err)
      // Swallow send errors (e.g., WS closed)
    }
  }

  const api: MeterModel = {
    start: (tx, conn, initialWh, initialSocPct) => {
      const connectorId = conn || 1
      const key = { cpId, connectorId, txId: tx }
      // Try restore existing; otherwise initialize fresh with provided values
      const restored = loadState(key)
      const st: MeterState = restored ? { ...restored } : {
        socPct: clamp(initialSocPct ?? cfg.socStartPct, 0, 100),
        energyWh: Math.max(0, initialWh || 0),
        powerKW: 0,
        currentA: 0,
        voltageV: estimateVoltageV(cfg, clamp(initialSocPct ?? cfg.socStartPct, 0, 100)),
        lastSampleIso: ctx.nowISO(),
      }
      activeSessions.set(connectorId, { txId: tx, st, limitKW: undefined })
      if (!restored) persist(connectorId, st)
    },
    stop: (txMaybe) => {
      for (const [connId, session] of activeSessions) {
        if (txMaybe != null && txMaybe !== session.txId) continue
        persist(connId, session.st)
        removeState({ cpId, connectorId: connId, txId: session.txId })
        session.st.powerKW = 0
        session.st.currentA = 0
        activeSessions.delete(connId)
      }
    },
    tick: async () => {
      const nowIso = ctx.nowISO()
      for (const [connId, session] of activeSessions) {
        const last = Date.parse(session.st.lastSampleIso)
        const now = Date.parse(nowIso)
        const dtSec = Math.max(0, isNaN(last) || isNaN(now) ? cfg.samplePeriodSec : (now - last) / 1000)
        session.st.lastSampleIso = nowIso
        recomputeForSession(session, dtSec)
        persist(connId, session.st)
        if (session.st.socPct >= 100) {
          // auto-stop emission once full
          await emitIfNeededForSession(session, connId) // emit final sample at 100%
          activeSessions.delete(connId)
          continue
        }
        await emitIfNeededForSession(session, connId)
      }
    },
    getState: (connectorId) => {
      const session = activeSessions.get(connectorId || 1)
      return session ? { ...session.st } : {
        socPct: cfg.socStartPct,
        energyWh: 0,
        powerKW: 0,
        currentA: 0,
        voltageV: cfg.packVoltageMinV,
        lastSampleIso: ctx.nowISO(),
      }
    },
    applyLimitKW: (kW, connectorId) => {
      const session = activeSessions.get(connectorId || 1)
      if (session) {
        if (kW == null || !Number.isFinite(kW)) {
          session.limitKW = undefined
        } else {
          session.limitKW = Math.max(0, kW)
        }
      }
    },
  }
  return api
}

// Simple registry to manage one meter per CP id
const meters = new Map<string, MeterModel>()

export function ensureMeterForCp(cpId: string, ctx: Context, cfg?: Partial<MeterConfig>): MeterModel {
  let m = meters.get(cpId)
  if (!m) {
    m = createMeterModel(cpId, ctx, cfg)
    meters.set(cpId, m)
  }
  return m
}

export function getMeterForCp(cpId: string): MeterModel | undefined {
  return meters.get(cpId)
}
