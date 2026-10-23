import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Session from '../models/Session.js';
import SecurityEvent from '../models/SecurityEvent.js';
import PasswordReset from '../models/PasswordReset.js';
import PendingEmailChange from '../models/PendingEmailChange.js';
import PendingDeviceLogin from '../models/PendingDeviceLogin.js';
import PendingAccountDeletion from '../models/PendingAccountDeletion.js';
import { describeDevice } from '../utils/deviceLabel.js';
import { cooldownLockedUntilIso, googleLinkLockedUntilIso } from '../utils/cooldown.js';
import { isCountryCode, isCurrencyCode, cleanName, NAME_MESSAGE } from '../utils/validators.js';
import { sendMail } from '../utils/mailer.js';
import { otpEmail, accountDeactivatedEmail, accountReactivatedEmail, mfaDisabledByAdminEmail } from '../utils/mailTemplates.js';
import { securityLog } from '../utils/securityLog.js';
import { ADMIN_EMAIL } from '../config/env.js';

// Must match frontend/src/i18n/locales.
const APP_LANGUAGES = ['en', 'fr', 'es', 'ar', 'hi', 'ur'];

// "Online" is approximated as "has a session whose refresh token was used
// in the last N minutes" - there's no separate presence/heartbeat system,
// this just reuses the Session.lastUsedAt that already gets bumped on every
// authenticated request (see tokens.js / the refresh flow).
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const sendInBackground = (message, to) => {
  sendMail({ to, ...message }).catch((error) => {
    console.error('Could not send email:', error.message);
  });
};

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const notFound = (res) => fail(res, 404, 'That account could not be found.');

// Deliberately excludes passwordHash, mfaSecret, mfaBackupCodes - the admin
// panel can act on those (disable MFA, force a reset) without ever needing
// to read them.
const adminUserSummary = (user, onlineUserIds) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  authProvider: user.authProvider,
  googleLinked: Boolean(user.googleId),
  role: user.role,
  plan: user.plan,
  country: user.country,
  currency: user.currency,
  language: user.language,
  avatarUrl: user.avatarUrl,
  onboardingCompleted: user.onboardingCompleted,
  mfaEnabled: Boolean(user.mfaEnabled),
  hasPassword: Boolean(user.passwordHash),
  isActive: user.isActive !== false,
  deactivatedAt: user.deactivatedAt,
  deactivatedBy: user.deactivatedBy,
  isOnline: onlineUserIds.has(String(user._id)),
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

const getOnlineUserIds = async (userIds) => {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS);
  const filter = { lastUsedAt: { $gte: since } };
  if (userIds) filter.userId = { $in: userIds };
  const sessions = await Session.find(filter).select('userId').lean();
  return new Set(sessions.map((s) => String(s.userId)));
};

// --- Overview -------------------------------------------------------------

export const getOverview = async (req, res, next) => {
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers, deactivatedUsers, signupsToday, signupsThisWeek, onlineUserIds, recentSignups] =
      await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ isActive: false }),
        User.countDocuments({ createdAt: { $gte: dayAgo } }),
        User.countDocuments({ createdAt: { $gte: weekAgo } }),
        getOnlineUserIds(),
        User.find({}).sort({ createdAt: -1 }).limit(8).select('name email authProvider createdAt').lean(),
      ]);

    res.json({
      success: true,
      overview: {
        totalUsers,
        activeUsers: totalUsers - deactivatedUsers,
        deactivatedUsers,
        onlineNow: onlineUserIds.size,
        signupsToday,
        signupsThisWeek,
      },
      recentSignups: recentSignups.map((u) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        authProvider: u.authProvider,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// --- Users list -------------------------------------------------------------

const PAGE_SIZE = 25;

export const listUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || 'all'); // all | active | deactivated | online

    const filter = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ name: new RegExp(escaped, 'i') }, { email: new RegExp(escaped, 'i') }];
    }
    if (status === 'active') filter.isActive = { $ne: false };
    if (status === 'deactivated') filter.isActive = false;

    let onlineUserIds = new Set();
    if (status === 'online') {
      onlineUserIds = await getOnlineUserIds();
      filter._id = { $in: Array.from(onlineUserIds) };
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
    ]);

    if (status !== 'online') {
      onlineUserIds = await getOnlineUserIds(users.map((u) => u._id));
    }

    res.json({
      success: true,
      users: users.map((u) => adminUserSummary(u, onlineUserIds)),
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (error) {
    next(error);
  }
};

// --- Single user: full detail -------------------------------------------------------------

export const getUserDetail = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return notFound(res);

    const [sessions, events, onlineUserIds] = await Promise.all([
      Session.find({ userId: user._id }).sort({ lastUsedAt: -1 }).lean(),
      SecurityEvent.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50).lean(),
      getOnlineUserIds([user._id]),
    ]);

    res.json({
      success: true,
      user: {
        ...adminUserSummary(user, onlineUserIds),
        nameHistory: (user.nameHistory || []).slice(-10).reverse(),
        emailHistory: (user.emailHistory || []).slice(-10).reverse(),
        emailLockedUntil: cooldownLockedUntilIso(user.emailChangedAt),
        usernameLockedUntil: cooldownLockedUntilIso(user.usernameChangedAt),
        googleLinkLockedUntil: googleLinkLockedUntilIso(user.googleUnlinkedAt),
      },
      sessions: sessions.map((session) => ({
        id: String(session._id),
        device: describeDevice(session.userAgent),
        ip: session.ip,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
      })),
      events: events.map((event) => ({
        id: String(event._id),
        event: event.event,
        ip: event.ip,
        path: event.path,
        details: event.details,
        createdAt: event.createdAt,
      })),
    });
  } catch (error) {
    if (error?.name === 'CastError') return notFound(res);
    next(error);
  }
};

