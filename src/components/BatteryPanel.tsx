import type { BatteryState } from '../types/ocpp';
import { BatteryVisualization } from './BatteryVisualization';

interface BatteryPanelProps {
  batteryState: BatteryState;
  connectorId: number;
  onSetSoc?: (soc: number) => void;
}
export const BatteryPanel = ({
  batteryState,
  connectorId,
  onSetSoc,
}: BatteryPanelProps) => {
  return (
    <div className='bg-slate-800 border border-slate-600 rounded-xl'>
      <div className='flex items-center justify-between p-3 border-b border-slate-600'>
        <h2 className='text-xs font-semibold text-slate-300'>Batarya</h2>
        {onSetSoc && (
          <div className='flex items-center gap-2'>
            <label className='text-xs text-slate-400'>Start SOC %</label>
            <input
              type='number'
              min={0}
              max={100}
              defaultValue={batteryState.soc}
              onBlur={(e) => {
                const v = parseInt(e.target.value || '0', 10);
                if (!Number.isNaN(v)) onSetSoc(Math.max(0, Math.min(100, v)));
              }}
              className='w-20 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-slate-100 text-xs'
            />
          </div>
        )}
      </div>
      <div className='p-3'>
        <BatteryVisualization
          soc={batteryState.soc}
          power={batteryState.power}
          energy={batteryState.energy}
          current={batteryState.current}
          connector={connectorId}
        />
      </div>
    </div>
  );
};
