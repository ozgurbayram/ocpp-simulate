import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChargePointSheet({ open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right'>
        <SheetHeader>
          <SheetTitle>New Charge Point</SheetTitle>
        </SheetHeader>
        <div className='p-4 text-sm text-muted-foreground'>
          {/* TODO: Add charge point form fields here (csmsUrl, cpId, protocol, label, etc.) */}
          Form goes here.
        </div>
      </SheetContent>
    </Sheet>
  );
}
