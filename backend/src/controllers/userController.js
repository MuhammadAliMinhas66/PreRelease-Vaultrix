import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Session from '../models/Session.js';
import Organization from '../models/Organization.js';
import PendingEmailChange from '../models/PendingEmailChange.js';
import PendingDeviceLogin from '../models/PendingDeviceLogin.js';
import PendingAccountDeletion from '../models/PendingAccountDeletion.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens.js';
import { describeDevice } from '../utils/deviceLabel.js';
import { AVATAR_DIR } from '../middleware/upload.js';
import { validatePassword, cleanName, NAME_MESSAGE, isCountryCode, isCurrencyCode } from '../utils/validators.js';
import { parseEmail, EMAIL_MESSAGES } from '../utils/emailValidation.js';
import { isDisposableDomain } from '../utils/disposableDomains.js';
import { securityLog } from '../utils/securityLog.js';
import { sendMail } from '../utils/mailer.js';
import {
  emailChangedEmail,
  accountDeletedEmail,
  emailChangeOtpEmail,
  emailChangeOldVerifyEmail,
  accountDeletionOtpEmail,
} from '../utils/mailTemplates.js';
import { cooldownLockedUntil, cooldownLockedUntilIso, googleLinkLockedUntilIso } from '../utils/cooldown.js';

// Must match the dictionaries shipped in frontend/src/i18n/locales.
const APP_LANGUAGES = ['en', 'fr', 'es', 'ar', 'hi', 'ur'];

const REFRESH_COOKIE_NAME = 'vaultrix_refresh';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: REFRESH_TOKEN_TTL_MS,
};

const createSession = (req, user) =>
  Session.create({
    userId: user._id,
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const OTP_TTL_MS = OTP_TTL_MINUTES * 60 * 1000;
const RESEND_COOLDOWN_SECONDS = 60;
const RESEND_COOLDOWN_MS = RESEND_COOLDOWN_SECONDS * 1000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;
const HOUR_MS = 60 * 60 * 1000;

const generateCode = () => String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');

const sendInBackground = (message, to) => {
  sendMail({ to, ...message }).catch((error) => {
    console.error('Could not send email:', error.message);
  });
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  plan: user.plan,
  authProvider: user.authProvider,
  currency: user.currency,
  language: user.language,
  country: user.country,
  avatarUrl: user.avatarUrl,
  onboardingCompleted: user.onboardingCompleted,
  mfaEnabled: Boolean(user.mfaEnabled),
  hasPassword: Boolean(user.passwordHash),
  googleLinked: Boolean(user.googleId),
  usernameLockedUntil: cooldownLockedUntilIso(user.usernameChangedAt),
  emailLockedUntil: cooldownLockedUntilIso(user.emailChangedAt),
  googleLinkLockedUntil: googleLinkLockedUntilIso(user.googleUnlinkedAt),
  nameHistory: (user.nameHistory || []).slice(-5).reverse(),
  emailHistory: (user.emailHistory || []).slice(-5).reverse(),
});

export const updateProfile = async (req, res, next) => {
  try {
    const { name, country, currency, language, completeOnboarding } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Please sign in again.' });
    }

    if (name !== undefined) {
      if (typeof name === 'string' && !name.trim()) {
        return res.status(400).json({ success: false, message: 'Your name cannot be empty.' });
      }
      const cleaned = cleanName(name);
      if (!cleaned) {
        return res.status(400).json({ success: false, message: NAME_MESSAGE });
      }

      if (cleaned !== user.name) {
        const lockedUntil = cooldownLockedUntil(user.usernameChangedAt);
        if (lockedUntil) {
          return res.status(400).json({
            success: false,
            message: 'You can change your name again once the cooldown ends.',
            usernameLockedUntil: lockedUntil.toISOString(),
          });
        }
        user.usernameChangedAt = new Date();
        user.nameHistory = [...(user.nameHistory || []), { value: user.name, changedAt: new Date() }].slice(-20);
      }

      user.name = cleaned;
    }

    if (country !== undefined) {
      if (!isCountryCode(country)) {
        return res.status(400).json({ success: false, message: 'That selection is not valid.' });
      }
      user.country = country;
    }

    if (currency !== undefined) {
      if (!isCurrencyCode(currency)) {
        return res.status(400).json({ success: false, message: 'That selection is not valid.' });
      }
      user.currency = currency;
    }

    if (language !== undefined) {
      if (typeof language !== 'string') {
        return res.status(400).json({ success: false, message: 'That language is not supported.' });
      }
      if (!APP_LANGUAGES.includes(language)) {
        return res.status(400).json({ success: false, message: 'That language is not supported.' });
      }
      user.language = language;
    }
    if (completeOnboarding) user.onboardingCompleted = true;

    await user.save();

    res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Please sign in again.' });
    }

    // A Google-only account has no existing password to prove ownership
    // with, so there's nothing to require here - this is the ONLY way such
    // an account can ever get a password at all (needed before it can
    // unlink Google, since unlinking requires a password to fall back on).
    // Once a password exists, changing it always requires the current one.
    const isSettingFirstPassword = !user.passwordHash;

    if (!isSettingFirstPassword && !currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Enter your current password and a new password.',
      });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Enter your current password and a new password.',
      });
    }

    if (!isSettingFirstPassword && typeof currentPassword !== 'string') {
      return res.status(400).json({ success: false, message: 'Enter your current password and a new password.' });
    }

    const passwordError = validatePassword(newPassword, { email: user.email, name: user.name });
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    if (!isSettingFirstPassword) {
      const matches = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!matches) {
        return res.status(400).json({ success: false, message: 'Your current password is not right.' });
      }
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Changing your password signs every other device out: delete every
    // existing session row, then issue a fresh one for this device only.
    await Session.deleteMany({ userId: user._id });
    const session = await createSession(req, user);

    const accessToken = signAccessToken(user, session._id);
    const refreshToken = signRefreshToken(user, session._id);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
    res.json({ success: true, accessToken, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

export const changeAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Choose an image to upload.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Please sign in again.' });
    }

    if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/avatars/')) {
      const previousPath = path.join(AVATAR_DIR, path.basename(user.avatarUrl));
      fs.unlink(previousPath, () => {});
    }

    user.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

