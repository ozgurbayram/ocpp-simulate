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
import type { OcppConfiguration } from '@/types/ocpp';
import { useFieldArray, useForm } from 'react-hook-form';

interface OcppConfigurationFormProps {
  ocppConfig: OcppConfiguration;
  onSave: (config: OcppConfiguration) => void;
  onCancel: () => void;
}

export function OcppConfigurationForm({
  ocppConfig,
  onSave,
  onCancel,
}: OcppConfigurationFormProps) {
  const form = useForm<OcppConfiguration>({
    defaultValues: ocppConfig,
  });

  const { fields: availabilityFields, replace: replaceAvailability } =
    useFieldArray({
      control: form.control,
      name: 'Availability',
    });

  const {
    fields: whitelistFields,
    append: appendWhitelist,
    remove: removeWhitelist,
  } = useFieldArray({
    control: form.control,
    name: 'IdTagWhitelist',
  });

  const handleSubmit = form.handleSubmit((data) => {
    onSave(data);
  });

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Connection & Heartbeat</CardTitle>
          <CardDescription>
            Configure connection timing and heartbeat settings
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-3 gap-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>
                Heartbeat Interval (s)
              </label>
              <Input
                type='number'
                min='10'
                max='3600'
                {...form.register('HeartbeatInterval', {
                  required: true,
                  valueAsNumber: true,
                  min: 10,
                  max: 3600,
                })}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>
                Connection Timeout (s)
              </label>
              <Input
                type='number'
                min='30'
                max='600'
                {...form.register('ConnectionTimeOut', {
                  required: true,
                  valueAsNumber: true,
                  min: 30,
                  max: 600,
                })}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>
                Boot Notification Interval (s)
              </label>
              <Input
                type='number'
                min='30'
                max='3600'
                {...form.register('BootNotification.intervalHint', {
                  required: true,
                  valueAsNumber: true,
                  min: 30,
                  max: 3600,
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meter Values</CardTitle>
          <CardDescription>
            Configure meter value sampling and reporting
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Sample Interval (s)</label>
              <Input
                type='number'
                min='5'
                max='900'
                {...form.register('MeterValueSampleInterval', {
                  required: true,
                  valueAsNumber: true,
                  min: 5,
                  max: 900,
                })}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>
                Clock Aligned Interval (s)
              </label>
              <Input
                type='number'
                min='60'
                max='3600'
                {...form.register('ClockAlignedDataInterval', {
                  required: true,
                  valueAsNumber: true,
                  min: 60,
                  max: 3600,
                })}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <label className='text-sm font-medium'>Sampled Data Types</label>
            <Input
              {...form.register('MeterValuesSampledData', { required: true })}
              placeholder='Energy.Active.Import.Register,Voltage,Current'
            />
            <p className='text-xs text-muted-foreground'>
              Comma-separated list of measurands to sample
            </p>
          </div>

          <div className='space-y-2'>
            <label className='text-sm font-medium'>Aligned Data Types</label>
            <Input
              {...form.register('MeterValuesAlignedData', { required: true })}
              placeholder='Energy.Active.Import.Register'
            />
            <p className='text-xs text-muted-foreground'>
              Comma-separated list of measurands for clock-aligned data
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Settings</CardTitle>
          <CardDescription>
            Configure transaction behavior and stop conditions
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-3 gap-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Message Attempts</label>
              <Input
                type='number'
                min='1'
                max='10'
                {...form.register('TransactionMessageAttempts', {
                  required: true,
                  valueAsNumber: true,
                  min: 1,
                  max: 10,
                })}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Retry Interval (s)</label>
              <Input
                type='number'
                min='1'
                max='300'
                {...form.register('TransactionMessageRetryInterval', {
                  required: true,
                  valueAsNumber: true,
                  min: 1,
                  max: 300,
                })}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>
                Max Energy on Invalid ID (Wh)
              </label>
              <Input
                type='number'
                min='0'
                {...form.register('MaxEnergyOnInvalidId', {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                })}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <label className='text-sm font-medium'>Stop Transaction Data</label>
            <Input
              {...form.register('StopTxnSampledData', { required: true })}
              placeholder='Power.Active.Import,Voltage'
            />
          </div>

          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              Stop Transaction Aligned Data
            </label>
            <Input
              {...form.register('StopTxnAlignedData', { required: true })}
              placeholder='Energy.Active.Import.Register'
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='StopTransactionOnEVSideDisconnect'
                checked={form.watch('StopTransactionOnEVSideDisconnect')}
                onCheckedChange={(checked) =>
                  form.setValue('StopTransactionOnEVSideDisconnect', !!checked)
                }
              />
              <label
                htmlFor='StopTransactionOnEVSideDisconnect'
                className='text-sm font-medium'
              >
                Stop on EV Disconnect
              </label>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='StopTransactionOnInvalidId'
                checked={form.watch('StopTransactionOnInvalidId')}
                onCheckedChange={(checked) =>
                  form.setValue('StopTransactionOnInvalidId', !!checked)
                }
              />
              <label
                htmlFor='StopTransactionOnInvalidId'
                className='text-sm font-medium'
              >
                Stop on Invalid ID
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Authorization Settings</CardTitle>
          <CardDescription>
            Configure authorization and authentication behavior
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='AuthorizeRemoteTxRequests'
                checked={form.watch('AuthorizeRemoteTxRequests')}
                onCheckedChange={(checked) =>
                  form.setValue('AuthorizeRemoteTxRequests', !!checked)
                }
              />
              <label
                htmlFor='AuthorizeRemoteTxRequests'
                className='text-sm font-medium'
              >
                Authorize Remote Transactions
              </label>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='LocalAuthorizeOffline'
                checked={form.watch('LocalAuthorizeOffline')}
                onCheckedChange={(checked) =>
                  form.setValue('LocalAuthorizeOffline', !!checked)
                }
              />
              <label
                htmlFor='LocalAuthorizeOffline'
                className='text-sm font-medium'
              >
                Local Authorize Offline
              </label>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='LocalPreAuthorize'
                checked={form.watch('LocalPreAuthorize')}
                onCheckedChange={(checked) =>
                  form.setValue('LocalPreAuthorize', !!checked)
                }
              />
              <label
                htmlFor='LocalPreAuthorize'
                className='text-sm font-medium'
              >
                Local Pre-Authorize
              </label>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='AuthorizationCacheEnabled'
                checked={form.watch('AuthorizationCacheEnabled')}
                onCheckedChange={(checked) =>
                  form.setValue('AuthorizationCacheEnabled', !!checked)
                }
              />
              <label
                htmlFor='AuthorizationCacheEnabled'
                className='text-sm font-medium'
              >
                Authorization Cache
              </label>
            </div>
          </div>

          <div className='flex items-center space-x-2'>
            <Checkbox
              id='AllowOfflineTxForUnknownId'
              checked={form.watch('AllowOfflineTxForUnknownId')}
              onCheckedChange={(checked) =>
                form.setValue('AllowOfflineTxForUnknownId', !!checked)
              }
            />
            <label
              htmlFor='AllowOfflineTxForUnknownId'
              className='text-sm font-medium'
            >
              Allow Offline Transactions for Unknown ID
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
          <CardDescription>
            Configure system behavior and capabilities
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-3 gap-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>
                Number of Connectors
              </label>
              <Input
                type='number'
                min='1'
                max='4'
                {...form.register('NumberOfConnectors', {
                  required: true,
                  valueAsNumber: true,
                  min: 1,
                  max: 4,
                })}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>
                Minimum Status Duration (s)
              </label>
              <Input
                type='number'
                min='0'
                max='300'
                {...form.register('MinimumStatusDuration', {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                  max: 300,
                })}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Get Config Max Keys</label>
              <Input
                type='number'
                min='10'
                max='100'
                {...form.register('GetConfigurationMaxKeys', {
                  required: true,
                  valueAsNumber: true,
                  min: 10,
                  max: 100,
                })}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              Supported Feature Profiles
            </label>
            <Input
              {...form.register('SupportedFeatureProfiles', { required: true })}
              placeholder='Core,RemoteTrigger,Firmware,Reservation,LocalAuthList,MeterValues'
            />
          </div>

          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              Connector Phase Rotation
            </label>
            <Input
              {...form.register('ConnectorPhaseRotation', { required: true })}
              placeholder='1.RST,2.RST'
            />
          </div>

          <div className='space-y-2'>
            <label className='text-sm font-medium'>Firmware Version</label>
            <Input
              {...form.register('FirmwareVersion', { required: true })}
              placeholder='1.0.0-web'
            />
          </div>

          <div className='grid grid-cols-3 gap-4'>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='UnlockConnectorOnEVSideDisconnect'
                checked={form.watch('UnlockConnectorOnEVSideDisconnect')}
                onCheckedChange={(checked) =>
                  form.setValue('UnlockConnectorOnEVSideDisconnect', !!checked)
                }
              />
              <label
                htmlFor='UnlockConnectorOnEVSideDisconnect'
                className='text-sm font-medium'
              >
                Unlock on EV Disconnect
              </label>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='ChargeProfileEnabled'
                checked={form.watch('ChargeProfileEnabled')}
                onCheckedChange={(checked) =>
                  form.setValue('ChargeProfileEnabled', !!checked)
                }
              />
              <label
                htmlFor='ChargeProfileEnabled'
                className='text-sm font-medium'
              >
                Charge Profile Support
              </label>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='ReservationEnabled'
                checked={form.watch('ReservationEnabled')}
                onCheckedChange={(checked) =>
                  form.setValue('ReservationEnabled', !!checked)
                }
              />
              <label
                htmlFor='ReservationEnabled'
                className='text-sm font-medium'
              >
                Reservation Support
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display & LED Settings</CardTitle>
          <CardDescription>Configure display and LED behavior</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Blink Repeat Count</label>
              <Input
                type='number'
                min='1'
                max='10'
                {...form.register('BlinkRepeat', {
                  required: true,
                  valueAsNumber: true,
                  min: 1,
                  max: 10,
                })}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Light Intensity (%)</label>
              <Input
                type='number'
                min='0'
                max='100'
                {...form.register('LightIntensity', {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                  max: 100,
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connector Availability & ID Tags</CardTitle>
          <CardDescription>
            Configure connector availability and authorized ID tags
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              Connector Availability
            </label>
            {availabilityFields.map((field, index) => (
              <div key={field.id} className='flex items-center space-x-2'>
                <span className='text-sm'>Connector {index + 1}:</span>
                <Input
                  {...form.register(`Availability.${index}` as const)}
                  placeholder='Operative'
                  className='w-32'
                />
              </div>
            ))}
          </div>

          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <label className='text-sm font-medium'>Authorized ID Tags</label>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => appendWhitelist('')}
              >
                Add Tag
              </Button>
            </div>
            {whitelistFields.map((field, index) => (
              <div key={field.id} className='flex items-center space-x-2'>
                <Input
                  {...form.register(`IdTagWhitelist.${index}` as const)}
                  placeholder='04A1B23C'
                  className='flex-1'
                />
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => removeWhitelist(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div className='flex items-center space-x-2'>
            <Checkbox
              id='WsSecure'
              checked={form.watch('WsSecure')}
              onCheckedChange={(checked) =>
                form.setValue('WsSecure', !!checked)
              }
            />
            <label htmlFor='WsSecure' className='text-sm font-medium'>
              WebSocket Secure (WSS)
            </label>
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end space-x-2'>
        <Button type='button' variant='outline' onClick={onCancel}>
          Cancel
        </Button>
        <Button type='submit'>Save OCPP Configuration</Button>
      </div>
    </form>
  );
}
