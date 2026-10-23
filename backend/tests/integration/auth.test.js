import { describe, it, expect } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import { mailCalls, lastCodeTo } from './mailerMock.js';
import { createUser } from './helpers.js';

const { default: app } = await import('../../src/app.js');

const VALID_PASSWORD = 'Sup3r!Secret';

// signup() is the one endpoint that does a REAL DNS MX lookup on the
// email's domain (see src/utils/emailValidation.js -> checkEmail), on top
// of the usual format/disposable checks every other endpoint does. ".test"
// is a reserved, deliberately non-resolvable TLD (RFC 2606) - perfect for
// most of this suite, but it makes signup() correctly reject it as
// "That email domain cannot receive mail." Only the tests that actually
// call POST /api/auth/signup need a real, resolvable domain instead.
const REAL_DOMAIN = 'gmail.com';

describe('POST /api/auth/signup -> /api/auth/signup/verify', () => {
  it('creates an account end-to-end once the emailed code is confirmed', async () => {
    const email = `new.user.${Date.now()}@${REAL_DOMAIN}`;

    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'New User', email, password: VALID_PASSWORD });

    expect(signupRes.status).toBe(200);
    expect(signupRes.body.success).toBe(true);
    expect(signupRes.body.email).toBe(email);

    const code = lastCodeTo(email);
    expect(code).toMatch(/^\d{6}$/);

    const verifyRes = await request(app).post('/api/auth/signup/verify').send({ email, code });

    expect(verifyRes.status).toBe(201);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.user.email).toBe(email);
    expect(verifyRes.body.accessToken).toBeTruthy();
    // A fresh account should never come back looking locked or Google-linked.
    expect(verifyRes.body.user.hasPassword).toBe(true);
    expect(verifyRes.body.user.googleLinked).toBe(false);
  });

  it('rejects a weak password before ever sending a code', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Weak Pw', email: `weak.pw.${Date.now()}@${REAL_DOMAIN}`, password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mailCalls.length).toBe(0);
  });

  it('rejects signup for an email that already has an account', async () => {
    const email = `existing.${Date.now()}@${REAL_DOMAIN}`;
    await createUser({ email });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Someone Else', email, password: VALID_PASSWORD });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects the wrong verification code without creating an account', async () => {
    const email = `wrong.code.${Date.now()}@${REAL_DOMAIN}`;
    const signupRes = await request(app).post('/api/auth/signup').send({ name: 'Wrong Code', email, password: VALID_PASSWORD });
    expect(signupRes.status).toBe(200);

    const res = await request(app).post('/api/auth/signup/verify').send({ email, code: '000000' });

    // Vanishingly unlikely the random code is actually 000000, but guard it
    // anyway so this test can never flake.
    const realCode = lastCodeTo(email);
    if (realCode === '000000') return;

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/login', () => {
  it('signs in with the correct email and password', async () => {
    await createUser({ email: 'login.ok@vaultrix.test', password: VALID_PASSWORD });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login.ok@vaultrix.test', password: VALID_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.email).toBe('login.ok@vaultrix.test');
  });

  it('rejects the wrong password without revealing whether the email exists', async () => {
    await createUser({ email: 'login.wrong@vaultrix.test', password: VALID_PASSWORD });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login.wrong@vaultrix.test', password: 'NotTheRight!1' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects sign-in for an email that was never registered', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody.here@vaultrix.test', password: VALID_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('locks the account after 5 wrong passwords in a row', async () => {
    await createUser({ email: 'lockout@vaultrix.test', password: VALID_PASSWORD });

    let lastRes;
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      lastRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'lockout@vaultrix.test', password: 'WrongPass!1' });
    }

    expect(lastRes.status).toBe(429);
    expect(lastRes.body.lockUntil).toBeTruthy();

    // Even the CORRECT password should now be rejected until the lock
    // expires - that's the whole point of a lockout.
    const correctAttempt = await request(app)
      .post('/api/auth/login')
      .send({ email: 'lockout@vaultrix.test', password: VALID_PASSWORD });

    expect(correctAttempt.status).toBe(429);
  });

  it("tells a Google-only account to use the Google button instead of accepting a password", async () => {
    await createUser({
      email: 'google.only@vaultrix.test',
      password: null,
      authProvider: 'google',
      googleId: 'google-sub-000',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'google.only@vaultrix.test', password: 'Whatever!1' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/auth/me', () => {
  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a garbage bearer token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});
