import bcrypt from 'bcryptjs';
import Organization from '../../src/models/Organization.js';
import User from '../../src/models/User.js';
import Session from '../../src/models/Session.js';
import { signAccessToken } from '../../src/utils/tokens.js';

// Creates a fully-formed user (with its own Organization, matching what
// signup() does) directly against the database, skipping the HTTP
// signup/OTP flow. Most tests care about what happens to an *existing*
// account, not about re-proving signup works every time - the actual
// signup flow has its own dedicated test in auth.test.js.
export const createUser = async ({
  name = 'Dana Vault',
  email = 'dana@vaultrix.test',
  password = 'Sup3r!Secret',
  mfaEnabled = false,
  googleId = undefined,
  authProvider = 'local',
  ...overrides
} = {}) => {
  const organization = await Organization.create({ name: `${name}'s workspace` });

  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;

  const user = await User.create({
    orgId: organization._id,
    name,
    email,
    passwordHash,
    authProvider,
    googleId,
    mfaEnabled,
    role: 'owner',
    onboardingCompleted: true,
    ...overrides,
  });

  organization.ownerId = user._id;
  await organization.save();

  return user;
};

// Creates a Session row (so auth middleware's per-device jti check passes)
// and a matching, correctly-signed access token for it. Returns a ready
// "Authorization: Bearer <token>" value.
export const authHeaderFor = async (user) => {
  const session = await Session.create({
    userId: user._id,
    userAgent: 'vitest',
    ip: '127.0.0.1',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  const accessToken = signAccessToken(user, session._id);
  return { authorization: `Bearer ${accessToken}`, sessionId: String(session._id) };
};

// Convenience: create a user AND sign it in, in one call - the common case
// for tests that are really about an authenticated endpoint, not about
// account creation itself.
export const createAuthedUser = async (options) => {
  const user = await createUser(options);
  const { authorization, sessionId } = await authHeaderFor(user);
  return { user, authorization, sessionId };
};

// Waits a tick so fire-and-forget promises (sendOtpInBackground /
// sendInBackground in the controllers, which are deliberately not awaited)
// have a chance to resolve before a test reads what they captured.
export const flushAsync = () => new Promise((resolve) => setImmediate(resolve));
