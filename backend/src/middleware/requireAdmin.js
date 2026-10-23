import { ADMIN_EMAIL } from '../config/env.js';
import { securityLog } from '../utils/securityLog.js';

// Must run after authenticate() - relies on req.user already being set.
// Gates the entire /api/admin router: only the one operator account
// (ADMIN_EMAIL) gets through, everyone else - including other
// organizations' owners/admins - gets a 404 rather than a 403, so the
// existence of an admin area isn't even disclosed to accounts that aren't it.
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.email !== ADMIN_EMAIL) {
    securityLog('admin_access_denied', req, { userId: req.user?.id });
    return res.status(404).json({ success: false, message: 'Not found.' });
  }
  next();
};
