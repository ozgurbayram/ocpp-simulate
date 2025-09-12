import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useBatteryState } from '../hooks/useBatteryState';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { useOCPPMessages } from '../hooks/useOCPPMessages';
import { useWebSocket } from '../hooks/useWebSocket';
// import { createOCPPHandlers } from '../services/ocppHandlers';
import { handleInboundFrame, type HandlerContext } from '../services/inboundDispatcher';
import type { ConnectionConfig, OCPPFrame } from '../types/ocpp';
import { parseOCPPFrame } from '../utils/ocpp';
import { BatteryPanel } from './BatteryPanel';
import { ConnectionPanel } from './ConnectionPanel';
import { ControlsPanel } from './ControlsPanel';
import { NetworkTraffic } from './NetworkTraffic';

export default function OCPPSimulator() {
  const [frames, setFrames] = useState<OCPPFrame[]>([]);
  const [paused, setPaused] = useState(false);
  const [currentTransactionId, setCurrentTransactionId] = useState<
    number | null
  >(null);

  const form = useForm<ConnectionConfig>({
    defaultValues: {
      csmsUrl: 'wss://example-csms/ocpp/',
      cpId: 'SIM_CP_0001',
      protocol: 'ocpp1.6',
      user: '',
      password: '',
      vendor: 'EVS-Sim',
      model: 'Browser-CP',
      activeConnector: 1,
    },
  });

  const connectorId = form.watch('activeConnector') || 1;
  const heartbeatTimer = useRef<number | null>(null);

  const { status, connect, disconnect, send } = useWebSocket();
  const {
    batteryState,
    setBatteryState,
    beginCharge,
    endCharge,
    setMeterStart,
    cleanup,
  } = useBatteryState();
  const { saveToStorage, loadFromStorage } = useFormPersistence(
    form,
    batteryState,
    frames
  );

  const addFrame = useCallback(
    (dir: 'in' | 'out', raw: any[]) => {
      const ts = new Date();
      const meta = parseOCPPFrame(raw);
      const rec: OCPPFrame = {
        ts: ts.toISOString(),
        dir,
        type: (meta.type || 'CALL') as OCPPFrame['type'],
        action: meta.action,
        id: meta.id,
        raw,
      };

      if (!paused) {
        setFrames((prev) => {
          const newFrames = [rec, ...prev];
          return newFrames.length > 500 ? newFrames.slice(0, 500) : newFrames;
        });
      }
    },
    [paused]
  );

  const { call, handleIncomingMessage } = useOCPPMessages(send, addFrame);

  // Load from localStorage on mount
  useEffect(() => {
    const { battery, frames: savedFrames } = loadFromStorage();
    if (battery.soc !== undefined)
      setBatteryState((prev) => ({ ...prev, ...battery }));
    if (savedFrames) setFrames(savedFrames);
  }, [loadFromStorage, setBatteryState]);

  // OCPP functions
  const startTransaction = async (idTag = 'DEMO1234') => {
    const newMeterStart = Math.floor(1000 + Math.random() * 1000);
    setMeterStart(newMeterStart);

    const ts = new Date().toISOString();
    const res = await call('StartTransaction', {
      connectorId,
      idTag,
      meterStart: newMeterStart,
      timestamp: ts,
    });

    const transactionId =
      res?.transactionId || Math.floor(Math.random() * 100000);
    setCurrentTransactionId(transactionId);
    beginCharge(() => {
      call('MeterValues', {
        connectorId,
        transactionId: currentTransactionId || 0,
        meterValue: [
          {
            timestamp: new Date().toISOString(),
            sampledValue: [
              {
                value: String(Math.floor(batteryState.energyWh)),
                measurand: 'Energy.Active.Import.Register',
                unit: 'Wh',
              },
            ],
          },
        ],
      }).catch(() => {});

      if (batteryState.soc >= 100) {
        stopTransaction().catch(() => {});
      }
    });
    return res;
  };

  const stopTransaction = async (idTag = 'DEMO1234') => {
    const ts = new Date().toISOString();
    const meterStop = Math.floor(batteryState.energyWh);

    const res = await call('StopTransaction', {
      transactionId: currentTransactionId || 0,
      idTag,
      meterStop,
      timestamp: ts,
      reason: 'Local',
    });

    endCharge();
    return res;
  };

  // Inbound dispatcher context
  const ctx: HandlerContext = {
    nowISO: () => new Date().toISOString(),
    sendCall: (action, payload) => call(action, payload),
    setAvailability: async (_connId, operative) => {
      // Reflect availability via a StatusNotification
      await statusNotification(
        operative ? 'Available' : 'Unavailable',
        'NoError'
      );
    },
    applyChargingProfile: (_connectorId, _profile) => {
      // No-op demo: accept and rely on CSMS limits if any
    },
    clearChargingProfile: (_filter) => {
      // No-op demo
    },
    getCompositeSchedule: (_connectorId, duration, unit) => {
      const chargingRateUnit = unit || 'A';
      return {
        duration,
        chargingRateUnit,
        chargingSchedulePeriod: [
          { startPeriod: 0, limit: chargingRateUnit === 'W' ? 7400 : 32 },
        ],
      };
    },
    reserve: (_args) => 'Accepted',
    cancelReservation: (_reservationId) => 'Accepted',
    unlock: (_connectorId) => 'Unlocked',
    updateFirmware: ({}) => {
      // Send a simple firmware status lifecycle
      setTimeout(() => {
        call('FirmwareStatusNotification', { status: 'Downloading' }).catch(
          () => {}
        );
      }, 0);
      setTimeout(() => {
        call('FirmwareStatusNotification', { status: 'Downloaded' }).catch(
          () => {}
        );
      }, 1500);
      setTimeout(() => {
        call('FirmwareStatusNotification', { status: 'Installing' }).catch(
          () => {}
        );
      }, 3000);
      setTimeout(() => {
        call('FirmwareStatusNotification', { status: 'Installed' }).catch(
          () => {}
        );
      }, 4500);
    },
    getDiagnostics: async (_args) => {
      // Simulate diagnostics collection
      return 'diagnostics.log';
    },
    setLocalList: (_args) => 'Accepted',
    getLocalListVersion: () => 1,
    changeConfig: (key, value) => {
      if (key === 'HeartbeatInterval') {
        const iv = Math.max(5, parseInt(value || '60', 10) || 60);
        if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
        heartbeatTimer.current = setInterval(() => {
          call('Heartbeat', {}).catch(() => {});
        }, iv * 1000);
        return 'Accepted';
      }
      return 'Accepted';
    },
    getConfig: (keys) => {
      const all = [{ key: 'HeartbeatInterval', readonly: false, value: '60' }];
      const selected =
        keys && keys.length ? all.filter((c) => keys.includes(c.key)) : all;
      const unknownKey = keys
        ? keys.filter((k) => !all.find((c) => c.key === k))
        : [];
      return { configurationKey: selected, unknownKey };
    },
    canStartTx: () => true,
    startLocalFlow: async ({ connectorId: _cId, idTag }) => {
      const id = idTag || 'DEMO';
      await authorize(id);
      await statusNotification('Preparing', 'NoError');
      await startTransaction(id);
    },
    stopLocalFlow: async ({ transactionId: _transactionId }) => {
      await stopTransaction('REMOTE');
      await statusNotification('Available', 'NoError');
    },
  };

  // OCPP message handling
  const handleMessage = useCallback(
    async (frame: OCPPFrame) => {
      addFrame(frame.dir, frame.raw);

      // Resolve pending for CALLRESULT/CALLERROR; return CALL info if any
      const msg = handleIncomingMessage(frame);
      if (msg && Array.isArray(frame.raw) && frame.raw[0] === 2) {
        // Inbound CALL -> dispatch and reply
        const replyFrame = await handleInboundFrame(frame.raw as any, ctx);
        if (replyFrame) {
          send(replyFrame);
          addFrame('out', replyFrame as any);
        }
      }
    },
    [addFrame, handleIncomingMessage, ctx, send]
  );

  // OCPP functions
  const sendBoot = async () => {
    const { vendor, model } = form.getValues();
    const payload = {
      chargePointVendor: vendor || 'EVS-Sim',
      chargePointModel: model || 'Browser-CP',
      firmwareVersion: '3.0.0',
    };

    const r = await call('BootNotification', payload);
    const iv = Math.max(5, r?.interval || 60);

    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    heartbeatTimer.current = setInterval(() => {
      call('Heartbeat', {}).catch(() => {});
    }, iv * 1000);
  };

  const sendHeartbeat = () => call('Heartbeat', {});

  const statusNotification = (status = 'Available', errorCode = 'NoError') => {
    return call('StatusNotification', {
      connectorId,
      errorCode,
      status,
      timestamp: new Date().toISOString(),
    });
  };

  const authorize = (idTag = 'DEMO1234') => call('Authorize', { idTag });

  const meterValues = () => {
    return call('MeterValues', {
      connectorId,
      transactionId: currentTransactionId || 0,
      meterValue: [
        {
          timestamp: new Date().toISOString(),
          sampledValue: [
            {
              value: String(Math.floor(batteryState.energyWh)),
              measurand: 'Energy.Active.Import.Register',
              unit: 'Wh',
            },
          ],
        },
      ],
    });
  };

  // Connection handlers
  const handleConnect = () => {
    try {
      connect(form.getValues(), handleMessage, (newStatus) => {
        if (newStatus === 'disconnected') {
          if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
          endCharge();
        }
      });
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleAction = (action: () => void | Promise<void>) => {
    Promise.resolve(action()).catch((e) => alert((e as Error).message || e));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    };
  }, [cleanup]);

  return (
    <div className='min-h-screen bg-slate-950 text-slate-100'>
      <header className='p-4 bg-slate-800 border-b border-slate-600 flex items-center gap-3'>
        <h1 className='text-base font-semibold'>OCPP 1.6J CP Simulator — v3</h1>
        <span
          className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs border ${
            status === 'connected'
              ? 'bg-green-900 border-green-700 text-green-200'
              : status === 'charging'
              ? 'bg-blue-900 border-blue-700 text-blue-200'
              : 'bg-slate-700 border-slate-600 text-slate-300'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              status === 'connected'
                ? 'bg-green-400'
                : status === 'charging'
                ? 'bg-blue-400'
                : 'bg-slate-400'
            }`}
          />
          {status}
        </span>
      </header>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-3 p-3'>
        <div className='space-y-3'>
          <ConnectionPanel
            form={form}
            status={status}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
          <ControlsPanel
            form={form}
            onAction={handleAction}
            actions={{
              sendBoot,
              sendHeartbeat,
              statusNotification,
              authorize,
              startTransaction,
              meterValues,
              stopTransaction,
            }}
          />
        </div>

        <BatteryPanel batteryState={batteryState} connectorId={connectorId} />
      </div>

      <div className='px-3 pb-3'>
        <NetworkTraffic
          frames={frames}
          paused={paused}
          onTogglePause={() => setPaused(!paused)}
          onCopy={() => {
            const data = JSON.stringify(frames, null, 2);
            navigator.clipboard.writeText(data);
          }}
          onClear={() => {
            setFrames([]);
            saveToStorage();
          }}
        />
      </div>
    </div>
  );
}
