import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import User from '../models/User.js';
import { signMfaSetupToken, verifyMfaSetupToken } from '../utils/tokens.js';
import { encryptSecret } from '../utils/mfaCrypto.js';
import { generateBackupCodes } from '../utils/backupCodes.js';
import { securityLog } from '../utils/securityLog.js';

const ISSUER = 'Vaultrix';
const fail = (res, status, message) => res.status(status).json({ success: false, message });

export const beginMfaSetup = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return fail(res, 401, 'Please sign in again.');

    if (!user.passwordHash) {
      return fail(res, 400, 'Your account signs in with Google, which already has its own 2-step verification.');
    }
    if (user.mfaEnabled) return fail(res, 400, '2-step verification is already on.');

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, ISSUER, secret);
    const qrCode = await QRCode.toDataURL(otpauthUrl);
    const setupToken = signMfaSetupToken({ sub: String(user._id), secret });

    res.json({ success: true, setupToken, qrCode, secret });
  } catch (error) {
    next(error);
  }
};

export const confirmMfaSetup = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return fail(res, 401, 'Please sign in again.');

    const { setupToken, code } = req.body || {};
    if (!setupToken || !code) return fail(res, 400, 'Enter the 6-digit code from your app.');

    let payload;
    try {
      payload = verifyMfaSetupToken(setupToken);
    } catch (error) {
      return fail(res, 400, 'Your 2-step verification setup has expired. Please start again.');
    }

    if (payload.sub !== String(user._id)) {
      return fail(res, 400, 'Your 2-step verification setup has expired. Please start again.');
    }

    const valid = authenticator.verify({ token: String(code).trim(), secret: payload.secret });
    if (!valid) {
      securityLog('mfa_setup_wrong_code', req, { userId: String(user._id) });
      return fail(res, 400, 'That code is not right. Check it and try again.');
    }

    const backupCodes = generateBackupCodes();
    const hashedCodes = await Promise.all(backupCodes.map((code_) => bcrypt.hash(code_, 10)));

    user.mfaEnabled = true;
    user.mfaSecret = encryptSecret(payload.secret);
    user.mfaBackupCodes = hashedCodes.map((codeHash) => ({ codeHash, usedAt: null }));
    await user.save();

    securityLog('mfa_enabled', req, { userId: String(user._id) });

    res.json({ success: true, backupCodes });
  } catch (error) {
    next(error);
  }
};

export const disableMfa = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return fail(res, 401, 'Please sign in again.');
    if (!user.mfaEnabled) return fail(res, 400, '2-step verification is already off.');

    const { password } = req.body || {};
    if (!password || typeof password !== 'string') {
      return fail(res, 400, 'Enter your password to continue.');
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) return fail(res, 400, 'Your password is not right.');

    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    user.mfaBackupCodes = [];
    await user.save();

    securityLog('mfa_disabled', req, { userId: String(user._id) });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
