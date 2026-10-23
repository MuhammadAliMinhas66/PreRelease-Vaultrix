import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from '../i18n/useTranslation.js';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const LOAD_TIMEOUT_MS = 12000;

export const captchaEnabled = Boolean(SITE_KEY);

let scriptPromise = null;

const loadTurnstile = () => {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('missing')));
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('blocked'));
      };
      document.head.appendChild(script);
      setTimeout(() => reject(new Error('timeout')), LOAD_TIMEOUT_MS);
    });
  }

  return scriptPromise;
};

const Captcha = forwardRef(function Captcha({ onToken }, ref) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useImperativeHandle(ref, () => ({
    reset: () => {
      onToken(null);
      if (window.turnstile && widgetRef.current !== null) {
        try {
          window.turnstile.reset(widgetRef.current);
        } catch (error) {
          setFailed(true);
        }
      }
    },
  }));

  useEffect(() => {
    if (!captchaEnabled) return undefined;

    onToken(null);
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;

        widgetRef.current = turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: 'light',
          appearance: 'interaction-only',
          size: window.innerWidth < 360 ? 'compact' : 'flexible',
          retry: 'auto',
          callback: (token) => {
            setFailed(false);
            onToken(token);
          },
          'expired-callback': () => onToken(null),
          'timeout-callback': () => onToken(null),
          'error-callback': () => {
            onToken(null);
            setFailed(true);
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (window.turnstile && widgetRef.current !== null) {
        try {
          window.turnstile.remove(widgetRef.current);
        } catch (error) {
          widgetRef.current = null;
        }
      }
      widgetRef.current = null;
    };
  }, []);

  if (!captchaEnabled) return null;

  return (
    <div>
      <div ref={containerRef} className="flex w-full justify-center empty:hidden" />
      {failed && (
        <p role="alert" className="text-xs font-medium leading-snug text-red-600">
          {t('captcha.loadFailed')}
        </p>
      )}
    </div>
  );
});

export default Captcha;
