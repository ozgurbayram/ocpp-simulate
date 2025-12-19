// @ts-ignore
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { normalizeDeviceSettings } from '@/constants/chargePointDefaults';
import type { DeviceSettings } from '@/types/ocpp';
import { 
  Info, 
  Gauge, 
  Plug, 
  Settings
} from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

interface DeviceSettingsFormProps {
  deviceSettings: DeviceSettings;
  onSave: (settings: DeviceSettings) => void;
  onCancel: () => void;
}

const acdcOptions = ['AC', 'DC'] as const;
const socketTypeOptions = ['Type2', 'CCS', 'CHAdeMO', 'Type1'] as const;
const phaseRotationOptions = [
  'RST',
  'RTS',
  'STR',
  'SRT',
  'TRS',
  'TSR',
] as const;

export function DeviceSettingsForm({
  deviceSettings,
  onSave,
  onCancel,
}: DeviceSettingsFormProps) {
  const form = useForm<DeviceSettings>({
    defaultValues: deviceSettings,
  });

  useEffect(() => {
    form.reset(deviceSettings);
  }, [deviceSettings, form]);

  const handleSubmit = form.handleSubmit((data) => {
    const numConnectors = data.connectors || 1;
    const socketTypeArray = Array.from({ length: numConnectors }, (_, i) => data.socketType?.[i] || data.socketType?.[0] || 'Type2');
    const cableLockArray = Array.from({ length: numConnectors }, (_, i) => data.cableLock?.[i] ?? data.cableLock?.[0] ?? true);
    const normalized = normalizeDeviceSettings({
      ...data,
      socketType: socketTypeArray,
      cableLock: cableLockArray,
    });
    onSave(normalized);
  });

  const acdc = form.watch('acdc');

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Info className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle>Basic Device Information</CardTitle>
              <CardDescription>Configure basic device properties</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Device Name</label>
              <Input
                {...form.register('deviceName', { required: true })}
                placeholder='Simülatör-01'
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Model</label>
              <Input
                {...form.register('model', { required: true })}
                placeholder='EVSE-Sim v1'
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>AC/DC Type</label>
              <Select
                value={form.watch('acdc')}
                onValueChange={(value) =>
                  form.setValue('acdc', value as 'AC' | 'DC')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {acdcOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Connector Count</label>
              <Input
                type='number'
                min='1'
                max='10'
                {...form.register('connectors', { required: true, valueAsNumber: true })}
                placeholder='1'
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Gauge className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle>Electrical Specifications</CardTitle>
              <CardDescription>
                Configure power and electrical parameters
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-3 gap-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Max Power (kW)</label>
              <Input
                type='number'
                step='0.1'
                min='0'
                {...form.register('maxPowerKw', {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                })}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Nominal Voltage (V)</label>
              <Input
                type='number'
                min='0'
                {...form.register('nominalVoltageV', {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                })}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Max Current (A)</label>
              <Input
                type='number'
                step='0.1'
                min='0'
                {...form.register('maxCurrentA', {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                })}
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Energy (kWh)</label>
              <Input
                type='number'
                step='0.001'
                min='0'
                {...form.register('energyKwh', {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                })}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Phase Rotation</label>
              <Select
                value={form.watch('phaseRotation')}
                onValueChange={(value) => form.setValue('phaseRotation', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {phaseRotationOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Battery Start (%)</label>
              <Input
                type='number'
                min='0'
                max='100'
                {...form.register('batteryStartPercent', {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                  max: 100,
                })}
              />
              <p className='text-xs text-muted-foreground'>
                {acdc === 'DC'
                  ? 'Controls the starting state-of-charge for DC charging simulations.'
                  : 'Uses this value as the initial SoC reported in meter values.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Plug className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle>Connector Configuration</CardTitle>
              <CardDescription>
                Configure individual connector settings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-3 gap-4 items-center'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Connector Type</label>
              <Select
                value={form.watch('socketType.0')}
                onValueChange={(value) => form.setValue('socketType.0', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {socketTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='cableLock'
                checked={form.watch('cableLock.0')}
                onCheckedChange={(checked) =>
                  form.setValue('cableLock.0', !!checked)
                }
              />
              <label htmlFor='cableLock' className='text-sm font-medium'>
                Cable Lock
              </label>
            </div>
            <div className='text-sm text-muted-foreground'>
              Single connector configuration is fixed for this simulator.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle>Features & Settings</CardTitle>
              <CardDescription>
                Configure additional device features
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='hasRfid'
                checked={form.watch('hasRfid')}
                onCheckedChange={(checked) =>
                  form.setValue('hasRfid', !!checked)
                }
              />
              <label htmlFor='hasRfid' className='text-sm font-medium'>
                RFID Reader
              </label>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='hasDisplay'
                checked={form.watch('hasDisplay')}
                onCheckedChange={(checked) =>
                  form.setValue('hasDisplay', !!checked)
                }
              />
              <label htmlFor='hasDisplay' className='text-sm font-medium'>
                Display
              </label>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Timezone</label>
              <Input
                {...form.register('timezone', { required: true })}
                placeholder='Europe/Istanbul'
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Price per kWh</label>
              <Input
                type='number'
                step='0.01'
                min='0'
                {...form.register('pricePerKwh', {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />
      <div className='flex justify-end gap-3 pt-4'>
        <Button type='button' variant='outline' onClick={onCancel}>
          Cancel
        </Button>
        <Button type='submit' className="min-w-[140px]">
          Save Device Settings
        </Button>
      </div>
    </form>
  );
}
