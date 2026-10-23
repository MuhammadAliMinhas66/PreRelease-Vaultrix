import { motion } from 'framer-motion';

function WelcomeScreen({ title, subtitle, duration = 1800 }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      role="status"
      aria-live="polite"
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-ink px-6 text-center"
    >
      <motion.svg
        width="88"
        height="88"
        viewBox="0 0 88 88"
        fill="none"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.circle
          cx="44"
          cy="44"
          r="40"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="2"
        />
        <motion.circle
          cx="44"
          cy="44"
          r="40"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ rotate: -90, transformOrigin: '44px 44px' }}
        />
        <motion.path
          d="M28 45.5l11 11L61 33"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, delay: 0.55, ease: 'easeOut' }}
        />
      </motion.svg>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.75 }}
        className="mt-8 text-3xl font-semibold text-white sm:text-4xl"
      >
        {title}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.9 }}
        className="mt-2 text-sm text-white/60 sm:text-base"
      >
        {subtitle}
      </motion.p>

      <div className="mt-10 h-1 w-40 overflow-hidden rounded-full bg-white/15">
        <motion.div
          className="h-full rounded-full bg-white"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}

export default WelcomeScreen;
