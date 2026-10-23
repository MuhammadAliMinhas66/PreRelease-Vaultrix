import dns from 'dns';
import { isDisposableDomain } from './disposableDomains.js';

const EMAIL_MAX_LENGTH = 254;
const LOCAL_MAX_LENGTH = 64;
const LOCAL_PATTERN = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;
const DOMAIN_PATTERN = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+([a-z]{2,63}|xn--[a-z0-9-]{1,59})$/i;

const DNS_TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 60 * 60 * 1000;
const mailCache = new Map();

export const EMAIL_MESSAGES = {
  format: 'Enter a valid email address.',
  disposable: 'Temporary or disposable email addresses are not allowed. Use your permanent email.',
  no_mail_server: 'That email domain cannot receive mail. Check the spelling.',
};

export const parseEmail = (raw) => {
  if (typeof raw !== 'string') return null;

  const email = raw.trim().toLowerCase();
  if (!email || email.length > EMAIL_MAX_LENGTH) return null;

  const parts = email.split('@');
  if (parts.length !== 2) return null;

  const [local, domain] = parts;
  if (!local || local.length > LOCAL_MAX_LENGTH || !LOCAL_PATTERN.test(local)) return null;
  if (!domain || !DOMAIN_PATTERN.test(domain)) return null;

  return { email, local, domain };
};

const withTimeout = (promise, ms) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

const isMissingRecord = (error) => error?.code === 'ENOTFOUND' || error?.code === 'ENODATA';

export const domainAcceptsMail = async (domain) => {
  const cached = mailCache.get(domain);
  if (cached && cached.expires > Date.now()) return cached.value;

  let value = true;
  let definitive = false;

  try {
    const records = await withTimeout(dns.promises.resolveMx(domain), DNS_TIMEOUT_MS);
    value = records.some((record) => record.exchange && record.exchange !== '.');
    definitive = true;
  } catch (error) {
    if (isMissingRecord(error)) {
      try {
        const addresses = await withTimeout(dns.promises.resolve4(domain), DNS_TIMEOUT_MS);
        value = addresses.length > 0;
        definitive = true;
      } catch (fallbackError) {
        if (isMissingRecord(fallbackError)) {
          value = false;
          definitive = true;
        }
      }
    }
  }

  if (definitive) {
    mailCache.set(domain, { value, expires: Date.now() + CACHE_TTL_MS });
  }

  return value;
};

export const checkEmail = async (raw) => {
  const parsed = parseEmail(raw);
  if (!parsed) return { ok: false, reason: 'format' };

  if (isDisposableDomain(parsed.domain)) return { ok: false, reason: 'disposable' };

  const acceptsMail = await domainAcceptsMail(parsed.domain);
  if (!acceptsMail) return { ok: false, reason: 'no_mail_server' };

  return { ok: true, email: parsed.email };
};
