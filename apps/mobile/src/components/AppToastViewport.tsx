import {
  ToastViewport,
  type ToastMessage,
  type ToastTone,
  type ToastViewportProps
} from '@lcl/ui';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export const APP_TOAST_HOST_ID = 'app-toast-host';

export const useToastQueue = (idPrefix: string) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (tone: ToastTone, title: string, detail?: string) => {
      toastIdRef.current += 1;
      const id = `${idPrefix}-${toastIdRef.current}`;
      const toast: ToastMessage =
        detail === undefined ? { id, tone, title } : { id, tone, title, detail };
      setToasts((current) => [...current.slice(-2), toast]);
    },
    [idPrefix]
  );

  return { dismissToast, pushToast, toasts };
};

export const AppToastViewport = (props: ToastViewportProps) => {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    setHost(document.getElementById(APP_TOAST_HOST_ID));
  }, []);

  return host ? createPortal(<ToastViewport {...props} />, host) : null;
};
