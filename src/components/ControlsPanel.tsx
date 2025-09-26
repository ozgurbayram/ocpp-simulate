import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  activeConnector: number;
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

  const maxConnectors = deviceSettings?.connectors || 2;
  
  const form = useForm<PanelForm>({
    defaultValues: {
      activeConnector: Math.min(cp.runtime?.connectorId || 1, maxConnectors),
      vendor: 'EVS-Sim',
      model: deviceSettings?.deviceName || 'Browser-CP',
    },
  });

  // Keep connectorId synced to store
  const connector = form.watch('activeConnector');
  useEffect(() => {
    const current = cp.runtime?.connectorId || 1;
    const next = connector || 1;
    if (current !== next) {
      dispatch(setConnectorId({ id: cp.id, connectorId: next }));
    }
  }, [connector, cp.id, cp.runtime?.connectorId, dispatch]);

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
    const v = form.getValues();
    call.mutate({
      action: 'StatusNotification',
      payload: {
        connectorId: v.activeConnector || 1,
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
    const v = form.getValues();
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
        connectorId: v.activeConnector || 1,
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
        connectorId: v.activeConnector || 1,
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
    const v = form.getValues();
    const tx = cp.runtime?.transactionId;
    const sampledValue = [
      {
        context: 'Sample.Periodic',
        measurand: 'Energy.Active.Import.Register',
        unit: 'Wh',
        value: String(Math.floor(1000 + Math.random() * 500)),
      },
      {
        context: 'Sample.Periodic',
        measurand: 'Current.Offered',
        unit: 'A',
        value: String(16),
      },
    ];
    const payload: any = {
      connectorId: v.activeConnector || 1,
      meterValue: [{ timestamp: new Date().toISOString(), sampledValue }],
    };
    if (tx != null) payload.transactionId = tx;
    call.mutate({ action: 'MeterValues', payload });
  };

  const onStopTx = async () => {
    const tx = cp.runtime?.transactionId || 0;
    // Use meter model's current energy register
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
    const v = form.getValues();
    await call.mutateAsync({
      action: 'StatusNotification',
      payload: {
        connectorId: v.activeConnector || 1,
        status: 'Available',
        errorCode: 'NoError',
      },
    });
    endCharge();
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
        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium'>Connector:</span>
            <Select
              value={String(form.watch('activeConnector'))}
              onValueChange={(value) => form.setValue('activeConnector', Number(value))}
            >
              <SelectTrigger className='w-24'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxConnectors }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={String(num)}>
                    {num} {deviceSettings?.socketType?.[num - 1] && `(${deviceSettings.socketType[num - 1]})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className='flex flex-wrap gap-2'>
          <Button size='sm' onClick={onBoot} disabled={!connected}>
            BootNotification
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={onHeartbeat}
            disabled={!connected}
          >
            Heartbeat
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={onStatus}
            disabled={!connected}
          >
            Status
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={onAuthorize}
            disabled={!connected}
          >
            Authorize
          </Button>
          <Button
            size='sm'
            variant='secondary'
            onClick={onStartTx}
            disabled={!connected}
          >
            StartTx
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={onMeterValues}
            disabled={!connected}
          >
            MeterValues
          </Button>
          <Button
            size='sm'
            variant='destructive'
            onClick={onStopTx}
            disabled={!connected}
          >
            StopTx
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ControlsPanel;
