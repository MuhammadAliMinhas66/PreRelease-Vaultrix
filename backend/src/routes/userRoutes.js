import { Router } from 'express';
import {
  updateProfile,
  changePassword,
  changeAvatar,
  listSessions,
  revokeSession,
  logoutAllSessions,
  requestEmailChange,
  verifyEmailChange,
  requestAccountDeletion,
  confirmAccountDeletion,
} from '../controllers/userController.js';
import { beginMfaSetup, confirmMfaSetup, disableMfa } from '../controllers/mfaController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/upload.js';
import {
  passwordChangeLimiter,
  sessionsLimiter,
  emailChangeLimiter,
  accountDeleteLimiter,
  mfaLimiter,
} from '../middleware/rateLimiters.js';

const router = Router();

router.patch('/me', authenticate, updateProfile);
router.post('/me/password', authenticate, passwordChangeLimiter, changePassword);
router.post('/me/avatar', authenticate, uploadAvatar, changeAvatar);
router.get('/me/sessions', authenticate, sessionsLimiter, listSessions);
router.delete('/me/sessions/:id', authenticate, sessionsLimiter, revokeSession);
router.post('/me/sessions/logout-all', authenticate, sessionsLimiter, logoutAllSessions);
router.post('/me/email/request-change', authenticate, emailChangeLimiter, requestEmailChange);
router.post('/me/email/verify-change', authenticate, emailChangeLimiter, verifyEmailChange);
router.post('/me/delete/request', authenticate, accountDeleteLimiter, requestAccountDeletion);
router.post('/me/delete/confirm', authenticate, accountDeleteLimiter, confirmAccountDeletion);
router.post('/me/mfa/setup', authenticate, mfaLimiter, beginMfaSetup);
router.post('/me/mfa/confirm', authenticate, mfaLimiter, confirmMfaSetup);
router.post('/me/mfa/disable', authenticate, mfaLimiter, disableMfa);

export default router;
