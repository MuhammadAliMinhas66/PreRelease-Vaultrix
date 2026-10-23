import { motion } from 'framer-motion';
import { useTranslation } from '../i18n/useTranslation.js';

function LockScreen({ display }) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      role="alert"
      aria-live="assertive"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-6 text-center"
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute h-[32rem] w-[32rem] rounded-full bg-white/5 blur-3xl"
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.08, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.span
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative text-sm font-semibold uppercase tracking-[0.3em] text-white/40"
      >
        VAULTRIX
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="relative mt-6 text-2xl font-bold text-white sm:text-3xl"
      >
        {t('auth.lockedHeavyTitle')}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="relative mt-3 max-w-sm text-sm leading-relaxed text-white/55"
      >
        {t('auth.lockedHeavySubtitle')}
      </motion.p>

      <motion.div
        key={display}
        initial={{ opacity: 0.4, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative mt-10 font-mono text-6xl font-extrabold tabular-nums text-white sm:text-7xl"
      >
        {display}
      </motion.div>
    </motion.div>
  );
}

export default LockScreen;
