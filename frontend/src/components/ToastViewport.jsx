import { useSyncExternalStore } from 'react';
import { AnimatePresence } from 'framer-motion';
import AlertBanner from './AlertBanner.jsx';
import { subscribe, getToasts, dismissToast } from '../i18n/notifications.js';

function ToastViewport() {
  const toasts = useSyncExternalStore(subscribe, getToasts, getToasts);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-end sm:px-4 sm:pt-4"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <AlertBanner
            key={toast.id}
            tone={toast.tone}
            message={toast.message}
            duration={toast.duration}
            stamp={toast.stamp}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default ToastViewport;
