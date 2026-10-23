import rateLimit from 'express-rate-limit';

const build = (windowMs, max, extra = {}) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts. Please wait a moment and try again.' },
    ...extra,
  });

export const loginLimiter = build(15 * 60 * 1000, 10, { skipSuccessfulRequests: true });
export const signupLimiter = build(60 * 60 * 1000, 10);
export const googleLimiter = build(15 * 60 * 1000, 40);
export const refreshLimiter = build(15 * 60 * 1000, 120);
export const forgotLimiter = build(60 * 60 * 1000, 15);
export const verifyCodeLimiter = build(15 * 60 * 1000, 30);
export const resetLimiter = build(15 * 60 * 1000, 15);
export const emailCheckLimiter = build(5 * 60 * 1000, 80);
export const passwordChangeLimiter = build(15 * 60 * 1000, 10);
export const loginStatusLimiter = build(5 * 60 * 1000, 60);
export const sessionsLimiter = build(15 * 60 * 1000, 60);
export const emailChangeLimiter = build(15 * 60 * 1000, 20);
export const accountDeleteLimiter = build(60 * 60 * 1000, 10);
export const mfaLimiter = build(15 * 60 * 1000, 20);
// Generous - this gates the whole admin router, used by one trusted
// operator account, not a per-action limit like the others above.
export const adminLimiter = build(5 * 60 * 1000, 300);
