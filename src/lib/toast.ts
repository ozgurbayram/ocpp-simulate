import { toast } from 'sonner';

export const showToast = {
  success: (message: string, title?: string) => {
    toast.success(title || 'Success', {
      description: message,
    });
  },
  
  error: (message: string, title?: string) => {
    toast.error(title || 'Error', {
      description: message,
    });
  },
  
  info: (message: string, title?: string) => {
    toast.info(title || 'Info', {
      description: message,
    });
  },
  
  warning: (message: string, title?: string) => {
    toast.warning(title || 'Warning', {
      description: message,
    });
  },
  
  loading: (message: string, title?: string) => {
    return toast.loading(title || 'Loading', {
      description: message,
    });
  },
  
  dismiss: (toastId: string | number) => {
    toast.dismiss(toastId);
  },
};
