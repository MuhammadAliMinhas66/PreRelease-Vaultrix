import { vi, beforeEach } from 'vitest';

// Every OTP email's subject is literally "<code> is your Vaultrix ...
// code" (see src/utils/mailTemplates.js), so the 6-digit code a test needs
// is always the first word of the captured subject - no need to parse the
// HTML/text body.
export const mailCalls = [];

export const lastCodeTo = (toEmail) => {
  const match = [...mailCalls].reverse().find((call) => call.to === toEmail);
  if (!match) return null;
  return match.subject.split(' ')[0];
};

beforeEach(() => {
  mailCalls.length = 0;
});

// Import this module (for its side effects) before importing ../../src/app.js
// in any integration test that triggers an email - it replaces the real
// sendMail (which would otherwise just console.log in test/dev mode) with
// one that records what was sent so tests can read codes back out.
vi.mock('../../src/utils/mailer.js', () => ({
  sendMail: vi.fn(async (args) => {
    mailCalls.push(args);
  }),
}));
