import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DeviceSettings } from '@/types/ocpp';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

interface DeviceSettingsFormProps {
  deviceSettings: DeviceSettings;
  onSave: (settings: DeviceSettings) => void;
  onCancel: () => void;
}

const acdcOptions = ['AC', 'DC'] as const;
const socketTypeOptions = ['Type2', 'CCS', 'CHAdeMO', 'Type1'] as const;
const phaseRotationOptions = ['RST', 'RTS', 'STR', 'SRT', 'TRS', 'TSR'] as const;

export function DeviceSettingsForm({ deviceSettings, onSave, onCancel }: DeviceSettingsFormProps) {
  const form = useForm<DeviceSettings>({
    defaultValues: deviceSettings,
  });

  const { fields: socketTypeFields, replace: replaceSocketTypes } = useFieldArray({
    control: form.control,
    name: 'socketType',
  });

  const { fields: cableLockFields, replace: replaceCableLocks } = useFieldArray({
    control: form.control,
    name: 'cableLock',
  });

  const connectorsCount = form.watch('connectors');

  useEffect(() => {
    const currentSocketTypes = form.getValues('socketType');
    const currentCableLocks = form.getValues('cableLock');
    
    if (currentSocketTypes.length !== connectorsCount) {
      const newSocketTypes = Array(connectorsCount).fill('Type2');
      for (let i = 0; i < Math.min(currentSocketTypes.length, connectorsCount); i++) {
        newSocketTypes[i] = currentSocketTypes[i];
      }
      replaceSocketTypes(newSocketTypes);
    }
    
    if (currentCableLocks.length !== connectorsCount) {
      const newCableLocks = Array(connectorsCount).fill(true);
      for (let i = 0; i < Math.min(currentCableLocks.length, connectorsCount); i++) {
        newCableLocks[i] = currentCableLocks[i];
      }
      replaceCableLocks(newCableLocks);
    }
  }, [connectorsCount, replaceSocketTypes, replaceCableLocks, form]);

  const handleSubmit = form.handleSubmit((data) => {
    onSave(data);
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Device Information</CardTitle>
          <CardDescription>Configure basic device properties</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Device Name</label>
              <Input {...form.register('deviceName', { required: true })} placeholder="Simülatör-01" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Input {...form.register('model', { required: true })} placeholder="EVSE-Sim v1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">AC/DC Type</label>
              <Select
                value={form.watch('acdc')}
                onValueChange={(value) => form.setValue('acdc', value as 'AC' | 'DC')}
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Number of Connectors</label>
              <Input
                type="number"
                min="1"
                max="4"
                {...form.register('connectors', {
                  required: true,
                  valueAsNumber: true,
                  min: 1,
                  max: 4,
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Electrical Specifications</CardTitle>
          <CardDescription>Configure power and electrical parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Power (kW)</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                {...form.register('maxPowerKw', {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nominal Voltage (V)</label>
              <Input
                type="number"
                min="0"
                {...form.register('nominalVoltageV', {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Current (A)</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                {...form.register('maxCurrentA', {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Energy (kWh)</label>
              <Input
                type="number"
                step="0.001"
                min="0"
                {...form.register('energyKwh', {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phase Rotation</label>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connector Configuration</CardTitle>
          <CardDescription>Configure individual connector settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {socketTypeFields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-3 gap-4 items-center">
              <div className="space-y-2">
                <label className="text-sm font-medium">Connector {index + 1} Type</label>
                <Select
                  value={form.watch(`socketType.${index}`)}
                  onValueChange={(value) => form.setValue(`socketType.${index}`, value)}
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
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`cableLock-${index}`}
                  checked={form.watch(`cableLock.${index}`)}
                  onCheckedChange={(checked) => form.setValue(`cableLock.${index}`, !!checked)}
                />
                <label htmlFor={`cableLock-${index}`} className="text-sm font-medium">
                  Cable Lock
                </label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Features & Settings</CardTitle>
          <CardDescription>Configure additional device features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasRfid"
                checked={form.watch('hasRfid')}
                onCheckedChange={(checked) => form.setValue('hasRfid', !!checked)}
              />
              <label htmlFor="hasRfid" className="text-sm font-medium">
                RFID Reader
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasDisplay"
                checked={form.watch('hasDisplay')}
                onCheckedChange={(checked) => form.setValue('hasDisplay', !!checked)}
              />
              <label htmlFor="hasDisplay" className="text-sm font-medium">
                Display
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Timezone</label>
              <Input {...form.register('timezone', { required: true })} placeholder="Europe/Istanbul" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Price per kWh</label>
              <Input
                type="number"
                step="0.01"
                min="0"
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

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Device Settings</Button>
      </div>
    </form>
  );
}

