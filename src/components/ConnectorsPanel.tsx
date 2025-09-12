interface BatteryPanelProps {
  cpStatus?: { status: string; errorCode: string };
  connectorStatuses?: Record<number, { status: string; errorCode: string }>;
}

const ConnectorsPanel = (props: BatteryPanelProps) => {
  const { cpStatus, connectorStatuses } = props;

  return (
    <div className='bg-slate-800 border border-slate-600 rounded-xl'>
      <div className='flex items-center justify-between p-3 border-b border-slate-600'>
        <h3 className='text-xs font-semibold text-slate-300'>Statuses</h3>
      </div>
      <div className='space-y-2 py-4'>
        <div className='flex items-center justify-between text-xs px-4'>
          <span className='text-slate-400'>Charge Point</span>
          <span className='font-semibold'>
            {cpStatus?.status || 'Available'} /{' '}
            {cpStatus?.errorCode || 'NoError'}
          </span>
        </div>
        <div className='border-t border-slate-700 pt-2 px-4'>
          <div className='text-xs text-slate-400 mb-1'>Connectors</div>
          <div className='space-y-1 max-h-40 overflow-auto pr-1'>
            {connectorStatuses && Object.keys(connectorStatuses).length > 0 ? (
              Object.entries(connectorStatuses).map(([id, st]) => (
                <div
                  key={id}
                  className='flex items-center justify-between text-xs'
                >
                  <span>#{id}</span>
                  <span className='font-semibold'>
                    {st.status} / {st.errorCode}
                  </span>
                </div>
              ))
            ) : (
              <div className='text-xs text-slate-500'>No statuses yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectorsPanel;
