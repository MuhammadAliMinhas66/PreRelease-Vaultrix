import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { authenticator } from 'otplib';
import './dbSetup.js';
import './mailerMock.js';
import { createAuthedUser, authHeaderFor } from './helpers.js';
import Session from '../../src/models/Session.js';

const { default: app } = await import('../../src/app.js');

describe('DELETE /api/users/me/sessions/:id', () => {
  it('revoking a device twice says the second time it is already signed out', async () => {
    const { user, authorization } = await createAuthedUser({ email: 'devices@vaultrix.test' });

    // Revoke a DIFFERENT device's session, not the one this request is
    // itself authenticated with - deleting your own current session would
    // invalidate this very bearer token (that's the per-device kill switch
    // working correctly, see the "Logging out signs a device out
    // immediately" test below), which would turn the second call's 401
    // into a false failure here instead of testing "already signed out".
    const otherDevice = await Session.create({
      userId: user._id,
      userAgent: 'vitest-other-device',
      ip: '127.0.0.1',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const first = await request(app)
      .delete(`/api/users/me/sessions/${otherDevice._id}`)
      .set('Authorization', authorization);

    expect(first.status).toBe(200);
    expect(first.body.success).toBe(true);

    const second = await request(app)
      .delete(`/api/users/me/sessions/${otherDevice._id}`)
      .set('Authorization', authorization);

    // This is a regression test for the exact wording fixed in v1_43: the
    // message used to say "session", which read as developer jargon to a
    // non-technical user.
    expect(second.status).toBe(404);
    expect(second.body.message).toBe('That device is already signed out.');
    expect(second.body.message).not.toMatch(/session/i);
  });

  it("revoking someone else's session id is treated the same as not found", async () => {
    const { authorization } = await createAuthedUser({ email: 'me@vaultrix.test' });
    const other = await createAuthedUser({ email: 'other@vaultrix.test' });

    const res = await request(app)
      .delete(`/api/users/me/sessions/${other.sessionId}`)
      .set('Authorization', authorization);

    expect(res.status).toBe(404);

    // The other account's session must still be intact.
    const stillThere = await Session.findById(other.sessionId);
    expect(stillThere).not.toBeNull();
  });

  it('lists this device correctly and includes its IP', async () => {
    const { authorization } = await createAuthedUser({ email: 'list.devices@vaultrix.test' });

    const res = await request(app).get('/api/users/me/sessions').set('Authorization', authorization);

    expect(res.status).toBe(200);
    expect(res.body.sessions.length).toBeGreaterThan(0);
    expect(res.body.sessions[0]).toHaveProperty('ip');
    expect(res.body.sessions[0]).toHaveProperty('device');
  });
});

describe('MFA setup / confirm / disable', () => {
  const PASSWORD = 'Sup3r!Secret';

  it('full setup flow: begin -> confirm with a real TOTP code -> enabled', async () => {
    const { authorization } = await createAuthedUser({ email: 'mfa.user@vaultrix.test', password: PASSWORD });

    const begin = await request(app).post('/api/users/me/mfa/setup').set('Authorization', authorization).send({});

    expect(begin.status).toBe(200);
    expect(begin.body.setupToken).toBeTruthy();
    expect(begin.body.secret).toBeTruthy();

    const code = authenticator.generate(begin.body.secret);

    const confirm = await request(app)
      .post('/api/users/me/mfa/confirm')
      .set('Authorization', authorization)
      .send({ setupToken: begin.body.setupToken, code });

    expect(confirm.status).toBe(200);
    expect(confirm.body.success).toBe(true);
    expect(Array.isArray(confirm.body.backupCodes)).toBe(true);
    expect(confirm.body.backupCodes.length).toBeGreaterThan(0);
  });

  it('rejects confirming setup with the wrong code', async () => {
    const { authorization } = await createAuthedUser({ email: 'mfa.wrong@vaultrix.test', password: PASSWORD });

    const begin = await request(app).post('/api/users/me/mfa/setup').set('Authorization', authorization).send({});

    const confirm = await request(app)
      .post('/api/users/me/mfa/confirm')
      .set('Authorization', authorization)
      .send({ setupToken: begin.body.setupToken, code: '000000' });

    expect(confirm.status).toBe(400);
  });

  it('a Google-only account cannot begin MFA setup (Google already has its own)', async () => {
    const { authorization } = await createAuthedUser({
      email: 'mfa.google@vaultrix.test',
      password: null,
      authProvider: 'google',
      googleId: 'google-sub-mfa',
    });

    const res = await request(app).post('/api/users/me/mfa/setup').set('Authorization', authorization).send({});
    expect(res.status).toBe(400);
  });

  it('disabling MFA requires the correct password', async () => {
    const { authorization } = await createAuthedUser({
      email: 'mfa.disable@vaultrix.test',
      password: PASSWORD,
      mfaEnabled: true,
      mfaSecret: 'placeholder-not-a-real-secret',
    });

    const wrongPw = await request(app)
      .post('/api/users/me/mfa/disable')
      .set('Authorization', authorization)
      .send({ password: 'TotallyWrong!1' });
    expect(wrongPw.status).toBe(400);

    const rightPw = await request(app)
      .post('/api/users/me/mfa/disable')
      .set('Authorization', authorization)
      .send({ password: PASSWORD });
    expect(rightPw.status).toBe(200);
    expect(rightPw.body.success).toBe(true);
  });
});

describe('Logging out signs a device out immediately (per-device kill switch)', () => {
  it('a revoked session can no longer authenticate, even with its still-unexpired access token', async () => {
    const { user, authorization, sessionId } = await createAuthedUser({ email: 'kill.switch@vaultrix.test' });

    await Session.deleteOne({ _id: sessionId });

    const res = await request(app).get('/api/auth/me').set('Authorization', authorization);
    expect(res.status).toBe(401);

    // A fresh session for the same user works fine - this proves the 401
    // above was about that one device, not the account as a whole.
    const fresh = await authHeaderFor(user);
    const resFresh = await request(app).get('/api/auth/me').set('Authorization', fresh.authorization);
    expect(resFresh.status).toBe(200);
  });
});
