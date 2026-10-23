import { vi, describe, it, expect } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import { mailCalls } from './mailerMock.js';
import { createUser, createAuthedUser, flushAsync } from './helpers.js';
import User from '../../src/models/User.js';

// authController builds `const googleClient = new OAuth2Client(...)` once,
// at module load time, and calls `googleClient.verifyIdToken(...)` from
// several controllers. vi.hoisted() lets this one shared mock function be
// both (a) baked into the mocked OAuth2Client instance below and (b)
// configured per-test further down, without ever touching real Google
// servers or needing a real Google ID token.
const { mockVerifyIdToken } = vi.hoisted(() => ({ mockVerifyIdToken: vi.fn() }));

vi.mock('google-auth-library', () => ({
  // Must be a real `function`, not an arrow function - arrow functions
  // can never be used with `new`, and authController does
  // `new OAuth2Client(...)` at module load time.
  OAuth2Client: vi.fn().mockImplementation(function MockOAuth2Client() {
    return { verifyIdToken: mockVerifyIdToken };
  }),
}));

const { default: app } = await import('../../src/app.js');

const googlePayload = (overrides = {}) => ({
  email: 'shared@vaultrix.test',
  email_verified: true,
  sub: 'google-sub-123',
  picture: '',
  ...overrides,
});

const mockGoogleTicket = (payload) => ({ getPayload: () => payload });

describe('Google sign-in never silently takes over a password account', () => {
  it('rejects a Google sign-in whose email matches an existing password account (409)', async () => {
    await createUser({ email: 'shared@vaultrix.test', password: 'Sup3r!Secret' });

    mockVerifyIdToken.mockResolvedValueOnce(mockGoogleTicket(googlePayload()));

    const res = await request(app).post('/api/auth/google').send({ idToken: 'fake-token' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);

    // The account must come back out of this completely unchanged - still
    // a password account, no googleId attached behind the owner's back.
    const user = await User.findOne({ email: 'shared@vaultrix.test' });
    expect(user.googleId).toBeFalsy();
    expect(user.authProvider).toBe('local');
  });

  it('a brand new email signing in with Google just creates a Google account', async () => {
    mockVerifyIdToken.mockResolvedValueOnce(
      mockGoogleTicket(googlePayload({ email: 'brandnew@vaultrix.test', sub: 'google-sub-999' }))
    );

    const res = await request(app).post('/api/auth/google').send({ idToken: 'fake-token' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('brandnew@vaultrix.test');
    expect(res.body.user.googleLinked).toBe(true);
    expect(res.body.user.hasPassword).toBe(false);
  });
});

describe('POST /api/auth/link-google (explicit, authenticated opt-in)', () => {
  it('links Google onto the signed-in account when the verified email matches', async () => {
    const { user, authorization } = await createAuthedUser({ email: 'link.me@vaultrix.test' });

    mockVerifyIdToken.mockResolvedValueOnce(mockGoogleTicket(googlePayload({ email: user.email })));

    const res = await request(app)
      .post('/api/auth/link-google')
      .set('Authorization', authorization)
      .send({ idToken: 'fake-token' });

    expect(res.status).toBe(200);
    expect(res.body.user.googleLinked).toBe(true);
    // Linking must not remove the password - the whole point is both ways
    // in should work afterwards.
    expect(res.body.user.hasPassword).toBe(true);
  });

  it("rejects linking a Google account whose email doesn't match the signed-in account", async () => {
    const { authorization } = await createAuthedUser({ email: 'me@vaultrix.test' });

    mockVerifyIdToken.mockResolvedValueOnce(mockGoogleTicket(googlePayload({ email: 'someone.else@vaultrix.test' })));

    const res = await request(app)
      .post('/api/auth/link-google')
      .set('Authorization', authorization)
      .send({ idToken: 'fake-token' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('refuses to link without being signed in at all', async () => {
    const res = await request(app).post('/api/auth/link-google').send({ idToken: 'fake-token' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/unlink-google + the 30-day relink cooldown', () => {
  it('requires a password to exist before unlinking (no lockout-to-nothing)', async () => {
    const { authorization } = await createAuthedUser({
      email: 'google.only@vaultrix.test',
      password: null,
      authProvider: 'google',
      googleId: 'google-sub-only',
    });

    const res = await request(app).post('/api/auth/unlink-google').set('Authorization', authorization).send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('unlinks with the correct password, then blocks relinking for 30 days', async () => {
    const { user, authorization } = await createAuthedUser({
      email: 'unlink.me@vaultrix.test',
      password: 'Sup3r!Secret',
      authProvider: 'google',
      googleId: 'google-sub-unlink',
    });

    const unlinkRes = await request(app)
      .post('/api/auth/unlink-google')
      .set('Authorization', authorization)
      .send({ password: 'Sup3r!Secret' });

    expect(unlinkRes.status).toBe(200);
    expect(unlinkRes.body.user.googleLinked).toBe(false);
    // A confirmation email should go out so the owner notices if this
    // wasn't them.
    await flushAsync();
    expect(mailCalls.some((call) => call.to === user.email)).toBe(true);

    // Immediately trying to link ANY Google account back should be refused
    // with the 30-day cooldown, not silently allowed.
    mockVerifyIdToken.mockResolvedValueOnce(mockGoogleTicket(googlePayload({ email: user.email })));

    const relinkRes = await request(app)
      .post('/api/auth/link-google')
      .set('Authorization', authorization)
      .send({ idToken: 'fake-token' });

    expect(relinkRes.status).toBe(400);
    expect(relinkRes.body.googleLinkLockedUntil).toBeTruthy();

    const unlockDate = new Date(relinkRes.body.googleLinkLockedUntil);
    const daysAway = (unlockDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    // Should be ~30 days out, not ~20 (the old, wrong value) and not ~0.
    expect(daysAway).toBeGreaterThan(29);
    expect(daysAway).toBeLessThan(31);
  });

  it('rejects unlinking with the wrong password', async () => {
    const { authorization } = await createAuthedUser({
      email: 'wrong.pw@vaultrix.test',
      password: 'Sup3r!Secret',
      authProvider: 'google',
      googleId: 'google-sub-wrongpw',
    });

    const res = await request(app)
      .post('/api/auth/unlink-google')
      .set('Authorization', authorization)
      .send({ password: 'TotallyWrong!1' });

    expect(res.status).toBe(400);

    const stillLinked = await User.findOne({ email: 'wrong.pw@vaultrix.test' });
    expect(stillLinked.googleId).toBeTruthy();
  });
});
