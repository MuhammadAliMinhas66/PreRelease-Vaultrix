import { motion } from 'framer-motion';

function PageLoader({ title, label }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center"
    >
      {title && (
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="text-2xl font-semibold text-ink"
        >
          {title}
        </motion.h1>
      )}
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-ink" />
      {label && <p className="text-sm text-muted">{label}</p>}
    </motion.div>
  );
}

export default PageLoader;
