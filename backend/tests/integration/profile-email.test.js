import { describe, it, expect } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import { mailCalls, lastCodeTo } from './mailerMock.js';
import { createAuthedUser, flushAsync } from './helpers.js';

const { default: app } = await import('../../src/app.js');

describe('PATCH /api/users/me - name change cooldown (7 days)', () => {
  it('allows the first name change, then blocks a second one immediately after', async () => {
    const { authorization } = await createAuthedUser({ name: 'Original Name' });

    const firstChange = await request(app)
      .patch('/api/users/me')
      .set('Authorization', authorization)
      .send({ name: 'New Name' });

    expect(firstChange.status).toBe(200);
    expect(firstChange.body.user.name).toBe('New Name');
    expect(firstChange.body.user.usernameLockedUntil).toBeTruthy();
    // The previous name should now show up in history.
    expect(firstChange.body.user.nameHistory[0].value).toBe('Original Name');

    const secondChange = await request(app)
      .patch('/api/users/me')
      .set('Authorization', authorization)
      .send({ name: 'Yet Another Name' });

    expect(secondChange.status).toBe(400);
    expect(secondChange.body.usernameLockedUntil).toBeTruthy();
  });

  it('does not lock anything out when the name is sent unchanged', async () => {
    const { authorization } = await createAuthedUser({ name: 'Same Name' });

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', authorization)
      .send({ name: 'Same Name' });

    expect(res.status).toBe(200);
    expect(res.body.user.usernameLockedUntil).toBeNull();
  });
});

describe('Email change: dual verification (old email code + new email code)', () => {
  const PASSWORD = 'Sup3r!Secret';

  it('requires both codes and sends one to each inbox', async () => {
    const { user, authorization } = await createAuthedUser({ email: 'current@vaultrix.test', password: PASSWORD });
    const newEmail = 'brandnew@vaultrix.test';

    const requestRes = await request(app)
      .post('/api/users/me/email/request-change')
      .set('Authorization', authorization)
      .send({ newEmail, password: PASSWORD });

    expect(requestRes.status).toBe(200);
    await flushAsync();

    const oldCode = lastCodeTo(user.email);
    const newCode = lastCodeTo(newEmail);
    expect(oldCode).toMatch(/^\d{6}$/);
    expect(newCode).toMatch(/^\d{6}$/);
    expect(oldCode).not.toBe(newCode);

    // Wrong new code, correct old code -> rejected, told which field is wrong.
    const wrongNew = await request(app)
      .post('/api/users/me/email/verify-change')
      .set('Authorization', authorization)
      .send({ oldCode, newCode: '000000' === newCode ? '111111' : '000000' });

    expect(wrongNew.status).toBe(400);
    expect(['new', 'both']).toContain(wrongNew.body.invalidField);

    // Both correct -> email actually changes, old email recorded in history.
    const bothCorrect = await request(app)
      .post('/api/users/me/email/verify-change')
      .set('Authorization', authorization)
      .send({ oldCode, newCode });

    expect(bothCorrect.status).toBe(200);
    expect(bothCorrect.body.user.email).toBe(newEmail);
    expect(bothCorrect.body.user.emailHistory[0].value).toBe('current@vaultrix.test');
    expect(bothCorrect.body.user.emailLockedUntil).toBeTruthy();
  });

  it('a stolen password alone cannot move the email without the OLD-inbox code', async () => {
    const { user, authorization } = await createAuthedUser({ email: 'victim@vaultrix.test', password: PASSWORD });

    await request(app)
      .post('/api/users/me/email/request-change')
      .set('Authorization', authorization)
      .send({ newEmail: 'attacker@vaultrix.test', password: PASSWORD });
    await flushAsync();

    const newCode = lastCodeTo('attacker@vaultrix.test');

    // Attacker has the password and can read the NEW inbox (it's theirs),
    // but does not have access to the victim's current inbox, so they can
    // only guess the old code.
    const res = await request(app)
      .post('/api/users/me/email/verify-change')
      .set('Authorization', authorization)
      .send({ oldCode: '000000', newCode });

    expect(res.status).toBe(400);
    expect(['old', 'both']).toContain(res.body.invalidField);

    const stillOriginal = await request(app).get('/api/auth/me').set('Authorization', authorization);
    expect(stillOriginal.body.user.email).toBe(user.email);
  });

  it('a second email change is blocked by the 7-day cooldown right after the first', async () => {
    const { authorization } = await createAuthedUser({ email: 'cooldown@vaultrix.test', password: PASSWORD });

    await request(app)
      .post('/api/users/me/email/request-change')
      .set('Authorization', authorization)
      .send({ newEmail: 'first-new@vaultrix.test', password: PASSWORD });
    await flushAsync();

    const oldCode = lastCodeTo('cooldown@vaultrix.test');
    const newCode = lastCodeTo('first-new@vaultrix.test');
    await request(app)
      .post('/api/users/me/email/verify-change')
      .set('Authorization', authorization)
      .send({ oldCode, newCode });

    const secondAttempt = await request(app)
      .post('/api/users/me/email/request-change')
      .set('Authorization', authorization)
      .send({ newEmail: 'second-new@vaultrix.test', password: PASSWORD });

    expect(secondAttempt.status).toBe(400);
    expect(secondAttempt.body.emailLockedUntil).toBeTruthy();
  });

  it('a Google-only account cannot request an email change at all', async () => {
    const { authorization } = await createAuthedUser({
      email: 'google.user@vaultrix.test',
      password: null,
      authProvider: 'google',
      googleId: 'google-sub-email',
    });

    const res = await request(app)
      .post('/api/users/me/email/request-change')
      .set('Authorization', authorization)
      .send({ newEmail: 'wont-happen@vaultrix.test' });

    expect(res.status).toBe(400);
    expect(mailCalls.length).toBe(0);
  });
});
