import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../../store/store'
import { setStatus, type ChargePoint, type ConnectionConfig } from './ocppSlice'
import { callAction, connectWs, disconnectWs } from './wsManager'
import { loadFrames } from './storage'

export function useChargePoints() {
  const cps = useSelector((s: RootState) => s.ocpp)
  return cps
}

export function useFrames(cpId: string) {
  return useQuery({
    queryKey: ['frames', cpId],
    queryFn: async () => loadFrames(cpId),
    initialData: () => loadFrames(cpId),
  })
}

export function useOcppConnection(cp?: ChargePoint) {
  const qc = useQueryClient()
  const dispatch = useDispatch()

  const connect = useMutation({
    // allow overriding config with form values on connect
    mutationFn: async (vars?: { config?: Partial<ConnectionConfig> }) => {
      if (!cp) return
      dispatch(setStatus({ id: cp.id, status: 'connecting' }))
      const cfg = { ...cp.config, ...(vars?.config || {}) }
      const { csmsUrl, cpId, protocol } = cfg
      const url = buildUrl(csmsUrl, cpId)
      await connectWs(cp.id, url, protocol, qc, () => {
        dispatch(setStatus({ id: cp.id, status: 'connected' }))
      }, () => {
        dispatch(setStatus({ id: cp.id, status: 'disconnected' }))
      })
    },
  })

  const disconnect = useMutation({
    mutationFn: async () => {
      if (!cp) return
      disconnectWs(cp.id)
      dispatch(setStatus({ id: cp.id, status: 'disconnected' }))
    },
  })

  const call = useMutation({
    mutationFn: async ({ action, payload }: { action: string; payload: any }) => {
      if (!cp) return
      return await callAction(cp.id, action, payload)
    },
  })

  return { connect, disconnect, call }
}

function buildUrl(csmsUrl: string, cpId: string) {
  let base = csmsUrl.trim()
  if (!base) throw new Error('URL required')
  if (!base.endsWith('/')) base += '/'
  const cp = encodeURIComponent(cpId.trim() || 'SIM')
  const url = new URL(base + cp)
  return url.toString()
}
