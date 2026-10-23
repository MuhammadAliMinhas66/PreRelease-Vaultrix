import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation.js';

function LockTimerBadge({ display }) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      role="status"
      aria-live="polite"
      className="fixed right-4 top-16 z-30 sm:right-6 sm:top-20"
    >
      <div className="relative flex flex-col items-center">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-ink/60 blur-lg"
          animate={{ opacity: [0.35, 0.75, 0.35], scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative flex items-center gap-2 rounded-full bg-ink px-4 py-2 shadow-lg shadow-black/25 ring-1 ring-white/10">
          <Lock className="h-3.5 w-3.5 text-white/70" strokeWidth={2.5} />
          <motion.span
            key={display}
            initial={{ opacity: 0.5, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="font-mono text-base font-extrabold tabular-nums tracking-wide text-white sm:text-lg"
          >
            {display}
          </motion.span>
        </div>

        <span className="relative mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          {t('auth.lockedBadgeLabel')}
        </span>
      </div>
    </motion.div>
  );
}

export default LockTimerBadge;
