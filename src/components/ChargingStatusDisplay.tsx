import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Battery, Clock, Gauge, Zap, TrendingUp } from 'lucide-react';
import type { Connector } from '@/types/ocpp';

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
  chargingData?: ChargingDataVM[];
  isCharging: boolean;
  chargingType: 'AC' | 'DC';
  connectors?: Connector[];
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
  chargingData = [],
  isCharging,
  chargingType,
  connectors = [],
  deviceSettings,
}: ChargingStatusDisplayProps) {
  const numConnectors = deviceSettings?.connectors || 1;
  const renderConnectorCard = (connectorId: number, data?: ChargingDataVM) => {
    const connector = connectors.find(c => c.id === connectorId);
    const status = connector?.status || 'Available';
    const isConnectorCharging = status === 'Charging';
    const latestMeterValue = data?.meterValue?.[0];
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

    const connectorIsCharging = data && isCharging; // TODO: determine per connector

    return (
      <Card key={connectorId}>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Zap className='h-5 w-5' />
            Connector {connectorId}
            {data && (
              <Badge variant='outline' className='ml-auto'>
                {data.transactionId ? `TX ${data.transactionId}` : 'No TX'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-5'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-2'>
                {connectorIsCharging ? (
                  <Zap className='h-4 w-4 text-primary' />
                ) : (
                  <Battery className='h-4 w-4 text-muted-foreground' />
                )}
                <span className='text-sm font-medium'>Status</span>
              </div>
              <Badge
                variant={isConnectorCharging ? 'default' : 'secondary'}
                className='flex items-center gap-1.5 shrink-0'
              >
                {isConnectorCharging ? (
                  <Zap className='h-3 w-3' />
                ) : (
                  <Clock className='h-3 w-3' />
                )}
                {status}
              </Badge>
            </div>
            <div className='flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-2'>
                <Gauge className='h-4 w-4 text-muted-foreground' />
                <span className='text-sm font-medium'>Power</span>
              </div>
              <span className='text-sm font-mono'>
                {powerKW.toFixed(2)} kW
              </span>
            </div>
            <div className='flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-2'>
                <TrendingUp className='h-4 w-4 text-muted-foreground' />
                <span className='text-sm font-medium'>Current</span>
              </div>
              <span className='text-sm font-mono'>
                {currentA.toFixed(1)} A
              </span>
            </div>
            <div className='flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-2'>
                <Battery className='h-4 w-4 text-muted-foreground' />
                <span className='text-sm font-medium'>Voltage</span>
              </div>
              <span className='text-sm font-mono'>
                {voltageV.toFixed(0)} V
              </span>
            </div>
          </div>

          {chargingType === 'DC' && socPct !== undefined && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between text-sm'>
                <span>Battery Level</span>
                <span>{socPct.toFixed(1)}%</span>
              </div>
              <Progress value={socPct} className='h-2' />
            </div>
          )}

          <Separator />

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-2'>
                <Zap className='h-4 w-4 text-muted-foreground' />
                <span className='text-sm font-medium'>Energy</span>
              </div>
              <span className='text-sm font-mono'>
                {energyWh.toFixed(2)} Wh
              </span>
            </div>
            <div className='flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-2'>
                <Clock className='h-4 w-4 text-muted-foreground' />
                <span className='text-sm font-medium'>Progress</span>
              </div>
              <span className='text-sm font-mono'>
                {chargingProgress.toFixed(1)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className='space-y-4'>
      {Array.from({ length: numConnectors }, (_, i) => i + 1).map(connectorId => {
        const data = chargingData.find(d => d.connectorId === connectorId);
        return renderConnectorCard(connectorId, data);
      })}
    </div>
  );
}

export default ChargingStatusDisplay;
