import { describe, it, expect } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import './mailerMock.js';
import { createUser } from './helpers.js';

const { default: app } = await import('../../src/app.js');

// A fixed, valid-looking device cookie value so every request in a test can
// be pinned to the SAME simulated device - attachDeviceId() only generates
// a random one when no existing vx_did cookie is sent, so setting our own
// here stands in for "the same browser, every request".
const SAME_DEVICE_COOKIE = 'vx_did=11111111-1111-1111-1111-111111111111';
const OTHER_DEVICE_COOKIE = 'vx_did=22222222-2222-2222-2222-222222222222';

const VALID_PASSWORD = 'Sup3r!Secret';
const REAL_DOMAIN = 'gmail.com'; // signup() does a real DNS check - see auth.test.js for why.

// Seeds N existing accounts that already carry the given device id, exactly
// as verifySignupOtp()/resolveGoogleUser() would have stamped them -
// directly through the DB rather than by running N full signup+OTP flows.
// The thing under test here is the COUNTING/BLOCKING logic in
// utils/deviceLimit.js, not the signup or email-OTP pipeline (that has its
// own dedicated, thorough coverage in auth.test.js) - going through real
// signups for setup just adds DNS/OTP-timing noise with no extra coverage
// of what this file actually needs to prove.
const seedAccountsOnDevice = async (deviceId, count) => {
  for (let i = 0; i < count; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await createUser({
      email: `seed.${deviceId}.${i}.${Date.now()}.${Math.random().toString(36).slice(2)}@vaultrix.test`,
      signupDeviceId: deviceId,
    });
  }
};

describe('Per-device account creation limit', () => {
  it('blocks a new signup once 3 accounts already exist on this device', async () => {
    await seedAccountsOnDevice('11111111-1111-1111-1111-111111111111', 3);

    const email = `device.limit.blocked.${Date.now()}@${REAL_DOMAIN}`;
    const res = await request(app)
      .post('/api/auth/signup')
      .set('Cookie', SAME_DEVICE_COOKIE)
      .send({ name: 'Device Test', email, password: VALID_PASSWORD });

    expect(res.status, JSON.stringify(res.body)).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/maximum number/i);
  });

  it('still allows a signup when only 2 accounts exist on this device', async () => {
    await seedAccountsOnDevice('11111111-1111-1111-1111-111111111111', 2);

    const email = `device.limit.allowed.${Date.now()}@${REAL_DOMAIN}`;
    const res = await request(app)
      .post('/api/auth/signup')
      .set('Cookie', SAME_DEVICE_COOKIE)
      .send({ name: 'Device Test', email, password: VALID_PASSWORD });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('a different device is not affected by another device being at its limit', async () => {
    await seedAccountsOnDevice('11111111-1111-1111-1111-111111111111', 3);

    const email = `device.limit.other.${Date.now()}@${REAL_DOMAIN}`;
    const res = await request(app)
      .post('/api/auth/signup')
      .set('Cookie', OTHER_DEVICE_COOKIE)
      .send({ name: 'Other Device', email, password: VALID_PASSWORD });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('a full signup -> verify flow actually stamps the device id onto the new account', async () => {
    const email = `device.limit.e2e.${Date.now()}@${REAL_DOMAIN}`;
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .set('Cookie', SAME_DEVICE_COOKIE)
      .send({ name: 'End To End', email, password: VALID_PASSWORD });

    expect(signupRes.status, JSON.stringify(signupRes.body)).toBe(200);

    // Confirm the device id made it onto the PendingSignup record (what
    // verifySignupOtp() will carry onto the real User on success) without
    // depending on racing the mocked mailer for the actual OTP code - that
    // race is unrelated to what this test is proving.
    const { default: PendingSignup } = await import('../../src/models/PendingSignup.js');
    const pending = await PendingSignup.findOne({ email });
    expect(pending?.deviceId).toBe('11111111-1111-1111-1111-111111111111');
  });
});
