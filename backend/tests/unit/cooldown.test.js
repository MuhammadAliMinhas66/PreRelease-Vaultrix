import { describe, it, expect } from 'vitest';
import {
  COOLDOWN_DAYS,
  GOOGLE_RELINK_COOLDOWN_DAYS,
  lockedUntil,
  cooldownLockedUntil,
  cooldownLockedUntilIso,
  googleLinkLockedUntil,
  googleLinkLockedUntilIso,
} from '../../src/utils/cooldown.js';

describe('cooldown.js', () => {
  it('has the expected cooldown lengths', () => {
    // These are the exact numbers the rest of the app (and its UI copy)
    // assumes. If either changes, it should be a deliberate edit to this
    // file together with this test, not an accident.
    expect(COOLDOWN_DAYS).toBe(7);
    expect(GOOGLE_RELINK_COOLDOWN_DAYS).toBe(30);
  });

  it('returns null when nothing has ever changed', () => {
    expect(lockedUntil(null, 7)).toBeNull();
    expect(lockedUntil(undefined, 7)).toBeNull();
    expect(cooldownLockedUntil(null)).toBeNull();
    expect(googleLinkLockedUntil(null)).toBeNull();
  });

  it('is locked right after a change, and unlocks exactly N days later', () => {
    const changedAt = new Date();
    const result = cooldownLockedUntil(changedAt);

    expect(result).toBeInstanceOf(Date);
    const expectedMs = changedAt.getTime() + 7 * 24 * 60 * 60 * 1000;
    expect(result.getTime()).toBe(expectedMs);
  });

  it('is not locked once the cooldown window has fully passed', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    expect(cooldownLockedUntil(eightDaysAgo)).toBeNull();
  });

  it('is still locked one second before the window ends', () => {
    const almostSevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000 - 1000));
    const result = cooldownLockedUntil(almostSevenDaysAgo);
    expect(result).not.toBeNull();
    expect(result.getTime()).toBeGreaterThan(Date.now());
  });

  it('uses 30 days specifically for the Google relink cooldown', () => {
    const justUnlinked = new Date();
    const result = googleLinkLockedUntil(justUnlinked);
    expect(result).not.toBeNull();

    const expectedMs = justUnlinked.getTime() + 30 * 24 * 60 * 60 * 1000;
    expect(result.getTime()).toBe(expectedMs);

    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    // 20 days is still inside a 30-day window, so this must still be locked -
    // this is a direct regression test for "cooldown enforced for 20 days
    // but the user asked for 30".
    expect(googleLinkLockedUntil(twentyDaysAgo)).not.toBeNull();

    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    expect(googleLinkLockedUntil(thirtyOneDaysAgo)).toBeNull();
  });

  it('ISO helpers return a string while locked and null once unlocked', () => {
    const now = new Date();
    expect(typeof cooldownLockedUntilIso(now)).toBe('string');
    expect(cooldownLockedUntilIso(null)).toBeNull();

    expect(typeof googleLinkLockedUntilIso(now)).toBe('string');
    expect(googleLinkLockedUntilIso(null)).toBeNull();
  });
});
