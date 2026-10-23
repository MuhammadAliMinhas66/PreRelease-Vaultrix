const LOCAL_PATTERN = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;
const DOMAIN_PATTERN = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+([a-z]{2,63}|xn--[a-z0-9-]{1,59})$/i;

export const EMAIL_MAX_LENGTH = 254;

export const evaluateEmail = (raw) => {
  const value = (raw || '').trim();
  const atCount = value.split('@').length - 1;
  const atIndex = value.indexOf('@');

  const local = atCount === 1 ? value.slice(0, atIndex) : '';
  const domain = atCount === 1 ? value.slice(atIndex + 1) : '';

  const at = atCount === 1;
  const localOk = at && local.length > 0 && local.length <= 64 && LOCAL_PATTERN.test(local);
  const domainOk = at && domain.length > 0 && DOMAIN_PATTERN.test(domain);
  const formatOk = value.length <= EMAIL_MAX_LENGTH && at && localOk && domainOk;

  return {
    value,
    domain: domainOk ? domain.toLowerCase() : '',
    at,
    local: localOk,
    domainValid: domainOk,
    formatOk,
  };
};

const SPECIAL_CHAR_PATTERN = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;

export const scorePassword = (password) => {
  const length = password.length;
  if (length === 0) return 0;
  if (length <= 8) return 1;

  let points = 0;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (SPECIAL_CHAR_PATTERN.test(password)) points += 1;
  if (length >= 12) points += 1;

  if (points <= 1) return 1;
  if (points <= 3) return 2;
  return 3;
};

export const passwordIssue = (password) => {
  if (!password) return 'auth.passwordRequired';
  if (password.length <= 8) return 'auth.passwordTooShort';
  if (password.length > 64) return 'errors.passwordTooLong';
  if (!/\p{L}/u.test(password) || !SPECIAL_CHAR_PATTERN.test(password)) return 'errors.passwordNeedsMix';
  return null;
};
