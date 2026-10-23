import { useEffect } from 'react';
import { useTranslation } from '../i18n/useTranslation.js';
import { notify } from '../i18n/notifications.js';

const SLOW_REQUEST_MS = 8000;
const SLOW_TOAST_ID = 'slow-request';

function Button({ children, loading, loadingLabel, disabled, ...rest }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading) return undefined;
    const timer = setTimeout(() => notify.info(t('info.slowRequest'), { id: SLOW_TOAST_ID }), SLOW_REQUEST_MS);
    return () => {
      clearTimeout(timer);
      notify.dismiss(SLOW_TOAST_ID);
    };
  }, [loading]);

  return (
    <button
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={loading || disabled}
      aria-busy={loading ? 'true' : undefined}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}

export default Button;
