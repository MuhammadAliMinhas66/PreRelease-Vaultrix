import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation.js';

const toneStyles = {
  error: { icon: XCircle, iconBg: 'bg-red-500', bar: 'bg-red-500' },
  warning: { icon: AlertTriangle, iconBg: 'bg-amber-500', bar: 'bg-amber-500' },
  success: { icon: CheckCircle2, iconBg: 'bg-emerald-500', bar: 'bg-emerald-500' },
  info: { icon: Info, iconBg: 'bg-sky-500', bar: 'bg-sky-500' },
};

function AlertBanner({ tone = 'error', message, duration, stamp = 0, onDismiss }) {
  const { t } = useTranslation();
  const config = toneStyles[tone] || toneStyles.error;
  const Icon = config.icon;
  const [paused, setPaused] = useState(false);
  const remaining = useRef(duration);
  const startedAt = useRef(0);

  useEffect(() => {
    remaining.current = duration;
  }, [duration, stamp, message]);

  useEffect(() => {
    if (!duration || paused) return undefined;
    startedAt.current = Date.now();
    const timer = setTimeout(() => onDismiss?.(), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    };
  }, [duration, paused, stamp, message]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-xl border border-border bg-white shadow-lg shadow-black/10"
    >
      <div className="flex items-start gap-3 px-3.5 py-3">
        <span className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${config.iconBg}`}>
          <Icon className="h-4 w-4 text-white" strokeWidth={2.25} />
        </span>
        <p className="flex-1 break-words text-sm font-semibold leading-snug text-ink">{message}</p>
        <button
          type="button"
          onClick={() => onDismiss?.()}
          aria-label={t('common.dismiss')}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-surface hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {duration > 0 && (
        <span
          key={`${stamp}-${message}`}
          className={`absolute bottom-0 left-0 h-0.5 w-full origin-left ${config.bar} opacity-60`}
          style={{
            animation: `toast-shrink ${duration}ms linear forwards`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      )}
    </motion.div>
  );
}

export default AlertBanner;