// --- Admin edits a user's own-editable fields -------------------------------------------------------------

export const updateUserAsAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res);

    const { name, country, currency, language, role, plan } = req.body || {};
    const update = {};

    if (name !== undefined) {
      const cleaned = cleanName(name);
      if (!cleaned) return fail(res, 400, NAME_MESSAGE);
      update.name = cleaned;
    }
    if (country !== undefined) {
      if (country !== '' && !isCountryCode(country)) return fail(res, 400, 'That is not a valid country.');
      update.country = country || undefined;
    }
    if (currency !== undefined) {
      if (currency !== '' && !isCurrencyCode(currency)) return fail(res, 400, 'That is not a valid currency.');
      update.currency = currency || undefined;
    }
    if (language !== undefined) {
      if (!APP_LANGUAGES.includes(language)) return fail(res, 400, 'That is not a supported language.');
      update.language = language;
    }
    if (role !== undefined) {
      if (!['owner', 'admin', 'member', 'viewer'].includes(role)) return fail(res, 400, 'That is not a valid role.');
      update.role = role;
    }
    if (plan !== undefined) {
      if (!['standard', 'premium'].includes(plan)) return fail(res, 400, 'That is not a valid plan.');
      update.plan = plan;
    }

    Object.assign(user, update);
    await user.save();

    securityLog('admin_user_updated', req, { adminEmail: ADMIN_EMAIL, userId: String(user._id), fields: Object.keys(update) });

    const onlineUserIds = await getOnlineUserIds([user._id]);
    res.json({ success: true, user: adminUserSummary(user.toObject(), onlineUserIds) });
  } catch (error) {
    if (error?.name === 'CastError') return notFound(res);
    next(error);
  }
};

// --- Deactivate / reactivate -------------------------------------------------------------

export const deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res);
    if (user.email === ADMIN_EMAIL) return fail(res, 400, "You can't deactivate the admin account.");

    user.isActive = false;
    user.deactivatedAt = new Date();
    user.deactivatedBy = ADMIN_EMAIL;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await Session.deleteMany({ userId: user._id });

    sendInBackground(accountDeactivatedEmail({ name: user.name }), user.email);
    securityLog('admin_user_deactivated', req, { adminEmail: ADMIN_EMAIL, userId: String(user._id) });

    const onlineUserIds = await getOnlineUserIds([user._id]);
    res.json({ success: true, user: adminUserSummary(user.toObject(), onlineUserIds) });
  } catch (error) {
    if (error?.name === 'CastError') return notFound(res);
    next(error);
  }
};

export const reactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res);

    user.isActive = true;
    user.deactivatedAt = null;
    user.deactivatedBy = null;
    await user.save();

    sendInBackground(accountReactivatedEmail({ name: user.name }), user.email);
    securityLog('admin_user_reactivated', req, { adminEmail: ADMIN_EMAIL, userId: String(user._id) });

    const onlineUserIds = await getOnlineUserIds([user._id]);
    res.json({ success: true, user: adminUserSummary(user.toObject(), onlineUserIds) });
  } catch (error) {
    if (error?.name === 'CastError') return notFound(res);
    next(error);
  }
};

// --- Permanent delete -------------------------------------------------------------
// Same cleanup as the user's own confirmAccountDeletion() in
// userController.js, minus the emailed-OTP step - an admin acting here has
// already authenticated as the one trusted operator account, so that
// second confirmation (which exists to stop someone at an unlocked,
// already-signed-in browser) doesn't apply the same way.

