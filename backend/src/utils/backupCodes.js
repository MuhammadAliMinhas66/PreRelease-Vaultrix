import crypto from 'crypto';

// Excludes visually-confusable characters (0/O, 1/I/L) so a code is easy to
// type correctly from a printed or handwritten copy.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 10;

const generateOne = () => {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${out.slice(0, 5)}-${out.slice(5)}`;
};

export const generateBackupCodes = (count = 10) => Array.from({ length: count }, generateOne);
