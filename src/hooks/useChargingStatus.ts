import { useFrames } from '@/features/ocpp/hooks'
import type { RootState } from '@/store/store'
import type { OCPPFrame } from '@/types/ocpp'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'

type MeterValue = {
  timestamp: string
  sampledValue: Array<{ context: string; measurand: string; unit: string; value: string }>
}

export type ChargingDataVM = {
  connectorId: number
  transactionId?: number
  meterValue: MeterValue[]
}

export function useChargingStatus(cpId: string) {
  const cp = useSelector((s: RootState) => s.ocpp.items[cpId])
  const framesQuery = useFrames(cpId)
  const numConnectors = cp?.chargePointConfig?.deviceSettings.connectors || 1

  const { chargingData, isCharging } = useMemo(() => {
    const frames = framesQuery.data || []
    
    // Find MeterValues CALLs for each connector
    const meterValuesCalls = frames.filter(
      (f: OCPPFrame) => f.type === 'CALL' && f.dir === 'out' && f.action === 'MeterValues'
    )
    
    const data: ChargingDataVM[] = []
    for (let connectorId = 1; connectorId <= numConnectors; connectorId++) {
      const call = meterValuesCalls.find((f: OCPPFrame) => {
        const payload = f.raw?.[3] as { connectorId?: number } | undefined
        return payload?.connectorId === connectorId
      })
      if (call) {
        const payload = call.raw?.[3] as { connectorId?: number; transactionId?: number; meterValue?: MeterValue[] } | undefined
        if (payload) {
          data.push({
            connectorId: payload.connectorId ?? connectorId,
            transactionId: payload.transactionId,
            meterValue: Array.isArray(payload.meterValue) ? payload.meterValue : [],
          })
        }
      }
    }

    // Determine isCharging: if any connector has an active transaction
    const charging = cp?.status === 'connected' && cp?.runtime?.connectors?.some(c => c.transactionId != null)

    return { chargingData: data, isCharging: charging }
  }, [framesQuery.data, numConnectors, cp?.status, cp?.runtime?.connectors])

  const chargingType = (cp?.chargePointConfig?.deviceSettings?.acdc || 'AC') as 'AC' | 'DC'
  return { chargingData, isCharging, chargingType }
}