export const deleteUserAsAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res);
    if (user.email === ADMIN_EMAIL) return fail(res, 400, "You can't delete the admin account.");

    const userId = user._id;

    await Promise.all([
      Session.deleteMany({ userId }),
      PendingEmailChange.deleteMany({ userId }),
      PendingDeviceLogin.deleteMany({ userId }),
      PendingAccountDeletion.deleteOne({ userId }),
      PasswordReset.deleteMany({ userId }),
    ]);

    await User.deleteOne({ _id: userId });

    securityLog('admin_user_deleted', req, { adminEmail: ADMIN_EMAIL, userId: String(userId), email: user.email });

    res.json({ success: true });
  } catch (error) {
    if (error?.name === 'CastError') return notFound(res);
    next(error);
  }
};

// --- Force password reset -------------------------------------------------------------
// Reuses the exact same PasswordReset/OTP mechanism as self-service "forgot
// password" (see passwordResetController.js) - the user still picks their
// own new password by entering the emailed code on /forgot-password, an
// admin never sees or sets a password directly.

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const generateCode = () => String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');

export const forcePasswordReset = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res);
    if (!user.passwordHash) {
      return fail(res, 400, 'This account signs in with Google and has no password to reset.');
    }

    const code = generateCode();
    const otpHash = await bcrypt.hash(code, 10);
    const now = Date.now();

    await PasswordReset.findOneAndUpdate(
      { email: user.email },
      {
        $set: {
          userId: user._id,
          otpHash,
          otpExpiresAt: new Date(now + OTP_TTL_MINUTES * 60 * 1000),
          attempts: 0,
          verified: false,
          resetNonce: null,
          resetExpiresAt: null,
          lastSentAt: new Date(now),
          windowStartedAt: new Date(now),
          sendCount: 1,
          expiresAt: new Date(now + 60 * 60 * 1000),
        },
      },
      { upsert: true }
    );

    sendInBackground(otpEmail({ name: user.name, code, minutes: OTP_TTL_MINUTES }), user.email);
    securityLog('admin_forced_password_reset', req, { adminEmail: ADMIN_EMAIL, userId: String(user._id) });

    res.json({ success: true, expiresInMinutes: OTP_TTL_MINUTES });
  } catch (error) {
    if (error?.name === 'CastError') return notFound(res);
    next(error);
  }
};

// --- Disable MFA (account-recovery path for a lost authenticator) -------------------------------------------------------------

export const disableUserMfa = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res);
    if (!user.mfaEnabled) return fail(res, 400, '2-step verification is already off for this account.');

    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    user.mfaBackupCodes = [];
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await Session.deleteMany({ userId: user._id });

    sendInBackground(mfaDisabledByAdminEmail({ name: user.name }), user.email);
    securityLog('admin_mfa_disabled', req, { adminEmail: ADMIN_EMAIL, userId: String(user._id) });

    const onlineUserIds = await getOnlineUserIds([user._id]);
    res.json({ success: true, user: adminUserSummary(user.toObject(), onlineUserIds) });
  } catch (error) {
    if (error?.name === 'CastError') return notFound(res);
    next(error);
  }
};

// --- Sessions -------------------------------------------------------------

export const revokeUserSession = async (req, res, next) => {
  try {
    const { id, sessionId } = req.params;
    const result = await Session.deleteOne({ _id: sessionId, userId: id });
    if (result.deletedCount === 0) return fail(res, 404, 'That session could not be found.');

    securityLog('admin_session_revoked', req, { adminEmail: ADMIN_EMAIL, userId: id, sessionId });
    res.json({ success: true });
  } catch (error) {
    if (error?.name === 'CastError') return fail(res, 404, 'That session could not be found.');
    next(error);
  }
};

// --- Signup / security audit log -------------------------------------------------------------

export const getAuditLog = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const eventFilter = String(req.query.event || '').trim();

    const filter = {};
    if (eventFilter) filter.event = eventFilter;

    const [total, events, distinctEvents] = await Promise.all([
      SecurityEvent.countDocuments(filter),
      SecurityEvent.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      SecurityEvent.distinct('event'),
    ]);

    res.json({
      success: true,
      events: events.map((event) => ({
        id: String(event._id),
        event: event.event,
        userId: event.userId ? String(event.userId) : null,
        ip: event.ip,
        path: event.path,
        details: event.details,
        createdAt: event.createdAt,
      })),
      eventTypes: distinctEvents.sort(),
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (error) {
    next(error);
  }
};
