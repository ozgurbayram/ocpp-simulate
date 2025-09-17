// @ts-nocheck
import ChargingStatusDisplay from '@/components/ChargingStatusDisplay';
import ControlsPanel from '@/components/ControlsPanel';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NetworkTraffic } from '@/components/ocpp/NetworkTraffic';
import { Button } from '@/components/ui/button';
import { useFrames, useOcppConnection } from '@/features/ocpp/hooks';
import { setPaused } from '@/features/ocpp/ocppSlice';
import { saveFrames } from '@/features/ocpp/storage';
import { useChargingStatus } from '@/hooks/useChargingStatus';
import type { RootState } from '@/store/store';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

export default function ChargePointConnection() {
  const { id } = useParams<{ id: string }>();
  const cp = useSelector((s: RootState) => (id ? s.ocpp.items[id] : undefined));
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const { connect, disconnect } = useOcppConnection(cp);

  // Frames for NetworkTraffic
  const framesQuery = useFrames(cp?.id || id || '');
  const frames = useMemo(() => framesQuery.data || [], [framesQuery.data]);
  const charging = useChargingStatus(cp?.id || id || '');

  // Auto-connect once when landing here if disconnected
  const didAutoconnect = useRef(false);
  useEffect(() => {
    if (!cp) return;
    if (!didAutoconnect.current && cp.status !== 'connected') {
      didAutoconnect.current = true;
      connect.mutate({});
    }
  }, [cp, connect]);

  if (!cp) {
    return (
      <DashboardLayout>
        <div className='p-6'>
          <div className='text-lg font-semibold'>Charge point not found</div>
          <div className='mt-2 text-sm text-muted-foreground'>The ID "{id}" was not found in your local state. Go back to dashboard and select a charge point.</div>
          <div className='mt-4'>
            <Button size='sm' onClick={() => (window.location.hash = '#/')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const onTogglePause = () =>
    dispatch(setPaused({ id: cp.id, paused: !cp.paused }));
  const onCopy = async () => {
    const text = JSON.stringify(frames, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {}
      document.body.removeChild(ta);
    }
  };
  const onClear = () => {
    saveFrames(cp.id, []);
    queryClient.setQueryData(['frames', cp.id], []);
  };

  return (
    <DashboardLayout>
      <div className='grid gap-4 p-4'>
        {/* Minimal header/status */}
        <div className='flex items-start justify-between'>
          <div>
            <div className='text-lg font-semibold'>{cp.label}</div>
            <div className='mt-1 text-xs text-muted-foreground'>
              CSMS: {cp.config.csmsUrl} • CP: {cp.config.cpId} •{' '}
              {cp.config.protocol}
            </div>
            <div className='mt-2 inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs'>
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  cp.status === 'connected'
                    ? 'bg-green-500'
                    : cp.status === 'connecting'
                    ? 'bg-yellow-500'
                    : 'bg-slate-400'
                }`}
              />
              <span className='capitalize'>{cp.status}</span>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              size='sm'
              variant='outline'
              onClick={() => connect.mutate({})}
              disabled={cp.status !== 'disconnected' || connect.isPending}
            >
              Connect
            </Button>
            <Button
              size='sm'
              variant='ghost'
              onClick={() => disconnect.mutate()}
              disabled={cp.status === 'disconnected'}
            >
              Disconnect
            </Button>
          </div>
        </div>

        {/* Charging status above actions */}
        <ChargingStatusDisplay
          chargingData={charging.chargingData}
          isCharging={charging.isCharging}
          chargingType={charging.chargingType}
        />

        {/* Controls */}
        <ControlsPanel cp={cp} />

        {/* Network traffic minimal view */}
        <NetworkTraffic
          frames={frames}
          paused={cp.paused}
          onTogglePause={onTogglePause}
          onCopy={onCopy}
          onClear={onClear}
        />
      </div>
    </DashboardLayout>
  );
}
