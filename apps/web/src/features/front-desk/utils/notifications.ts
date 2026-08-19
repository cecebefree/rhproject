type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

type ToastListener = (toast: Toast) => void;

const toastListeners: Set<ToastListener> = new Set();

export function showToast(message: string, type: ToastType = 'info', duration = 3000) {
  const id = Math.random().toString(36).substr(2, 9);
  const toast: Toast = { id, type, message, duration };
  toastListeners.forEach((listener) => listener(toast));
  return id;
}

export function onToastChange(listener: ToastListener) {
  toastListeners.add(listener);
  return () => toastListeners.delete(listener);
}
