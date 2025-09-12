import { useCallback, useRef, useState } from 'react';
import type { BatteryState } from '../types/ocpp';

export const useBatteryState = () => {
  const [batteryState, setBatteryState] = useState<BatteryState>({
    soc: 45,
    power: 0,
    current: 0,
    energy: 0,
    meterStart: 0,
    energyWh: 0
  });

  const powerTimer = useRef<number | null>(null);
  const txTimer = useRef<number | null>(null);

  const beginCharge = useCallback((onMeterValues: () => void) => {
    const targetKw = 7.4;
    setBatteryState(prev => ({
      ...prev,
      power: targetKw,
      current: 32
    }));

    if (powerTimer.current) clearInterval(powerTimer.current);
    if (txTimer.current) clearInterval(txTimer.current);

    powerTimer.current = setInterval(() => {
      const jitter = (Math.random() - 0.5) * 0.6;
      const cur = Math.max(1, targetKw + jitter);
      setBatteryState(prev => ({
        ...prev,
        power: cur,
        current: 32 + Math.round(jitter * 3),
        soc: Math.min(100, prev.soc + 0.5)
      }));
    }, 1500);

    txTimer.current = setInterval(() => {
      setBatteryState(prev => {
        const newEnergyWh = prev.energyWh + prev.power * (5 / 3600) * 1000;
        const newEnergy = (newEnergyWh - prev.meterStart) / 1000;
        return {
          ...prev,
          energyWh: newEnergyWh,
          energy: newEnergy
        };
      });
      onMeterValues();
    }, 5000);
  }, []);

  const endCharge = useCallback(() => {
    if (txTimer.current) clearInterval(txTimer.current);
    if (powerTimer.current) clearInterval(powerTimer.current);
    setBatteryState(prev => ({
      ...prev,
      power: 0,
      current: 0
    }));
  }, []);

  const setMeterStart = useCallback((value: number) => {
    setBatteryState(prev => ({
      ...prev,
      meterStart: value,
      energyWh: value
    }));
  }, []);

  const cleanup = useCallback(() => {
    if (powerTimer.current) clearInterval(powerTimer.current);
    if (txTimer.current) clearInterval(txTimer.current);
  }, []);

  return {
    batteryState,
    setBatteryState,
    setSoc: (value: number) => {
      const v = Math.max(0, Math.min(100, Math.round(value)));
      setBatteryState(prev => ({ ...prev, soc: v }));
    },
    beginCharge,
    endCharge,
    setMeterStart,
    cleanup
  };
};
