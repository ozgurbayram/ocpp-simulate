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
  const connectorId = cp?.runtime?.connectorId || 1

  const latest = useMemo(() => {
    const frames = framesQuery.data || []
    
    // Find the latest outbound MeterValues CALL for any connector (more permissive)
    const mv = frames.find(
      (f: OCPPFrame) => f.type === 'CALL' && f.dir === 'out' && f.action === 'MeterValues'
    )
    
    const payload = mv?.raw?.[3] as { connectorId?: number; transactionId?: number; meterValue?: MeterValue[] } | undefined
    const chargingData: ChargingDataVM | undefined = payload
      ? {
          connectorId: payload.connectorId ?? connectorId,
          transactionId: payload.transactionId,
          meterValue: Array.isArray(payload.meterValue) ? payload.meterValue : [],
        }
      : undefined

    // Determine isCharging: prefer runtime tx presence + power estimate
    let isCharging = false
    if (cp?.status === 'connected' && cp?.runtime?.transactionId != null) {
      isCharging = true
    }
    
    if (chargingData?.meterValue?.[0]?.sampledValue) {
      const samples = chargingData.meterValue[0].sampledValue
      const power = samples.find((s) => s.measurand === 'Power.Active.Import')
      const current = samples.find((s) => s.measurand === 'Current.Offered' || s.measurand === 'Current.Import' || s.measurand === 'Current')
      const voltage = samples.find((s) => s.measurand === 'Voltage')
      const powerKW = power
        ? (power.unit?.toLowerCase() === 'kw' ? Number(power.value) : Number(power.value) / 1000)
        : ((Number(current?.value || 0) * Number(voltage?.value || 230)) / 1000)
      
      if (powerKW > 0.1) {
        isCharging = true
      }
    }
    
    return { chargingData, isCharging }
  }, [framesQuery.data, connectorId, cp?.status, cp?.runtime?.transactionId])

  return { chargingData: latest.chargingData, isCharging: latest.isCharging, chargingType: 'AC' as const }
}