// The current request's own refresh cookie is read (not exposed to the
// frontend otherwise, since it's httpOnly) purely to flag which row in the
// list is "this device" - it is never used to authorize the request itself,
// authenticate() already did that via the Bearer access token.
const currentSessionId = (req) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) return null;
  try {
    return String(verifyRefreshToken(token).jti);
  } catch (error) {
    return null;
  }
};

export const listSessions = async (req, res, next) => {
  try {
    const activeId = currentSessionId(req);
    const sessions = await Session.find({ userId: req.user.id }).sort({ lastUsedAt: -1 }).lean();

    res.json({
      success: true,
      sessions: sessions.map((session) => ({
        id: String(session._id),
        device: describeDevice(session.userAgent),
        ip: session.ip,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        isCurrent: String(session._id) === activeId,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const revokeSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await Session.deleteOne({ _id: id, userId: req.user.id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'That device is already signed out.' });
    }

    res.json({ success: true });
  } catch (error) {
    // An invalid id shape (not a valid ObjectId) throws a CastError here -
    // treat it the same as "not found" rather than a 500.
    if (error?.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'That device is already signed out.' });
    }
    next(error);
  }
};

export const logoutAllSessions = async (req, res, next) => {
  try {
    await Session.deleteMany({ userId: req.user.id });
    await User.updateOne({ _id: req.user.id }, { $inc: { tokenVersion: 1 } });

    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// --- Email change -----------------------------------------------------
// Two-step, same shape as every other OTP flow in this app: request a code
// (sent to the NEW address, to prove the user owns it), then confirm it.
// Google-auth accounts are blocked here - their email is tied to how they
// sign in, and juggling googleId vs. email matching on every future Google
// sign-in is a can of worms better avoided for a feature almost nobody with
// a Google account will reach for anyway.

export const requestEmailChange = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ success: false, message: 'Please sign in again.' });

    if (!user.passwordHash) {
      return res.status(400).json({
        success: false,
        message: 'Your email is managed by Google sign-in and cannot be changed here.',
      });
    }

    const emailLockedUntil = cooldownLockedUntil(user.emailChangedAt);
    if (emailLockedUntil) {
      return res.status(400).json({
        success: false,
        message: 'You can change your email again once the cooldown ends.',
        emailLockedUntil: emailLockedUntil.toISOString(),
      });
    }

    const { newEmail, password } = req.body || {};

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Enter your password to continue.' });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(400).json({ success: false, message: 'Your password is not right.' });
    }

    const parsed = parseEmail(newEmail);
    if (!parsed) return res.status(400).json({ success: false, message: EMAIL_MESSAGES.format });

    if (isDisposableDomain(parsed.domain)) {
      return res.status(400).json({ success: false, message: EMAIL_MESSAGES.disposable });
    }

    if (parsed.email === user.email) {
      return res.status(400).json({ success: false, message: 'That is already your email address.' });
    }

    const taken = await User.findOne({ email: parsed.email });
    if (taken) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const now = Date.now();
    const existing = await PendingEmailChange.findOne({ userId: user._id });
    const inWindow = Boolean(existing) && now - existing.windowStartedAt.getTime() < HOUR_MS;

    if (existing && now - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      return res.status(429).json({ success: false, message: 'Please wait a moment before requesting another code.' });
    }
    if (inWindow && existing.sendCount >= MAX_SENDS_PER_HOUR) {
      return res.status(429).json({ success: false, message: 'Too many code requests. Please try again in an hour.' });
    }

    const oldCode = generateCode();
    const newCode = generateCode();
    const oldEmailOtpHash = await bcrypt.hash(oldCode, 10);
    const newEmailOtpHash = await bcrypt.hash(newCode, 10);

    await PendingEmailChange.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          newEmail: parsed.email,
          oldEmailOtpHash,
          newEmailOtpHash,
          otpExpiresAt: new Date(now + OTP_TTL_MS),
          attempts: 0,
          lastSentAt: new Date(now),
          windowStartedAt: inWindow ? existing.windowStartedAt : new Date(now),
          sendCount: inWindow ? existing.sendCount + 1 : 1,
          expiresAt: new Date(now + HOUR_MS),
        },
      },
      { upsert: true }
    );

    // Two codes, two inboxes: the new address proves ownership of where the
    // account is moving to, and the old address proves whoever is doing this
    // still controls the inbox that's about to stop being the sign-in email -
    // the second check is what stops a stolen password alone from quietly
    // handing an attacker the account's email.
    sendInBackground(emailChangeOtpEmail({ name: user.name, code: newCode, minutes: OTP_TTL_MINUTES }), parsed.email);
    sendInBackground(emailChangeOldVerifyEmail({ name: user.name, code: oldCode, minutes: OTP_TTL_MINUTES }), user.email);
    securityLog('email_change_requested', req, { userId: String(user._id) });

    res.json({ success: true, cooldownSeconds: RESEND_COOLDOWN_SECONDS, expiresInMinutes: OTP_TTL_MINUTES });
  } catch (error) {
    next(error);
  }
};

