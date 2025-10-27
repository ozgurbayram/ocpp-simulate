import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { ChargePoint } from '@/features/ocpp/ocppSlice';
import { updateDeviceSettings, updateOcppConfiguration } from '@/features/ocpp/ocppSlice';
import { saveDeviceSettings, saveOcppConfiguration } from '@/features/ocpp/storage';
import { normalizeDeviceSettings, normalizeOcppConfiguration } from '@/constants/chargePointDefaults';
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

  const deviceSettings = normalizeDeviceSettings({
    deviceName:
      chargePoint.chargePointConfig?.deviceSettings?.deviceName ??
      `Simülatör-${chargePoint.id}`,
    ...(chargePoint.chargePointConfig?.deviceSettings || {}),
  });

  const ocppConfig = normalizeOcppConfiguration(
    chargePoint.chargePointConfig?.ocppConfig
  );

  const handleDeviceSettingsSave = (settings: DeviceSettings) => {
    const normalized = normalizeDeviceSettings(settings);
    dispatch(updateDeviceSettings({ id: chargePoint.id, deviceSettings: normalized }));
    saveDeviceSettings(chargePoint.id, normalized);
    onOpenChange(false);
  };

  const handleOcppConfigSave = (config: OcppConfiguration) => {
    const normalized = normalizeOcppConfiguration(config);
    dispatch(updateOcppConfiguration({ id: chargePoint.id, ocppConfig: normalized }));
    saveOcppConfiguration(chargePoint.id, normalized);
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
