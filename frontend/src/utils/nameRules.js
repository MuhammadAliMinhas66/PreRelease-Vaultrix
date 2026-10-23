// Mirrors backend/src/utils/validators.js cleanName(): letters (any script)
// and accent marks, plus spaces, apostrophes and hyphens. No digits, no
// symbols. Used to strip disallowed characters live as the user types, so
// they physically cannot enter a number or special character into a name
// field, not just get an error after submitting.
const NAME_CHAR_BLOCKLIST = /[^\p{L}\p{M} '-]/gu;
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} '-]*$/u;

export const sanitizeNameInput = (value) => (typeof value === 'string' ? value.replace(NAME_CHAR_BLOCKLIST, '') : '');

export const isValidName = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 60) return false;
  return NAME_PATTERN.test(trimmed);
};