export const verifyEmailChange = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ success: false, message: 'Please sign in again.' });

    const oldCode = String(req.body?.oldCode ?? '').trim();
    const newCode = String(req.body?.newCode ?? '').trim();
    const codePattern = new RegExp(`^\\d{${OTP_LENGTH}}$`);
    if (!codePattern.test(oldCode) || !codePattern.test(newCode)) {
      return res.status(400).json({ success: false, message: 'That code is not right. Check it and try again.' });
    }

    const now = new Date();
    const record = await PendingEmailChange.findOneAndUpdate(
      { userId: user._id, attempts: { $lt: MAX_ATTEMPTS }, otpExpiresAt: { $gt: now } },
      { $inc: { attempts: 1 } },
      { new: true }
    );

    if (!record) {
      const stale = await PendingEmailChange.findOne({ userId: user._id });
      if (!stale) return res.status(400).json({ success: false, message: 'Start the email change again.' });
      if (stale.otpExpiresAt <= now) {
        return res.status(400).json({ success: false, message: 'That code has expired. Request a new one.' });
      }
      return res.status(400).json({ success: false, message: 'Too many wrong codes. Request a new one.' });
    }

    const [oldMatches, newMatches] = await Promise.all([
      bcrypt.compare(oldCode, record.oldEmailOtpHash),
      bcrypt.compare(newCode, record.newEmailOtpHash),
    ]);

    if (!oldMatches || !newMatches) {
      securityLog('email_change_wrong_code', req, { userId: String(user._id) });
      return res.status(400).json({
        success: false,
        message: record.attempts >= MAX_ATTEMPTS ? 'Too many wrong codes. Request a new one.' : 'That code is not right. Check it and try again.',
        invalidField: !oldMatches && !newMatches ? 'both' : !oldMatches ? 'old' : 'new',
      });
    }

    // Someone else may have claimed the address while this code sat unused.
    const stillFree = !(await User.findOne({ email: record.newEmail, _id: { $ne: user._id } }));
    if (!stillFree) {
      await PendingEmailChange.deleteOne({ _id: record._id });
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const previousEmail = user.email;
    user.email = record.newEmail;
    user.emailChangedAt = new Date();
    user.emailHistory = [...(user.emailHistory || []), { value: previousEmail, changedAt: new Date() }].slice(-20);
    await user.save();

    await PendingEmailChange.deleteOne({ _id: record._id });
    securityLog('email_changed', req, { userId: String(user._id) });

    sendInBackground(emailChangedEmail({ name: user.name, newEmail: user.email }), previousEmail);

    res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

// --- Account deletion ---------------------------------------------------
// Two steps: confirm you are you (password, or a typed DELETE for a Google
// account) and get emailed a code; then enter that code to actually, and
// permanently, delete the account. The code step is what makes this safe
// even if someone is at an unlocked, already-signed-in browser - they'd
// still need access to the inbox.

export const requestAccountDeletion = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ success: false, message: 'Please sign in again.' });

    if (user.passwordHash) {
      const { password } = req.body || {};
      if (!password || typeof password !== 'string') {
        return res.status(400).json({ success: false, message: 'Enter your password to continue.' });
      }
      const matches = await bcrypt.compare(password, user.passwordHash);
      if (!matches) {
        return res.status(400).json({ success: false, message: 'Your password is not right.' });
      }
    } else {
      // Google-auth accounts have no password to confirm with, so a typed
      // confirmation phrase stands in for it.
      const confirm = String(req.body?.confirm ?? '').trim().toUpperCase();
      if (confirm !== 'DELETE') {
        return res.status(400).json({ success: false, message: 'Type DELETE to confirm.' });
      }
    }

    const now = Date.now();
    const existing = await PendingAccountDeletion.findOne({ userId: user._id });
    const inWindow = Boolean(existing) && now - existing.windowStartedAt.getTime() < HOUR_MS;

    if (existing && now - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      return res.status(429).json({ success: false, message: 'Please wait a moment before requesting another code.' });
    }
    if (inWindow && existing.sendCount >= MAX_SENDS_PER_HOUR) {
      return res.status(429).json({ success: false, message: 'Too many code requests. Please try again in an hour.' });
    }

    const code = generateCode();
    const otpHash = await bcrypt.hash(code, 10);

    await PendingAccountDeletion.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          otpHash,
          otpExpiresAt: new Date(now + OTP_TTL_MS),
          attempts: 0,
          lastSentAt: new Date(now),
          windowStartedAt: inWindow ? existing.windowStartedAt : new Date(now),
          sendCount: inWindow ? existing.sendCount + 1 : 1,
          expiresAt: new Date(now + HOUR_MS),
        },
      },
      { upsert: true }
    );

    sendInBackground(accountDeletionOtpEmail({ name: user.name, code, minutes: OTP_TTL_MINUTES }), user.email);
    securityLog('account_deletion_requested', req, { userId: String(user._id) });

    res.json({ success: true, cooldownSeconds: RESEND_COOLDOWN_SECONDS, expiresInMinutes: OTP_TTL_MINUTES });
  } catch (error) {
    next(error);
  }
};

