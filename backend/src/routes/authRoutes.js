import { Router } from 'express';
import {
  signup,
  verifySignupOtp,
  login,
  loginStatus,
  logout,
  googleAuth,
  googleCallback,
  linkGoogleAccount,
  unlinkGoogleAccount,
  refresh,
  me,
  verifyDeviceLogin,
  verifyMfaLogin,
} from '../controllers/authController.js';
import {
  validateEmailAddress,
  forgotPassword,
  verifyResetCode,
  resetPassword,
} from '../controllers/passwordResetController.js';
import { authenticate } from '../middleware/auth.js';
import {
  loginLimiter,
  signupLimiter,
  googleLimiter,
  refreshLimiter,
  forgotLimiter,
  verifyCodeLimiter,
  resetLimiter,
  emailCheckLimiter,
  loginStatusLimiter,
} from '../middleware/rateLimiters.js';
import { verifyCaptcha } from '../middleware/captcha.js';

const router = Router();

router.post('/signup', signupLimiter, signup);
router.post('/signup/verify', verifyCodeLimiter, verifySignupOtp);
router.post('/login', loginLimiter, verifyCaptcha, login);
router.post('/verify-device', verifyCodeLimiter, verifyDeviceLogin);
router.post('/verify-mfa', verifyCodeLimiter, verifyMfaLogin);
router.post('/login-status', loginStatusLimiter, loginStatus);
router.post('/logout', logout);
router.post('/google', googleLimiter, googleAuth);
router.post('/link-google', authenticate, googleLimiter, linkGoogleAccount);
router.post('/unlink-google', authenticate, googleLimiter, unlinkGoogleAccount);
router.post('/google/callback', googleLimiter, googleCallback);
router.post('/refresh', refreshLimiter, refresh);
router.get('/me', authenticate, me);
router.post('/validate-email', emailCheckLimiter, validateEmailAddress);
router.post('/forgot-password', forgotLimiter, forgotPassword);
router.post('/verify-reset-code', verifyCodeLimiter, verifyResetCode);
router.post('/reset-password', resetLimiter, resetPassword);

export default router;
