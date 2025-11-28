import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { addChargePoint, setStatus } from '@/features/ocpp/ocppSlice';
import { connectWs } from '@/features/ocpp/wsManager';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormValues = {
  label?: string;
  csmsUrl: string;
  cpId: string;
  protocol: 'ocpp1.6' | 'ocpp2.0.1' | string;
};

export function ChargePointSheet({ open, onOpenChange }: Props) {
  const form = useForm<FormValues>({
    defaultValues: {
      label: '',
      csmsUrl: 'wss://localhost:9000/ocpp/',
      cpId: '',
    },
  });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  function buildUrl(csmsUrl: string, cpId: string) {
    let base = csmsUrl.trim();
    if (!base) throw new Error('URL required');
    if (!base.endsWith('/')) base += '/';
    const cp = encodeURIComponent(cpId.trim() || 'SIM');
    const url = new URL(base + cp);
    return url.toString();
  }

  const onSubmit = form.handleSubmit((values) => {
    const action: any = dispatch(
      addChargePoint({
        label: values.label?.trim() || undefined,
        config: {
          csmsUrl: values.csmsUrl.trim(),
          cpId: values.cpId.trim(),
          protocol: 'ocpp1.6',
        },
      })
    );
    const id: string = action.payload.id;
    // Auto-connect immediately after creation (minimal UX)
    try {
      const url = buildUrl(values.csmsUrl.trim(), values.cpId.trim());
      dispatch(setStatus({ id, status: 'connecting' }));
      void connectWs(
        id,
        url,
        'ocpp1.6',
        qc,
        () => dispatch(setStatus({ id, status: 'connected' })),
        () => dispatch(setStatus({ id, status: 'disconnected' }))
      );
    } catch {
      // ignore invalid URL here
    }
    onOpenChange(false);
    navigate(`/cp/${id}`);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right'>
        <SheetHeader>
          <SheetTitle>New Charge Point</SheetTitle>
        </SheetHeader>
        <form className='p-4 grid gap-3' onSubmit={onSubmit}>
          <div className='grid gap-1'>
            <label htmlFor='label' className='text-sm font-medium'>
              Name
            </label>
            <Input
              id='label'
              placeholder='CP name (optional)'
              {...form.register('label')}
            />
          </div>
          <div className='grid gap-1'>
            <label htmlFor='csmsUrl' className='text-sm font-medium'>
              CSMS URL
            </label>
            <Input
              id='csmsUrl'
              placeholder='ws://host/ocpp/'
              {...form.register('csmsUrl', { required: true })}
            />
          </div>
          <div className='grid gap-1'>
            <label htmlFor='cpId' className='text-sm font-medium'>
              CP ID
            </label>
            <Input
              id='cpId'
              placeholder='SIM_001'
              {...form.register('cpId', { required: true })}
            />
          </div>
          <div className='pt-2 flex justify-end gap-2'>
            <Button
              type='button'
              variant='ghost'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type='submit'>Create</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