export const confirmAccountDeletion = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ success: false, message: 'Please sign in again.' });

    const code = String(req.body?.code ?? '').trim();
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) {
      return res.status(400).json({ success: false, message: 'That code is not right. Check it and try again.' });
    }

    const now = new Date();
    const record = await PendingAccountDeletion.findOneAndUpdate(
      { userId: user._id, attempts: { $lt: MAX_ATTEMPTS }, otpExpiresAt: { $gt: now } },
      { $inc: { attempts: 1 } },
      { new: true }
    );

    if (!record) {
      const stale = await PendingAccountDeletion.findOne({ userId: user._id });
      if (!stale) return res.status(400).json({ success: false, message: 'Start the account deletion again.' });
      if (stale.otpExpiresAt <= now) {
        return res.status(400).json({ success: false, message: 'That code has expired. Request a new one.' });
      }
      return res.status(400).json({ success: false, message: 'Too many wrong codes. Request a new one.' });
    }

    const matches = await bcrypt.compare(code, record.otpHash);
    if (!matches) {
      securityLog('account_deletion_wrong_code', req, { userId: String(user._id) });
      return res.status(400).json({
        success: false,
        message: record.attempts >= MAX_ATTEMPTS ? 'Too many wrong codes. Request a new one.' : 'That code is not right. Check it and try again.',
      });
    }

    const userId = user._id;
    const orgId = user.orgId;

    if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/avatars/')) {
      const avatarPath = path.join(AVATAR_DIR, path.basename(user.avatarUrl));
      fs.unlink(avatarPath, () => {});
    }

    await Promise.all([
      Session.deleteMany({ userId }),
      PendingEmailChange.deleteMany({ userId }),
      PendingDeviceLogin.deleteMany({ userId }),
      PendingAccountDeletion.deleteOne({ _id: record._id }),
    ]);

    await User.deleteOne({ _id: userId });

    // Every org is still exactly one user today (the multi-member side of
    // Organization isn't built yet), so deleting the org alongside its only
    // user never orphans anyone else's data - but the "no one else left"
    // check is kept anyway so this stays correct once that changes.
    const remainingMembers = await User.countDocuments({ orgId });
    if (remainingMembers === 0) {
      await Organization.deleteOne({ _id: orgId });
    }

    securityLog('account_deleted', req, { userId: String(userId) });
    sendInBackground(accountDeletedEmail({ name: user.name }), user.email);

    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
