import { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Circle, Loader2, X } from 'lucide-react';
import FormField from './FormField.jsx';
import { useEmailCheck } from '../hooks/useEmailCheck.js';
import { useTranslation } from '../i18n/useTranslation.js';

function RuleRow({ state, label }) {
  const tone =
    state === 'pass'
      ? 'text-emerald-700'
      : state === 'fail'
        ? 'text-red-600'
        : 'text-muted';

  return (
    <li className={`flex items-start gap-2 text-xs leading-snug ${tone}`}>
      <span className="mt-px flex h-4 w-4 flex-shrink-0 items-center justify-center">
        {state === 'pass' && <Check className="h-4 w-4" strokeWidth={2.5} />}
        {state === 'fail' && <X className="h-4 w-4" strokeWidth={2.5} />}
        {state === 'checking' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {state === 'idle' && <Circle className="h-2.5 w-2.5" />}
      </span>
      <span className="min-w-0 flex-1 break-words">{label}</span>
    </li>
  );
}

function EmailField({
  label,
  value,
  onChange,
  error,
  checkProvider = false,
  onStatusChange,
  placeholder,
  autoComplete = 'email',
  autoFocus = false,
  disabled = false,
}) {
  const { t } = useTranslation();
  const popupId = useId();
  const [focused, setFocused] = useState(false);
  const [settled, setSettled] = useState(false);
  const { rules, providerStatus, status, valid } = useEmailCheck(value, { checkProvider });

  useEffect(() => {
    onStatusChange?.(status);
  }, [status]);

  useEffect(() => {
    setSettled(false);
    if (!valid) return undefined;
    const timer = setTimeout(() => setSettled(true), 1600);
    return () => clearTimeout(timer);
  }, [valid, value]);

  const open = focused && value.length > 0 && !settled;

  const providerState = (() => {
    if (!checkProvider) return null;
    if (providerStatus === 'ok' || providerStatus === 'unknown') return 'pass';
    if (providerStatus === 'disposable' || providerStatus === 'no_mail_server') return 'fail';
    if (providerStatus === 'checking') return 'checking';
    return 'idle';
  })();

  const providerLabel = (() => {
    if (providerStatus === 'disposable') return t('emailCheck.disposable');
    if (providerStatus === 'no_mail_server') return t('emailCheck.noMail');
    if (providerStatus === 'checking') return t('emailCheck.checking');
    return t('emailCheck.provider');
  })();

  const ruleState = (passed) => (value ? (passed ? 'pass' : 'idle') : 'idle');

  return (
    <div className="relative">
      <FormField
        label={label}
        type="email"
        inputMode="email"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        dir="ltr"
        maxLength={254}
        error={error}
        aria-controls={open ? popupId : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={popupId}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="-mx-2 overflow-hidden px-2 pb-3 sm:absolute sm:left-0 sm:right-0 sm:top-full sm:z-30 sm:mx-0 sm:px-0 sm:pb-4"
          >
            <div className="mt-2 rounded-xl border border-border bg-white p-3.5 shadow-lg shadow-black/10">
              {valid ? (
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                  {t('emailCheck.valid')}
                </p>
              ) : (
                <>
                  <p className="mb-2 text-xs font-semibold text-ink">{t('emailCheck.title')}</p>
                  <ul className="flex flex-col gap-1.5">
                    <RuleRow state={ruleState(rules.at)} label={t('emailCheck.at')} />
                    <RuleRow state={ruleState(rules.local)} label={t('emailCheck.local')} />
                    <RuleRow state={ruleState(rules.domainValid)} label={t('emailCheck.domain')} />
                    {checkProvider && <RuleRow state={providerState} label={providerLabel} />}
                  </ul>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default EmailField;
