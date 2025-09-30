// @ts-ignore
export interface OCPPHandlers {
  call: (action: string, payload: any) => Promise<any>;
  reply: (id: string, payload: any) => void;
  replyError: (
    id: string,
    code: string,
    description: string,
    details: any
  ) => void;
  startTransaction: (idTag?: string) => Promise<any>;
  stopTransaction: (idTag?: string) => Promise<any>;
}

export const createOCPPHandlers = (
  call: OCPPHandlers['call'],
  reply: OCPPHandlers['reply'],
  _replyError: OCPPHandlers['replyError'],
  startTransaction: OCPPHandlers['startTransaction'],
  stopTransaction: OCPPHandlers['stopTransaction'],
  getOcppConfig?: () => any
) => ({
  RemoteStartTransaction: async (id: string, p: any) => {
    try {
      await call('Authorize', { idTag: p?.idTag || 'REMOTE' });
      await startTransaction(p?.idTag || 'REMOTE');
      reply(id, { status: 'Accepted' });
    } catch {
      reply(id, { status: 'Rejected' });
    }
  },
  RemoteStopTransaction: async (id: string) => {
    try {
      await stopTransaction('REMOTE');
      reply(id, { status: 'Accepted' });
    } catch {
      reply(id, { status: 'Rejected' });
    }
  },
  Reset: (id: string) => reply(id, { status: 'Accepted' }),
  GetConfiguration: (id: string, p: any) => {
    const keys = p?.key || [];
    const ocppConfig = getOcppConfig?.() || {};

    const conf = [
      {
        key: 'HeartbeatInterval',
        readonly: false,
        value: String(ocppConfig.HeartbeatInterval || 60),
      },
      {
        key: 'ConnectionTimeOut',
        readonly: false,
        value: String(ocppConfig.ConnectionTimeOut || 120),
      },
      {
        key: 'MeterValueSampleInterval',
        readonly: false,
        value: String(ocppConfig.MeterValueSampleInterval || 15),
      },
      {
        key: 'ClockAlignedDataInterval',
        readonly: false,
        value: String(ocppConfig.ClockAlignedDataInterval || 300),
      },
      {
        key: 'MeterValuesSampledData',
        readonly: false,
        value: String(
          ocppConfig.MeterValuesSampledData ||
            'Energy.Active.Import.Register,Voltage,Current'
        ),
      },
      {
        key: 'MeterValuesAlignedData',
        readonly: false,
        value: String(
          ocppConfig.MeterValuesAlignedData || 'Energy.Active.Import.Register'
        ),
      },
      {
        key: 'StopTxnSampledData',
        readonly: false,
        value: String(
          ocppConfig.StopTxnSampledData || 'Power.Active.Import,Voltage'
        ),
      },
      {
        key: 'StopTxnAlignedData',
        readonly: false,
        value: String(
          ocppConfig.StopTxnAlignedData || 'Energy.Active.Import.Register'
        ),
      },
      {
        key: 'AuthorizeRemoteTxRequests',
        readonly: false,
        value: String(ocppConfig.AuthorizeRemoteTxRequests !== false),
      },
      {
        key: 'LocalAuthorizeOffline',
        readonly: false,
        value: String(ocppConfig.LocalAuthorizeOffline !== false),
      },
      {
        key: 'LocalPreAuthorize',
        readonly: false,
        value: String(ocppConfig.LocalPreAuthorize === true),
      },
      {
        key: 'AuthorizationCacheEnabled',
        readonly: false,
        value: String(ocppConfig.AuthorizationCacheEnabled !== false),
      },
      {
        key: 'AllowOfflineTxForUnknownId',
        readonly: false,
        value: String(ocppConfig.AllowOfflineTxForUnknownId === true),
      },
      {
        key: 'StopTransactionOnEVSideDisconnect',
        readonly: false,
        value: String(ocppConfig.StopTransactionOnEVSideDisconnect !== false),
      },
      {
        key: 'StopTransactionOnInvalidId',
        readonly: false,
        value: String(ocppConfig.StopTransactionOnInvalidId !== false),
      },
      {
        key: 'MaxEnergyOnInvalidId',
        readonly: false,
        value: String(ocppConfig.MaxEnergyOnInvalidId || 0),
      },
      {
        key: 'MinimumStatusDuration',
        readonly: false,
        value: String(ocppConfig.MinimumStatusDuration || 0),
      },
      {
        key: 'NumberOfConnectors',
        readonly: true,
        value: String(ocppConfig.NumberOfConnectors || 2),
      },
      {
        key: 'TransactionMessageAttempts',
        readonly: false,
        value: String(ocppConfig.TransactionMessageAttempts || 3),
      },
      {
        key: 'TransactionMessageRetryInterval',
        readonly: false,
        value: String(ocppConfig.TransactionMessageRetryInterval || 10),
      },
      {
        key: 'UnlockConnectorOnEVSideDisconnect',
        readonly: false,
        value: String(ocppConfig.UnlockConnectorOnEVSideDisconnect !== false),
      },
      {
        key: 'BlinkRepeat',
        readonly: false,
        value: String(ocppConfig.BlinkRepeat || 3),
      },
      {
        key: 'LightIntensity',
        readonly: false,
        value: String(ocppConfig.LightIntensity || 50),
      },
      {
        key: 'ConnectorPhaseRotation',
        readonly: false,
        value: String(ocppConfig.ConnectorPhaseRotation || '1.RST,2.RST'),
      },
      {
        key: 'GetConfigurationMaxKeys',
        readonly: true,
        value: String(ocppConfig.GetConfigurationMaxKeys || 50),
      },
      {
        key: 'SupportedFeatureProfiles',
        readonly: true,
        value: String(
          ocppConfig.SupportedFeatureProfiles ||
            'Core,RemoteTrigger,Firmware,Reservation,LocalAuthList,MeterValues'
        ),
      },
      {
        key: 'WsSecure',
        readonly: true,
        value: String(ocppConfig.WsSecure === true),
      },
      {
        key: 'FirmwareVersion',
        readonly: true,
        value: String(ocppConfig.FirmwareVersion || '1.0.0-web'),
      },
      {
        key: 'ChargeProfileEnabled',
        readonly: true,
        value: String(ocppConfig.ChargeProfileEnabled === true),
      },
      {
        key: 'ReservationEnabled',
        readonly: true,
        value: String(ocppConfig.ReservationEnabled === true),
      },
    ];

    reply(id, {
      configurationKey: keys.length
        ? conf.filter((c) => keys.includes(c.key))
        : conf,
      unknownKey: keys.length
        ? keys.filter((k: string) => !conf.some((c) => c.key === k))
        : [],
    });
  },
  ChangeAvailability: (id: string) => reply(id, { status: 'Accepted' }),
  ChangeConfiguration: (id: string, p: any) => {
    const { key, value } = p || {};
    if (!key) {
      reply(id, { status: 'Rejected' });
      return;
    }

    const readonlyKeys = [
      'NumberOfConnectors',
      'GetConfigurationMaxKeys',
      'SupportedFeatureProfiles',
      'WsSecure',
      'FirmwareVersion',
      'ChargeProfileEnabled',
      'ReservationEnabled',
    ];

    if (readonlyKeys.includes(key)) {
      reply(id, { status: 'Rejected' });
      return;
    }

    reply(id, { status: 'Accepted' });
  },
});
