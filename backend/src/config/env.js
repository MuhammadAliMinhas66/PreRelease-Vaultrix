const isWeakSecret = (value) => !value || value.length < 32 || /replace_this|changeme|secret/i.test(value);

// The one account allowed into the Admin Dashboard (see
// middleware/requireAdmin.js). A hardcoded default rather than a role flag
// on purpose - this is for Vaultrix's own operator, not a per-organization
// "admin" role, and ADMIN_EMAIL lets it be overridden per-deployment
// without a code change.
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'minhasvirtual@gmail.com').toLowerCase();

export const validateEnv = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const problems = [];
  const warnings = [];

  ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_URL'].forEach((key) => {
    if (!process.env[key]) problems.push(`${key} is not set`);
  });

  const access = process.env.JWT_ACCESS_SECRET;
  const refresh = process.env.JWT_REFRESH_SECRET;

  if (access && refresh && access === refresh) {
    problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }

  const weakSecrets = [];
  if (isWeakSecret(access)) weakSecrets.push('JWT_ACCESS_SECRET');
  if (isWeakSecret(refresh)) weakSecrets.push('JWT_REFRESH_SECRET');
  if (weakSecrets.length) {
    (isProduction ? problems : warnings).push(`${weakSecrets.join(' and ')} should be a random string of 32+ characters`);
  }

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (!turnstileSecret) {
    (isProduction ? problems : warnings).push('TURNSTILE_SECRET_KEY is not set, so the captcha check is off');
  } else if (/^[123]x0{20,}/.test(turnstileSecret)) {
    (isProduction ? problems : warnings).push('TURNSTILE_SECRET_KEY is a Cloudflare test key and does not protect anything');
  }

  if (isProduction && !process.env.TRUST_PROXY) {
    warnings.push('TRUST_PROXY is not set. Behind a proxy or host like Render, set it to 1 so rate limits use real visitor IPs');
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    (isProduction ? problems : warnings).push('SMTP settings are missing, so OTP emails cannot be sent');
  }

  if (isProduction && process.env.CLIENT_URL && !process.env.CLIENT_URL.startsWith('https://')) {
    problems.push('CLIENT_URL must use https in production');
  }

  warnings.forEach((item) => console.warn(`[config] ${item}`));

  if (problems.length) {
    problems.forEach((item) => console.error(`[config] ${item}`));
    if (isProduction) {
      console.error('[config] Fix the problems above and restart.');
      process.exit(1);
    }
  }
};
