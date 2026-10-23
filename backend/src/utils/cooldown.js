// Shared cooldown helpers for anything that locks for N days after a change
// (username/email edits, relinking Google after an unlink). Both
// authController and userController expose the same locked-until info on
// publicUser(), so the math lives in one place to avoid drift.

export const COOLDOWN_DAYS = 7;
export const GOOGLE_RELINK_COOLDOWN_DAYS = 30;

const daysToMs = (days) => days * 24 * 60 * 60 * 1000;

// Returns the Date the field unlocks at, or null if it's not currently locked
// (either never changed, or the cooldown window has already passed).
export const lockedUntil = (changedAt, days) => {
  if (!changedAt) return null;
  const unlocksAt = new Date(new Date(changedAt).getTime() + daysToMs(days));
  return unlocksAt > new Date() ? unlocksAt : null;
};

export const lockedUntilIso = (changedAt, days) => {
  const unlocksAt = lockedUntil(changedAt, days);
  return unlocksAt ? unlocksAt.toISOString() : null;
};

export const cooldownLockedUntil = (changedAt) => lockedUntil(changedAt, COOLDOWN_DAYS);
export const cooldownLockedUntilIso = (changedAt) => lockedUntilIso(changedAt, COOLDOWN_DAYS);

export const googleLinkLockedUntil = (unlinkedAt) => lockedUntil(unlinkedAt, GOOGLE_RELINK_COOLDOWN_DAYS);
export const googleLinkLockedUntilIso = (unlinkedAt) => lockedUntilIso(unlinkedAt, GOOGLE_RELINK_COOLDOWN_DAYS);
