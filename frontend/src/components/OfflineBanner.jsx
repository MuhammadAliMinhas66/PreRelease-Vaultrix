import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation.js';

// A dedicated, full-width status bar for connectivity - distinct from the
// toast stack (ToastViewport), because losing the internet isn't a
// one-off event to flash and dismiss, it's a state the whole app is in
// until it isn't. Mounted once, globally, so it shows on every page
// (including login, where a person is most likely to notice and be
// confused by a silent network failure).
function OfflineBanner() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowRestored(false);
    };
    const handleOnline = () => {
      setIsOffline(false);
      setShowRestored(true);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (!showRestored) return undefined;
    const timer = setTimeout(() => setShowRestored(false), 3000);
    return () => clearTimeout(timer);
  }, [showRestored]);

  return (
    <div aria-live="assertive" className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex justify-center">
      <AnimatePresence>
        {isOffline && (
          <motion.div
            key="offline"
            initial={{ y: -64, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -64, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="pointer-events-auto mx-4 mt-3 flex w-full max-w-md items-center justify-center gap-2.5 rounded-xl border border-border bg-white/80 px-4 py-2.5 text-center text-sm font-medium text-ink shadow-lg backdrop-blur-md"
            style={{ marginTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
              <WifiOff className="h-3.5 w-3.5" />
            </span>
            <span>{t('offline.lost')}</span>
          </motion.div>
        )}
        {!isOffline && showRestored && (
          <motion.div
            key="restored"
            initial={{ y: -64, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -64, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="pointer-events-auto mx-4 mt-3 flex w-full max-w-md items-center justify-center gap-2.5 rounded-xl border border-border bg-white/80 px-4 py-2.5 text-center text-sm font-medium text-ink shadow-lg backdrop-blur-md"
            style={{ marginTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
              <Wifi className="h-3.5 w-3.5" />
            </span>
            <span>{t('offline.restored')}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default OfflineBanner;
