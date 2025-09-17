type OcppStateShape = {
  items: Record<string, any>
  order: string[]
  selectedId?: string
}

const OCPP_STATE_KEY = 'ocpp:state'
const FRAMES_KEY = (id: string) => `ocpp:frames:${id}`

export function loadOcppState(): OcppStateShape | undefined {
  try {
    const raw = localStorage.getItem(OCPP_STATE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    // On reload, force connection statuses to 'disconnected' to avoid stale UI
    if (parsed && parsed.items && typeof parsed.items === 'object') {
      for (const k of Object.keys(parsed.items)) {
        const item = parsed.items[k]
        if (item && typeof item === 'object') {
          item.status = 'disconnected'
        }
      }
    }
    return parsed
  } catch {
    return undefined
  }
}

export function saveOcppState(state: OcppStateShape) {
  try {
    localStorage.setItem(OCPP_STATE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export type Frame = {
  ts: string
  dir: 'in' | 'out'
  type: 'CALL' | 'CALLRESULT' | 'CALLERROR' | 'OPEN' | 'CLOSE' | 'ERROR' | 'PARSE_ERR'
  action: string
  id: string
  raw: any[]
}

export function loadFrames(id: string): Frame[] {
  try {
    const raw = localStorage.getItem(FRAMES_KEY(id))
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function saveFrames(id: string, frames: Frame[]) {
  try {
    localStorage.setItem(FRAMES_KEY(id), JSON.stringify(frames))
  } catch {
    // ignore
  }
}
