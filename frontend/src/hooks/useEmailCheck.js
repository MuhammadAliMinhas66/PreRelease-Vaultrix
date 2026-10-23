import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluateEmail } from '../utils/emailRules.js';
import { validateEmail } from '../services/authService.js';

const DEBOUNCE_MS = 450;

export function useEmailCheck(email, { checkProvider = false } = {}) {
  const rules = useMemo(() => evaluateEmail(email), [email]);
  const [provider, setProvider] = useState({ domain: '', status: 'idle' });
  const cache = useRef(new Map());

  const domain = rules.formatOk ? rules.domain : '';

  useEffect(() => {
    if (!checkProvider || !domain) {
      setProvider({ domain: '', status: 'idle' });
      return undefined;
    }

    const cached = cache.current.get(domain);
    if (cached) {
      setProvider({ domain, status: cached });
      return undefined;
    }

    let cancelled = false;
    setProvider({ domain, status: 'checking' });

    const timer = setTimeout(async () => {
      let status;
      try {
        const result = await validateEmail(`check@${domain}`);
        if (result.valid) status = 'ok';
        else if (result.reason === 'disposable') status = 'disposable';
        else if (result.reason === 'no_mail_server') status = 'no_mail_server';
        else status = 'ok';
        cache.current.set(domain, status);
      } catch (error) {
        status = 'unknown';
      }
      if (!cancelled) setProvider({ domain, status });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [domain, checkProvider]);

  const providerStatus = checkProvider && domain && provider.domain === domain ? provider.status : 'idle';
  const providerPassed = providerStatus === 'ok' || providerStatus === 'unknown';

  let status = 'idle';
  if (!rules.value) status = 'idle';
  else if (!rules.formatOk) status = 'invalid';
  else if (!checkProvider) status = 'valid';
  else if (providerStatus === 'disposable') status = 'disposable';
  else if (providerStatus === 'no_mail_server') status = 'no_mail_server';
  else if (providerPassed) status = 'valid';
  else status = 'checking';

  return {
    rules,
    providerStatus,
    status,
    valid: status === 'valid',
  };
}
