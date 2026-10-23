import User from '../models/User.js';
import Session from '../models/Session.js';
import { verifyAccessToken } from '../utils/tokens.js';

export const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Please sign in to continue.' });
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Your session has expired. Please sign in again.' });
  }

  try {
    // Run together: the user lookup for tokenVersion (the account-wide kill
    // switch) and, when this token carries one, a check that its device's
    // Session row still exists (the per-device kill switch). Either one
    // being gone rejects the request immediately - revoking one device, or
    // logging out everywhere, takes effect on that device's very next
    // request rather than waiting for its access token to expire.
    const [user, sessionAlive] = await Promise.all([
      User.findById(payload.sub).select('orgId role plan tokenVersion email isActive'),
      payload.jti ? Session.exists({ _id: payload.jti }) : Promise.resolve(true),
    ]);

    if (!user || (payload.tv ?? 0) !== (user.tokenVersion || 0) || !sessionAlive) {
      return res.status(401).json({ success: false, message: 'Your session has expired. Please sign in again.' });
    }

    // An admin-deactivated account is rejected on its very next request,
    // the same way a revoked session or a bumped tokenVersion already are -
    // it doesn't wait for the access token to expire first.
    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated.' });
    }

    req.user = {
      id: String(user._id),
      orgId: user.orgId,
      role: user.role,
      plan: user.plan,
      email: user.email,
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'You do not have access to this.' });
  }
  next();
};
