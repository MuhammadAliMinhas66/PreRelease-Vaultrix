import crypto from 'crypto';

// A TOTP secret has to be reversible (it's needed in plaintext to check a
// code), unlike a password, so it can't just be hashed - it's encrypted at
// rest instead. The key is derived from JWT_ACCESS_SECRET (same pattern as
// the password-reset and MFA tokens below) so there's no extra .env value
// to manage; rotating JWT_ACCESS_SECRET would also invalidate every stored
// MFA secret, which is an acceptable, rare trade-off.
const key = () => crypto.createHash('sha256').update(`${process.env.JWT_ACCESS_SECRET}:mfa-secret-encryption`).digest();

export const encryptSecret = (plainText) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
};

export const decryptSecret = (encoded) => {
  const raw = Buffer.from(encoded, 'base64');
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
};
