import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { ChargePoint } from '@/features/ocpp/ocppSlice';
import { updateDeviceSettings, updateOcppConfiguration } from '@/features/ocpp/ocppSlice';
import { saveDeviceSettings, saveOcppConfiguration } from '@/features/ocpp/storage';
import type { DeviceSettings, OcppConfiguration } from '@/types/ocpp';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { DeviceSettingsForm } from './DeviceSettingsForm';
import { OcppConfigurationForm } from './OcppConfigurationForm';

interface ChargePointAdvancedConfigSheetProps {
  chargePoint: ChargePoint;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChargePointAdvancedConfigSheet({
  chargePoint,
  open,
  onOpenChange,
}: ChargePointAdvancedConfigSheetProps) {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('device');

  const deviceSettings = chargePoint.chargePointConfig?.deviceSettings || {
    deviceName: `Simülatör-${chargePoint.id}`,
    model: 'EVSE-Sim v1',
    acdc: 'AC' as const,
    connectors: 2,
    maxPowerKw: 22,
    nominalVoltageV: 400,
    maxCurrentA: 32,
    energyKwh: 0,
    socketType: ['Type2', 'Type2'],
    cableLock: [true, true],
    hasRfid: true,
    hasDisplay: true,
    timezone: 'Europe/Istanbul',
    phaseRotation: 'RST',
    pricePerKwh: 0.25,
  };

  const ocppConfig = chargePoint.chargePointConfig?.ocppConfig || {
    HeartbeatInterval: 60,
    ConnectionTimeOut: 120,
    MeterValueSampleInterval: 15,
    ClockAlignedDataInterval: 300,
    MeterValuesSampledData: 'Energy.Active.Import.Register,Voltage,Current',
    MeterValuesAlignedData: 'Energy.Active.Import.Register',
    StopTxnSampledData: 'Power.Active.Import,Voltage',
    StopTxnAlignedData: 'Energy.Active.Import.Register',
    AuthorizeRemoteTxRequests: true,
    LocalAuthorizeOffline: true,
    LocalPreAuthorize: false,
    AuthorizationCacheEnabled: true,
    AllowOfflineTxForUnknownId: false,
    StopTransactionOnEVSideDisconnect: true,
    StopTransactionOnInvalidId: true,
    MaxEnergyOnInvalidId: 0,
    MinimumStatusDuration: 0,
    NumberOfConnectors: 2,
    TransactionMessageAttempts: 3,
    TransactionMessageRetryInterval: 10,
    UnlockConnectorOnEVSideDisconnect: true,
    BlinkRepeat: 3,
    LightIntensity: 50,
    ConnectorPhaseRotation: '1.RST,2.RST',
    GetConfigurationMaxKeys: 50,
    SupportedFeatureProfiles: 'Core,RemoteTrigger,Firmware,Reservation,LocalAuthList,MeterValues',
    Availability: ['Operative', 'Operative'],
    IdTagWhitelist: ['04A1B23C', '7B3C9F22'],
    WsSecure: false,
    'BootNotification.intervalHint': 60,
    FirmwareVersion: '1.0.0-web',
    ChargeProfileEnabled: false,
    ReservationEnabled: false,
  };

  const handleDeviceSettingsSave = (settings: DeviceSettings) => {
    dispatch(updateDeviceSettings({ id: chargePoint.id, deviceSettings: settings }));
    saveDeviceSettings(chargePoint.id, settings);
    onOpenChange(false);
  };

  const handleOcppConfigSave = (config: OcppConfiguration) => {
    dispatch(updateOcppConfiguration({ id: chargePoint.id, ocppConfig: config }));
    saveOcppConfiguration(chargePoint.id, config);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Advanced Configuration - {chargePoint.label}</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6">
          <div className="flex space-x-2 border-b mb-6">
            <Button
              variant={activeTab === 'device' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('device')}
              className="rounded-b-none"
            >
              Device Settings
            </Button>
            <Button
              variant={activeTab === 'ocpp' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('ocpp')}
              className="rounded-b-none"
            >
              OCPP Configuration
            </Button>
          </div>
          
          {activeTab === 'device' && (
            <DeviceSettingsForm
              deviceSettings={deviceSettings}
              onSave={handleDeviceSettingsSave}
              onCancel={handleCancel}
            />
          )}
          
          {activeTab === 'ocpp' && (
            <OcppConfigurationForm
              ocppConfig={ocppConfig}
              onSave={handleOcppConfigSave}
              onCancel={handleCancel}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
