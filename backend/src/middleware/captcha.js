import { securityLog } from '../utils/securityLog.js';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;

export const CAPTCHA_MESSAGES = {
  required: 'Please complete the security check and try again.',
  failed: 'The security check failed. Please refresh the page and try again.',
  unavailable: 'The security check is unavailable right now. Please try again in a moment.',
};

export const checkCaptcha = async (req) => {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      securityLog('captcha_not_configured', req);
      return { ok: false, status: 503, message: CAPTCHA_MESSAGES.unavailable };
    }
    return { ok: true, skipped: true };
  }

  const token = req.body?.captchaToken;
  if (typeof token !== 'string' || token.length < 10 || token.length > 2048) {
    return { ok: false, status: 400, message: CAPTCHA_MESSAGES.required };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const form = new URLSearchParams({ secret, response: token });
    if (req.ip) form.set('remoteip', req.ip);

    const response = await fetch(VERIFY_URL, { method: 'POST', body: form, signal: controller.signal });
    const result = await response.json();

    if (result.success) return { ok: true };

    securityLog('captcha_failed', req, { codes: result['error-codes'] });
    return { ok: false, status: 400, message: CAPTCHA_MESSAGES.failed };
  } catch (error) {
    securityLog('captcha_unreachable', req, { error: error.message });
    return { ok: false, status: 503, message: CAPTCHA_MESSAGES.unavailable };
  } finally {
    clearTimeout(timer);
  }
};

export const verifyCaptcha = async (req, res, next) => {
  try {
    const result = await checkCaptcha(req);
    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.message });
    }
    next();
  } catch (error) {
    next(error);
  }
};
