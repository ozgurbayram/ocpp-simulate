import { useState } from 'react';
import { useDispatch } from 'react-redux';
import type { errorCodes, statuses } from '../constants/ocpp.constants';
import { useOcppConnection } from '../features/ocpp/hooks';
import { getMeterForCp } from '@/services/meterModel';
import { setTransactionId, type ChargePoint } from '../features/ocpp/ocppSlice';

const useOcppActions = (cp: ChargePoint) => {
  const dispatch = useDispatch();
  const { call } = useOcppConnection(cp);
  const [st, setSt] = useState<(typeof statuses)[number]>('Available');
  const [err, setErr] = useState<(typeof errorCodes)[number]>('NoError');

  const connected = cp.status === 'connected';

  const heartbeat = () => call.mutate({ action: 'Heartbeat', payload: {} });
  const boot = () =>
    call.mutate({
      action: 'BootNotification',
      payload: { chargePointVendor: 'EVS-Sim', chargePointModel: 'Browser-CP' },
    });
  const authorize = () =>
    call.mutate({
      action: 'Authorize',
      payload: { idTag: cp.runtime?.idTag || 'DEMO1234' },
    });
  const status = () =>
    call.mutate({
      action: 'StatusNotification',
      payload: {
        connectorId: cp.runtime?.connectorId || 1,
        status: st,
        errorCode: err,
      },
    });

  const startTx = async () => {
    const meterStart = Math.floor(1000 + Math.random() * 1000);
    // Many CSMS expect Authorize before StartTransaction
    await call
      .mutateAsync({
        action: 'Authorize',
        payload: { idTag: cp.runtime?.idTag || 'DEMO1234' },
      })
      .catch(() => {});
    const res = await call.mutateAsync({
      action: 'StartTransaction',
      payload: {
        connectorId: cp.runtime?.connectorId || 1,
        idTag: cp.runtime?.idTag || 'DEMO1234',
        meterStart,
        timestamp: new Date().toISOString(),
      },
    });
    const txid =
      typeof res?.transactionId === 'number'
        ? res.transactionId
        : Math.floor(Math.random() * 100000);
    dispatch(setTransactionId({ id: cp.id, transactionId: txid }));
    await call.mutateAsync({
      action: 'StatusNotification',
      payload: {
        connectorId: cp.runtime?.connectorId || 1,
        status: 'Charging',
        errorCode: 'NoError',
      },
    });
  };

  const meterValues = async () => {
    const meter = getMeterForCp(cp.id);
    if (!meter) return;
    await meter.tick().catch(() => {});
  };

  const stopTx = async () => {
    const tx = cp.runtime?.transactionId || 0;
    // Take a final meter tick and use current energy register
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
        connectorId: cp.runtime?.connectorId || 1,
        status: 'Available',
        errorCode: 'NoError',
      },
    });
  };

  return {
    heartbeat,
    boot,
    authorize,
    status,
    startTx,
    meterValues,
    stopTx,
    connected,
    st,
    setSt,
    err,
    setErr,
  };
};

export default useOcppActions;
