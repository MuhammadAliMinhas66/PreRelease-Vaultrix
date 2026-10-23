// Only the *signed-out* language (login / signup screens) lives in localStorage.
// Signed-in users never read or write this: their language comes from their own
// account record, so nothing can leak from one account into another.
const GUEST_LANGUAGE_KEY = 'vaultrix_guest_language';

export const getGuestLanguage = () => {
  try {
    return localStorage.getItem(GUEST_LANGUAGE_KEY) || '';
  } catch (error) {
    return '';
  }
};

export const setGuestLanguage = (language) => {
  try {
    if (language) localStorage.setItem(GUEST_LANGUAGE_KEY, language);
  } catch (error) {
    // storage can be unavailable in private browsing, the UI still works without it
  }
};

// Legacy global keys from earlier versions were shared across accounts. Remove them.
export const purgeLegacyPreferenceKeys = () => {
  try {
    localStorage.removeItem('vaultrix_language');
    localStorage.removeItem('vaultrix_currency');
  } catch (error) {
    // nothing to clean up
  }
};
