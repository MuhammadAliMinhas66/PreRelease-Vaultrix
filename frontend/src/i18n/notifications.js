const DEFAULT_DURATION = { success: 4000, info: 5000, warning: 6500, error: 7000 };
const MAX_VISIBLE = 3;

let toasts = [];
let counter = 0;
const listeners = new Set();

const emit = () => listeners.forEach((listener) => listener());

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getToasts = () => toasts;

export const dismissToast = (id) => {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
};

const push = (tone, message, options = {}) => {
  if (!message) return null;

  const existing = toasts.find((toast) => toast.tone === tone && toast.message === message);
  if (existing) {
    toasts = toasts.map((toast) =>
      toast.id === existing.id ? { ...toast, stamp: toast.stamp + 1 } : toast
    );
    emit();
    return existing.id;
  }

  counter += 1;
  const toast = {
    id: options.id || `toast-${counter}`,
    tone,
    message,
    duration: options.duration ?? DEFAULT_DURATION[tone],
    stamp: 0,
  };
  toasts = [...toasts.filter((item) => item.id !== toast.id), toast].slice(-MAX_VISIBLE);
  emit();
  return toast.id;
};

export const notify = {
  success: (message, options) => push('success', message, options),
  error: (message, options) => push('error', message, options),
  warning: (message, options) => push('warning', message, options),
  info: (message, options) => push('info', message, options),
  dismiss: dismissToast,
};
