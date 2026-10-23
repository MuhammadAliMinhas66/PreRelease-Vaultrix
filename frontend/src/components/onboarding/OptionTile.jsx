import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

function OptionTile({ selected, onClick, children, ariaLabel, className = '' }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={ariaLabel}
      className={`relative min-w-0 rounded-xl border p-3.5 text-start outline-none transition focus-visible:ring-2 focus-visible:ring-ink/30 ${
        selected
          ? 'border-ink bg-ink text-white shadow-lg shadow-black/10'
          : 'border-border bg-white text-ink hover:border-ink/40 hover:bg-surface'
      } ${className}`}
    >
      {children}
      {selected && (
        <motion.span
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className="absolute end-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-ink"
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </motion.span>
      )}
    </motion.button>
  );
}

export default OptionTile;
