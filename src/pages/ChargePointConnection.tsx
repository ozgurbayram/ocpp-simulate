// @ts-nocheck
import ChargingStatusDisplay from '@/components/ChargingStatusDisplay';
import ControlsPanel from '@/components/ControlsPanel';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ChargePointAdvancedConfigSheet } from '@/components/ocpp/ChargePointAdvancedConfigSheet';
import { ChargePointConfigSheet } from '@/components/ocpp/ChargePointConfigSheet';
import { NetworkTraffic } from '@/components/ocpp/NetworkTraffic';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { normalizeDeviceSettings } from '@/constants/chargePointDefaults';
import { useFrames, useOcppConnection } from '@/features/ocpp/hooks';
import { removeChargePoint, setPaused } from '@/features/ocpp/ocppSlice';
import { loadDeviceSettings, saveFrames } from '@/features/ocpp/storage';
import { disconnectWs } from '@/features/ocpp/wsManager';
import { useChargingStatus } from '@/hooks/useChargingStatus';
import type { RootState } from '@/store/store';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

export default function ChargePointConnection() {
  const { id } = useParams<{ id: string }>();
  const cp = useSelector((s: RootState) => (id ? s.ocpp.items[id] : undefined));
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [configOpen, setConfigOpen] = useState(false);
  const [advancedConfigOpen, setAdvancedConfigOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { connect, disconnect } = useOcppConnection(cp);

  // Frames for NetworkTraffic
  const framesQuery = useFrames(cp?.id || id || '');
  const frames = useMemo(() => framesQuery.data || [], [framesQuery.data]);
  const charging = useChargingStatus(cp?.id || id || '');

  const storedDeviceSettings = loadDeviceSettings(cp?.id || id || '');
  const deviceSettings = normalizeDeviceSettings({
    deviceName:
      storedDeviceSettings?.deviceName ||
      cp?.chargePointConfig?.deviceSettings?.deviceName ||
      `Simülatör-${cp?.id || id}`,
    ...(cp?.chargePointConfig?.deviceSettings || {}),
    ...(storedDeviceSettings || {}),
  });

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
        <div className='p-4 sm:p-6'>
          <div className='text-base sm:text-lg font-semibold'>
            Charge point not found
          </div>
          <div className='mt-2 text-xs sm:text-sm text-muted-foreground break-words'>
            The ID "{id}" was not found in your local state. Go back to
            dashboard and select a charge point.
          </div>
          <div className='mt-4'>
            <Button
              size='sm'
              onClick={() => (window.location.hash = '#/')}
              className='w-full sm:w-auto'
            >
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

  const onDelete = () => {
    setDeleteOpen(false);
    try {
      disconnectWs(cp.id);
    } catch {}
    saveFrames(cp.id, []);
    queryClient.setQueryData(['frames', cp.id], []);
    dispatch(removeChargePoint(cp.id));
    navigate('/');
  };

  return (
    <>
      <SEO
        title={`Charge Point: ${cp?.label || id}`}
        description={`Monitor and control OCPP charge point ${
          cp?.label || id
        }. View real-time charging status, send OCPP messages, monitor network traffic, and manage charging sessions.`}
        keywords={`OCPP charge point, ${
          cp?.label || id
        }, EV charging simulation, OCPP monitoring, charge point control`}
      />
      <DashboardLayout>
        <div className='grid gap-4'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
            <div className='flex-1 min-w-0'>
              <div className='text-base sm:text-lg font-semibold truncate'>
                {cp.label}
              </div>
              <div className='mt-1 text-xs text-muted-foreground break-words'>
                <span className='hidden sm:inline'>
                  CSMS: {cp.config.csmsUrl} •{' '}
                </span>
                <span className='sm:hidden'>CSMS: </span>
                <span className='sm:hidden break-all'>{cp.config.csmsUrl}</span>
                <span className='sm:hidden block mt-1'>
                  CP: {cp.config.cpId} • {cp.config.protocol}
                </span>
                <span className='hidden sm:inline'>
                  CP: {cp.config.cpId} • {cp.config.protocol}
                </span>
              </div>
              <div className='mt-2 inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs'>
                <span
                  className={`inline-block h-2 w-2 rounded-full shrink-0 ${
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
            <div className='flex items-center gap-2 sm:shrink-0'>
              <div className='hidden sm:flex items-center gap-2'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => setConfigOpen(true)}
                  className='text-xs sm:text-sm'
                >
                  Basic Config
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => setAdvancedConfigOpen(true)}
                  className='text-xs sm:text-sm'
                >
                  Advanced Config
                </Button>
                <Button
                  size='sm'
                  variant='destructive'
                  onClick={() => setDeleteOpen(true)}
                  className='text-xs sm:text-sm'
                >
                  Delete
                </Button>
              </div>
              <div className='flex items-center gap-2 sm:border-l sm:pl-2'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => connect.mutate({})}
                  disabled={cp.status !== 'disconnected' || connect.isPending}
                  className='text-xs sm:text-sm'
                >
                  {connect.isPending || cp.status === 'connecting' ? (
                    'Connecting...'
                  ) : (
                    'Connect'
                  )}
                </Button>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={() => disconnect.mutate()}
                  disabled={cp.status === 'disconnected' || disconnect.isPending}
                  className='text-xs sm:text-sm'
                >
                  Disconnect
                </Button>
              </div>
              <div className='flex sm:hidden items-center gap-2'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => setConfigOpen(true)}
                  className='text-xs'
                >
                  Basic
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => setAdvancedConfigOpen(true)}
                  className='text-xs'
                >
                  Advanced
                </Button>
                <Button
                  size='sm'
                  variant='destructive'
                  onClick={() => setDeleteOpen(true)}
                  className='text-xs'
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>

          {/* Charging status above actions */}
          <ChargingStatusDisplay
            chargingData={charging.chargingData}
            isCharging={charging.isCharging}
            chargingType={deviceSettings.acdc || 'AC'}
            connectors={cp.runtime?.connectors}
            deviceSettings={deviceSettings}
          />

          {/* Controls */}
          <ControlsPanel cp={cp} deviceSettings={deviceSettings} />

          {/* Network traffic minimal view */}
          <NetworkTraffic
            frames={frames}
            paused={cp.paused}
            onTogglePause={onTogglePause}
            onCopy={onCopy}
            onClear={onClear}
          />
        </div>
        <ChargePointConfigSheet
          chargePoint={cp}
          open={configOpen}
          onOpenChange={(next) => setConfigOpen(next)}
        />
        <ChargePointAdvancedConfigSheet
          chargePoint={cp}
          open={advancedConfigOpen}
          onOpenChange={(next) => setAdvancedConfigOpen(next)}
        />
        <Dialog open={deleteOpen} onOpenChange={(next) => setDeleteOpen(next)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete connection?</DialogTitle>
              <DialogDescription>
                This will remove "{cp.label}" and disconnect the simulated
                charge point.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button type='button' variant='outline'>
                  Cancel
                </Button>
              </DialogClose>
              <Button type='button' variant='destructive' onClick={onDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </>
  );
}
