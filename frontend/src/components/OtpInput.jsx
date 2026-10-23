import { useEffect, useId, useRef } from 'react';
import { motion } from 'framer-motion';

function OtpInput({ length = 6, value, onChange, onComplete, disabled = false, hasError = false, errorStamp = 0, label }) {
  const refs = useRef([]);
  const baseId = useId();
  const digits = Array.from({ length }, (_, index) => value[index] || '');

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (value.length === 0 && !disabled) refs.current[0]?.focus();
  }, [value, disabled]);

  const commit = (next) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  const handleChange = (index, event) => {
    const incoming = event.target.value.replace(/\D/g, '');
    if (!incoming) return;

    if (incoming.length > 1) {
      const merged = value.slice(0, index) + incoming;
      commit(merged);
      refs.current[Math.min(merged.replace(/\D/g, '').length, length - 1)]?.focus();
      return;
    }

    const chars = digits.slice();
    chars[index] = incoming;
    commit(chars.join(''));
    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index]) {
        const chars = digits.slice();
        chars[index] = '';
        onChange(chars.join('').slice(0, length));
      } else if (index > 0) {
        const chars = digits.slice();
        chars[index - 1] = '';
        onChange(chars.join(''));
        refs.current[index - 1]?.focus();
      }
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    event.preventDefault();
    commit(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <motion.div
      key={errorStamp}
      dir="ltr"
      role="group"
      aria-label={label}
      animate={hasError ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      className="grid gap-2 sm:gap-2.5"
      style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          id={`${baseId}-${index}`}
          name={`${baseId}-digit-${index}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={index === 0 ? length : 1}
          value={digit}
          disabled={disabled}
          aria-label={`${label} ${index + 1}`}
          aria-invalid={hasError ? 'true' : undefined}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          className={`h-12 w-full min-w-0 rounded-lg border bg-white text-center text-xl font-semibold text-ink outline-none transition focus:ring-2 focus:ring-accent/20 disabled:opacity-60 sm:h-14 sm:text-2xl ${
            hasError
              ? 'border-red-400 focus:border-red-500'
              : digit
                ? 'border-accent'
                : 'border-border focus:border-accent'
          }`}
        />
      ))}
    </motion.div>
  );
}

export default OtpInput;
