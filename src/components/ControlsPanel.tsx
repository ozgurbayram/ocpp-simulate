import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOcppConnection } from '@/features/ocpp/hooks';
import type { ChargePoint } from '@/features/ocpp/ocppSlice';
import { setConnectorId, setTransactionId } from '@/features/ocpp/ocppSlice';
import { useBatteryState } from '@/hooks/useBatteryState';
import { getMeterForCp } from '@/services/meterModel';
import { Plug } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';

type PanelForm = {
  vendor: string;
  model: string;
};

interface ControlsPanelProps {
  cp: ChargePoint;
  deviceSettings?: {
    connectors?: number;
    socketType?: string[];
    deviceName?: string;
  };
}

export const ControlsPanel = ({ cp, deviceSettings }: ControlsPanelProps) => {
  const dispatch = useDispatch();
  const { call } = useOcppConnection(cp);
  const connected = cp.status === 'connected';
  const { beginCharge, endCharge, setMeterStart } = useBatteryState();

  const form = useForm<PanelForm>({
    defaultValues: {
      vendor: 'EVS-Sim',
      model: deviceSettings?.deviceName || 'Browser-CP',
    },
  });

  useEffect(() => {
    if ((cp.runtime?.connectorId || 1) !== 1) {
      dispatch(setConnectorId({ id: cp.id, connectorId: 1 }));
    }
  }, [cp.id, cp.runtime?.connectorId, dispatch]);

  const connectorId = 1;

  const onBoot = () => {
    const v = form.getValues();
    call.mutate({
      action: 'BootNotification',
      payload: {
        chargePointVendor: v.vendor || 'EVS-Sim',
        chargePointModel: v.model || 'Browser-CP',
      },
    });
  };

  const onHeartbeat = () => {
    call.mutate({ action: 'Heartbeat', payload: {} });
  };

  const onStatus = () => {
    call.mutate({
      action: 'StatusNotification',
      payload: {
        connectorId,
        status: 'Available',
        errorCode: 'NoError',
      },
    });
  };

  const onAuthorize = () => {
    call.mutate({
      action: 'Authorize',
      payload: { idTag: cp.runtime?.idTag || 'DEMO1234' },
    });
  };

  const onStartTx = async () => {
    const meterStart = Math.floor(1000 + Math.random() * 1000);
    try {
      await call.mutateAsync({
        action: 'Authorize',
        payload: { idTag: cp.runtime?.idTag || 'DEMO1234' },
      });
    } catch {}
    const res = await call.mutateAsync({
      action: 'StartTransaction',
      payload: {
        connectorId,
        idTag: cp.runtime?.idTag || 'DEMO1234',
        meterStart,
        timestamp: new Date().toISOString(),
      },
    });
    const txid =
      typeof (res as any)?.transactionId === 'number'
        ? (res as any).transactionId
        : Math.floor(Math.random() * 100000);
    dispatch(setTransactionId({ id: cp.id, transactionId: txid }));
    await call.mutateAsync({
      action: 'StatusNotification',
      payload: {
        connectorId,
        status: 'Charging',
        errorCode: 'NoError',
      },
    });
    // begin local battery simulation and periodic MeterValues pushes
    setMeterStart(meterStart);
    beginCharge(() => {
      onMeterValues();
    });
  };

  const onMeterValues = () => {
    const meter = getMeterForCp(cp.id);
    meter?.tick().catch(() => {});
  };

  const onStopTx = async () => {
    const tx = cp.runtime?.transactionId || 0;
    let meterStop = 0;
    try {
      const m = getMeterForCp(cp.id);
      await m?.tick();
      const st = m?.getState();
      meterStop = Math.floor(Math.max(0, Number(st?.energyWh || 0)));
    } catch {}
    await call.mutateAsync({
      action: 'StopTransaction',
      payload: {
        transactionId: tx,
        idTag: cp.runtime?.idTag || 'DEMO1234',
        meterStop,
        timestamp: new Date().toISOString(),
        reason: 'Local',
      },
    });
    dispatch(setTransactionId({ id: cp.id, transactionId: undefined }));
    await call.mutateAsync({
      action: 'StatusNotification',
      payload: {
        connectorId,
        status: 'Finishing',
        errorCode: 'NoError',
      },
    });
    endCharge();
  };

  const onUnlockCable = async () => {
    await call.mutateAsync({
      action: 'StatusNotification',
      payload: {
        connectorId,
        status: 'Available',
        errorCode: 'NoError',
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Plug className='h-5 w-5' />
          OCPP Controls
          {deviceSettings?.deviceName && (
            <Badge variant='outline' className='ml-auto'>
              {deviceSettings.deviceName}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className='grid gap-4'>
        <div className='flex items-center justify-between rounded border px-3 py-2 text-sm flex-wrap gap-2'>
          <span className='font-medium'>Connector 1</span>
          <span className='text-muted-foreground text-xs sm:text-sm break-words'>
            {deviceSettings?.socketType?.[0] || 'Type2'} ({deviceSettings?.acdc || 'AC'})
          </span>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button 
            size='sm' 
            onClick={onBoot} 
            disabled={!connected}
            className='text-xs sm:text-sm flex-1 sm:flex-initial min-w-[120px] sm:min-w-0'
          >
            BootNotification
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={onHeartbeat}
            disabled={!connected}
            className='text-xs sm:text-sm flex-1 sm:flex-initial min-w-[120px] sm:min-w-0'
          >
            Heartbeat
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={onStatus}
            disabled={!connected}
            className='text-xs sm:text-sm flex-1 sm:flex-initial min-w-[120px] sm:min-w-0'
          >
            Status
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={onAuthorize}
            disabled={!connected}
            className='text-xs sm:text-sm flex-1 sm:flex-initial min-w-[120px] sm:min-w-0'
          >
            Authorize
          </Button>
          <Button
            size='sm'
            variant='secondary'
            onClick={onStartTx}
            disabled={!connected}
            className='text-xs sm:text-sm flex-1 sm:flex-initial min-w-[120px] sm:min-w-0'
          >
            StartTx
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={onMeterValues}
            disabled={!connected}
            className='text-xs sm:text-sm flex-1 sm:flex-initial min-w-[120px] sm:min-w-0'
          >
            MeterValues
          </Button>
          <Button
            size='sm'
            variant='destructive'
            onClick={onStopTx}
            disabled={!connected || !cp.runtime?.transactionId}
            className='text-xs sm:text-sm flex-1 sm:flex-initial min-w-[120px] sm:min-w-0'
          >
            StopTx
          </Button>
          <Button
            size='sm'
            variant='secondary'
            onClick={onUnlockCable}
            disabled={!connected}
            className='text-xs sm:text-sm flex-1 sm:flex-initial min-w-[120px] sm:min-w-0'
          >
            Unlock Cable
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ControlsPanel;
