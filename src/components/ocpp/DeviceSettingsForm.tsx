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
import { normalizeDeviceSettings } from '@/constants/chargePointDefaults';
import type { DeviceSettings } from '@/types/ocpp';
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

  useEffect(() => {
    form.setValue('connectors', 1);
  }, [form]);

  const handleSubmit = form.handleSubmit((data) => {
    const normalized = normalizeDeviceSettings({
      ...data,
      connectors: 1,
      socketType: [data.socketType?.[0] || 'Type2'],
      cableLock: [data.cableLock?.[0] ?? true],
    });
    onSave(normalized);
  });

  const acdc = form.watch('acdc');

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Basic Device Information</CardTitle>
          <CardDescription>Configure basic device properties</CardDescription>
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
              <Input value='1' disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Electrical Specifications</CardTitle>
          <CardDescription>
            Configure power and electrical parameters
          </CardDescription>
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
          <CardTitle>Connector Configuration</CardTitle>
          <CardDescription>
            Configure individual connector settings
          </CardDescription>
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
          <CardTitle>Features & Settings</CardTitle>
          <CardDescription>
            Configure additional device features
          </CardDescription>
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

      <div className='flex justify-end space-x-2'>
        <Button type='button' variant='outline' onClick={onCancel}>
          Cancel
        </Button>
        <Button type='submit'>Save Device Settings</Button>
      </div>
    </form>
  );
}
