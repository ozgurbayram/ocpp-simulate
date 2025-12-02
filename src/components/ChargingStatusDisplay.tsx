import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Battery, Clock, Gauge, Zap } from 'lucide-react';

interface MeterValue {
  timestamp: string;
  sampledValue: Array<{
    context: string;
    measurand: string;
    unit: string;
    value: string;
  }>;
}

interface ChargingDataVM {
  connectorId: number;
  transactionId?: number;
  meterValue: MeterValue[];
}

interface ChargingStatusDisplayProps {
  chargingData?: ChargingDataVM;
  isCharging: boolean;
  chargingType: 'AC' | 'DC';
  deviceSettings?: {
    deviceName?: string;
    maxPowerKw?: number;
    nominalVoltageV?: number;
    maxCurrentA?: number;
    connectors?: number;
    socketType?: string[];
  };
}

export function ChargingStatusDisplay({
  chargingData,
  isCharging,
  chargingType,
  deviceSettings,
}: ChargingStatusDisplayProps) {
  const latestMeterValue = chargingData?.meterValue?.[0];
  const sampledValues = latestMeterValue?.sampledValue || [];

  const find = (m: string) => sampledValues.find((v) => v.measurand === m);
  const energyValue = find('Energy.Active.Import.Register');
  const currentValue = find('Current.Offered') || find('Current.Import');
  const powerValue = find('Power.Active.Import');
  const voltageValue = find('Voltage');
  const socValue = find('SoC');

  const energyWh = energyValue ? Number.parseFloat(energyValue.value) : 0;
  const currentA = currentValue ? Number.parseFloat(currentValue.value) : 0;
  const powerKW = powerValue
    ? powerValue.unit?.toLowerCase() === 'kw'
      ? Number.parseFloat(powerValue.value)
      : Number.parseFloat(powerValue.value) / 1000
    : (currentA *
        (voltageValue ? Number.parseFloat(voltageValue.value) : 230)) /
      1000;
  const voltageV = voltageValue ? Number.parseFloat(voltageValue.value) : (deviceSettings?.nominalVoltageV || 230);
  const socPct = socValue ? Number.parseFloat(socValue.value) : undefined;

  const chargingProgress = chargingType === 'DC' && socPct !== undefined
    ? socPct
    : Math.min(100, (energyWh / 50000) * 100);

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Zap className='h-5 w-5' />
            Charging Status
            {chargingData && (
              <Badge variant='outline' className='ml-auto'>
                Connector {chargingData.connectorId}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between flex-wrap gap-2'>
            <span className='text-sm font-medium'>Status</span>
            <Badge
              variant={isCharging ? 'default' : 'secondary'}
              className='flex items-center gap-1 shrink-0'
            >
              {isCharging ? (
                <Zap className='h-3 w-3' />
              ) : (
                <Battery className='h-3 w-3' />
              )}
              {isCharging ? 'Charging' : 'Not Charging'}
            </Badge>
          </div>

          <div className='flex items-center justify-between flex-wrap gap-2'>
            <span className='text-sm font-medium'>Charging Type</span>
            <Badge variant='outline' className='shrink-0'>
              {chargingType}
            </Badge>
          </div>

          {deviceSettings?.deviceName && (
            <div className='flex items-center justify-between flex-wrap gap-2'>
              <span className='text-sm font-medium'>Device</span>
              <span className='text-xs sm:text-sm font-mono break-all text-right'>
                {deviceSettings.deviceName}
              </span>
            </div>
          )}

          {chargingData?.transactionId && (
            <div className='flex items-center justify-between flex-wrap gap-2'>
              <span className='text-sm font-medium'>Transaction ID</span>
              <span className='text-xs sm:text-sm font-mono break-all text-right'>
                {chargingData.transactionId}
              </span>
            </div>
          )}

          <Separator />

          {chargingType === 'DC' && socPct !== undefined && (
            <>
              <div className='space-y-2'>
                <div className='flex items-center justify-between flex-wrap gap-2'>
                  <div className='flex items-center gap-1'>
                    <Battery className='h-4 w-4 text-muted-foreground shrink-0' />
                    <span className='text-sm font-medium'>Battery SoC</span>
                  </div>
                  <span className='text-xl sm:text-2xl font-bold'>
                    {socPct.toFixed(1)}%
                  </span>
                </div>
                <Progress value={socPct} className='h-3' />
              </div>
              <Separator />
            </>
          )}

          <div className='grid grid-cols-2 gap-3 sm:gap-4'>
            <div className='space-y-1'>
              <div className='flex items-center gap-1'>
                <Gauge className='h-3 w-3 text-muted-foreground shrink-0' />
                <span className='text-xs text-muted-foreground'>Power</span>
              </div>
              <div className='text-base sm:text-lg font-bold break-words'>
                <span className='text-sm sm:text-base'>
                  {powerKW.toFixed(1)}
                </span>
                <span className='text-xs sm:text-sm text-muted-foreground'>
                  {' '}
                  / {deviceSettings?.maxPowerKw || 22} kW
                </span>
              </div>
            </div>

            <div className='space-y-1'>
              <div className='flex items-center gap-1'>
                <Zap className='h-3 w-3 text-muted-foreground shrink-0' />
                <span className='text-xs text-muted-foreground'>Current</span>
              </div>
              <div className='text-base sm:text-lg font-bold break-words'>
                <span className='text-sm sm:text-base'>
                  {currentA.toFixed(1)}
                </span>
                <span className='text-xs sm:text-sm text-muted-foreground'>
                  {' '}
                  / {deviceSettings?.maxCurrentA || 32} A
                </span>
              </div>
            </div>

            <div className='space-y-1'>
              <span className='text-xs text-muted-foreground'>Voltage</span>
              <div className='text-base sm:text-lg font-bold'>
                {voltageV.toFixed(0)} V
              </div>
            </div>

            <div className='space-y-1'>
              <span className='text-xs text-muted-foreground'>Energy</span>
              <div className='text-base sm:text-lg font-bold break-words'>
                {(energyWh / 1000).toFixed(2)} kWh
              </div>
            </div>
          </div>

          {isCharging && chargingType === 'AC' && (
            <>
              <Separator />
              <div className='space-y-2'>
                <div className='flex items-center justify-between flex-wrap gap-2'>
                  <span className='text-sm font-medium'>Session Progress</span>
                  <span className='text-sm text-muted-foreground'>
                    {chargingProgress.toFixed(1)}%
                  </span>
                </div>
                <Progress value={chargingProgress} className='h-2' />
                <div className='flex justify-between flex-wrap gap-2 text-xs text-muted-foreground'>
                  <span className='break-words'>
                    {(energyWh / 1000).toFixed(2)} kWh delivered
                  </span>
                  <span className='shrink-0'>50 kWh target</span>
                </div>
              </div>
            </>
          )}

          {latestMeterValue && (
            <>
              <Separator />
              <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                <Clock className='h-3 w-3' />
                Last update:{' '}
                {new Date(latestMeterValue.timestamp).toLocaleTimeString()}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ChargingStatusDisplay;
