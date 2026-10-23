import { describe, it, expect } from 'vitest';
import { serverMessageKey, translate } from '../src/i18n/translate.js';
import { translations } from '../src/i18n/translations.js';

// Every one of these is a raw `message:` string the backend actually sends
// back in an error response (collected from src/controllers/*.js in the
// backend). Before v1_43, about a dozen of these had no entry in
// translate.js's SERVER_MESSAGE_KEYS map, so translateError() silently fell
// back to the generic "Something went wrong" message instead of showing
// the real, specific reason - the user never found out their account was
// locked, their code expired, etc.
//
// This test is a regression guard for that whole bug class: if a new
// backend error message ever gets added without a matching frontend
// mapping, this test fails instead of the gap getting discovered by a
// confused user. Keep this list in sync with the backend's MESSAGES
// objects and inline fail()/res.json(...) calls.
const KNOWN_BACKEND_MESSAGES = [
  '2-step verification is already off.',
  '2-step verification is already on.',
  'An account with this email already exists.',
  'An account with this email already exists. Try signing in instead.',
  'An account with this email already exists. Sign in with your password, then link Google from Settings if you want to use it too.',
  'Choose an image to upload.',
  'Could not read your Google account details.',
  'This device has already created the maximum number of Vaultrix accounts. If you need another account, please contact support.',
  'Enter a new password to continue.',
  'Enter a valid email address.',
  'Enter a valid name using letters only.',
  'Enter the 6-digit code from your app.',
  'Enter your current password and a new password.',
  'Enter your email and password to continue.',
  'Enter your password to continue.',
  'Google sign-in could not be verified.',
  'Google sign-in did not send back a token.',
  'Name, email and password are all required.',
  'No account is registered with this email.',
  'Password is too long. Use 64 characters or fewer.',
  'Password must be more than 8 characters.',
  'Password must include at least one letter and one special character.',
  'Please complete the security check and try again.',
  'Please sign in again.',
  'Please sign in to continue.',
  'Please wait a moment before requesting another code.',
  'Set a password first - your account needs at least one way to sign in besides Google.',
  'Sign in to Google with the same email as your Vaultrix account to link it.',
  'Start the account deletion again.',
  'Start the email change again.',
  'Temporary or disposable email addresses are not allowed. Use your permanent email.',
  'That Google account is already linked to a different account.',
  'That code has expired. Request a new one.',
  'That code is not right. Check it and try again.',
  'That device is already signed out.',
  'That email domain cannot receive mail. Check the spelling.',
  'That email or password is not right.',
  'That is already your email address.',
  'That language is not supported.',
  'That selection is not valid.',
  'That took too long. Please sign in again.',
  'The security check failed. Please refresh the page and try again.',
  'The security check is unavailable right now. Please try again in a moment.',
  'This account signs in with Google and does not have a password to change.',
  'This account signs in with Google. Use the Continue with Google button instead.',
  'This account was created with Google. Use the Google sign-in button instead.',
  'Too many code requests. Please try again in an hour.',
  'Too many failed sign-in attempts. Please try again later.',
  'Too many wrong codes. Request a new one.',
  'Type DELETE to confirm.',
  'You can change your email again once the cooldown ends.',
  'You can change your name again once the cooldown ends.',
  'You recently unlinked Google. You can link a Google account again once the cooldown ends.',
  'Your 2-step verification setup has expired. Please start again.',
  'Your account is already linked to Google.',
  'Your account is not linked to Google.',
  'Your account signs in with Google, which already has its own 2-step verification.',
  'Your current password is not right.',
  'Your email is managed by Google sign-in and cannot be changed here.',
  'Your name cannot be empty.',
  'Your password is not right.',
  'Your reset session has expired. Please start again.',
  'Your signup session has expired. Please start again.',
];

describe('every known backend error message has a real, specific translation', () => {
  const genericFallback = translate('en', 'errors.somethingWrong');

  it.each(KNOWN_BACKEND_MESSAGES)('"%s" is mapped (not the generic fallback)', (message) => {
    const key = serverMessageKey(message);
    expect(key, `"${message}" has no entry in SERVER_MESSAGE_KEYS`).not.toBeNull();

    const translated = translate('en', key);
    expect(
      translated,
      `"${message}" maps to ${key}, which resolves to the generic fallback text`
    ).not.toBe(genericFallback);
  });

  it('the mapped key exists and is non-empty in every shipped language', () => {
    for (const message of KNOWN_BACKEND_MESSAGES) {
      const key = serverMessageKey(message);
      if (!key) continue; // already reported by the test above

      for (const lang of Object.keys(translations)) {
        expect(translations[lang][key], `${lang}.${key} is missing`).toBeTruthy();
      }
    }
  });
});
