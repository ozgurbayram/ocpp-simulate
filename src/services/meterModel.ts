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
  getState: () => Readonly<MeterState>
  applyLimitKW: (kW?: number) => void
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

  let currentKey: PersistKey | undefined
  let txId: number | undefined
  let connectorId: number | undefined
  let limitKW: number | undefined

  let st: MeterState = {
    socPct: cfg.socStartPct,
    energyWh: 0,
    powerKW: 0,
    currentA: 0,
    voltageV: cfg.packVoltageMinV,
    lastSampleIso: ctx.nowISO(),
  }

  function persist() {
    if (currentKey) saveState(currentKey, st)
  }

  function recompute(dtSec: number) {
    // Base power from taper
    let pKW = computeTaperKW(st.socPct, cfg.stationMaxKW)
    // Clamp to >=2 kW only if session active and SOC < 100
    if (txId != null && st.socPct < 100) pKW = Math.max(pKW, 2)
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

  async function emitIfNeeded() {
    try {
      if (txId == null) {
        console.log('No txId for meter emission')
        return
      }
      const tx = ctx.getTransactionId?.()
      if (typeof tx !== 'number' || tx !== txId) {
        console.log('Transaction ID mismatch:', { expected: txId, actual: tx })
        return
      }
      const connId = ctx.getActiveConnectorId?.() ?? connectorId ?? 1
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
      if (meas.includes('Energy.Active.Import.Register')) push('Energy.Active.Import.Register', 'Wh', Math.floor(Math.max(0, st.energyWh)))
      if (meas.includes('Power.Active.Import')) push('Power.Active.Import', 'W', Math.round(Math.max(0, st.powerKW * 1000)))
      if (meas.includes('Current.Import')) push('Current.Import', 'A', Math.round(Math.max(0, st.currentA)))
      if (meas.includes('Voltage')) push('Voltage', 'V', Math.round(Math.max(0, st.voltageV)))
      if (meas.includes('SoC') && socMode === 'ev') sampledValue.push({ context: 'Sample.Periodic', location: 'EV', measurand: 'SoC', unit: 'Percent', value: String(Math.round(clamp(st.socPct, 0, 100))) })

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
      txId = tx
      connectorId = conn || 1
      currentKey = { cpId, connectorId, txId }
      // Try restore existing; otherwise initialize fresh with provided values
      const restored = loadState(currentKey)
      if (restored) {
        st = { ...restored }
      } else {
        st = {
          socPct: clamp(initialSocPct ?? cfg.socStartPct, 0, 100),
          energyWh: Math.max(0, initialWh || 0),
          powerKW: 0,
          currentA: 0,
          voltageV: estimateVoltageV(cfg, clamp(initialSocPct ?? cfg.socStartPct, 0, 100)),
          lastSampleIso: ctx.nowISO(),
        }
        persist()
      }
    },
    stop: (txMaybe) => {
      if (txMaybe != null && txMaybe !== txId) return
      if (currentKey) {
        persist()
        removeState(currentKey)
      }
      txId = undefined
      limitKW = undefined
      currentKey = undefined
      // Power goes to 0, keep state otherwise
      st.powerKW = 0
      st.currentA = 0
    },
    tick: async () => {
      const nowIso = ctx.nowISO()
      const last = Date.parse(st.lastSampleIso)
      const now = Date.parse(nowIso)
      const dtSec = Math.max(0, isNaN(last) || isNaN(now) ? cfg.samplePeriodSec : (now - last) / 1000)
      st.lastSampleIso = nowIso
      if (txId != null) {
        recompute(dtSec)
        persist()
        if (st.socPct >= 100) {
          // auto-stop emission once full
          await emitIfNeeded() // emit final sample at 100%
          const tx = txId
          api.stop(tx)
          return
        }
        await emitIfNeeded()
      }
    },
    getState: () => ({ ...st }),
    applyLimitKW: (kW?: number) => {
      if (kW == null || !Number.isFinite(kW)) {
        limitKW = undefined
      } else {
        limitKW = Math.max(0, kW)
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
