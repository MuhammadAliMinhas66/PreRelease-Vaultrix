import { Router } from 'express';
import {
  getOverview,
  listUsers,
  getUserDetail,
  updateUserAsAdmin,
  deactivateUser,
  reactivateUser,
  deleteUserAsAdmin,
  forcePasswordReset,
  disableUserMfa,
  revokeUserSession,
  getAuditLog,
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { adminLimiter } from '../middleware/rateLimiters.js';

const router = Router();

// Every route here needs a signed-in session AND that session to belong to
// ADMIN_EMAIL - requireAdmin 404s anyone else rather than revealing this
// router exists at all.
router.use(authenticate, requireAdmin, adminLimiter);

router.get('/overview', getOverview);
router.get('/audit-log', getAuditLog);

router.get('/users', listUsers);
router.get('/users/:id', getUserDetail);
router.patch('/users/:id', updateUserAsAdmin);
router.post('/users/:id/deactivate', deactivateUser);
router.post('/users/:id/reactivate', reactivateUser);
router.delete('/users/:id', deleteUserAsAdmin);
router.post('/users/:id/force-password-reset', forcePasswordReset);
router.post('/users/:id/disable-mfa', disableUserMfa);
router.delete('/users/:id/sessions/:sessionId', revokeUserSession);

export default router;
