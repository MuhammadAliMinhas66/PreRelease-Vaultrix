import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { refresh as refreshSession, logout as logoutRequest, me as fetchMe } from '../services/authService.js';
import { setAuthToken, setUnauthorizedHandler } from '../services/api.js';
import {
  getGuestLanguage,
  setGuestLanguage as storeGuestLanguage,
  purgeLegacyPreferenceKeys,
} from '../i18n/languageStorage.js';
import { resolveLanguage, isSupportedLanguage, translate } from '../i18n/translate.js';
import { notify } from '../i18n/notifications.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // One-time cleanup of the old cross-account localStorage keys (runs once per page load).
  useState(purgeLegacyPreferenceKeys);

  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  // Language for signed-out screens only (login / signup). Never used once signed in.
  const [guestLanguage, setGuestLanguageState] = useState(() => resolveLanguage(getGuestLanguage()));

  // SINGLE SOURCE OF TRUTH for the application language. It is derived, never
  // copied into a second state variable:
  //   signed in  -> this account's saved language, English if none/unsupported
  //   signed out -> the guest language (English by default)
  // It only changes when the account record changes (Update preferences,
  // onboarding) or when the session changes, so it cannot go stale or leak.
  const language = user ? resolveLanguage(user.language) : guestLanguage;
  const currency = user?.currency || '';

  const languageRef = useRef(language);
  const hadSessionRef = useRef(false);
  // Set right before a logout the app itself initiated (sign out, log out
  // everywhere, a device being revoked) so the generic "session expired"
  // toast from the response interceptor doesn't also fire for the 401s that
  // naturally follow - without this, a self-initiated logout could show two
  // toasts (its own message, plus the automatic expiry one).
  const intentionalLogoutRef = useRef(false);

  const setSession = (data) => {
    setUser(data.user);
    setAccessToken(data.accessToken);
    setAuthToken(data.accessToken);
    hadSessionRef.current = true;
  };

  const clearSession = () => {
    hadSessionRef.current = false;
    setUser(null);
    setAccessToken(null);
    setAuthToken(null);
  };

  // Call right before an action that intentionally ends the session (sign
  // out, log out everywhere) so any 401s that follow from requests already
  // in flight don't also pop the automatic "session expired" toast. Resets
  // on its own after a few seconds as a safety net in case clearSession()
  // never gets called (e.g. the request failed outright).
  const markIntentionalLogout = () => {
    intentionalLogoutRef.current = true;
    setTimeout(() => {
      intentionalLogoutRef.current = false;
    }, 5000);
  };

  const updateUser = (partialUser) => {
    setUser((prev) => (prev ? { ...prev, ...partialUser } : prev));
  };

  const setGuestLanguage = (code) => {
    if (!isSupportedLanguage(code)) return;
    setGuestLanguageState(code);
    storeGuestLanguage(code);
  };

  const signOut = async () => {
    markIntentionalLogout();
    await logoutRequest();
    notify.info(translate(languageRef.current, 'info.signedOut'));
    clearSession();
  };

  useEffect(() => {
    languageRef.current = language;
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!hadSessionRef.current) return;
      if (intentionalLogoutRef.current) {
        clearSession();
        return;
      }
      notify.warning(translate(languageRef.current, 'errors.sessionExpired'));
      clearSession();
    });

    let cancelled = false;

    (async () => {
      const data = await refreshSession();
      if (cancelled) return;
      if (data) {
        setSession(data);
      }
      setIsBootstrapping(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Being signed out on another device (revoked, bumped by the 2-device
  // limit, "log out everywhere") is only visible to this tab the next time
  // it actually talks to the server. A tab just sitting there otherwise
  // wouldn't notice until someone refreshes it, so poll a cheap endpoint
  // every so often - the 401 this throws once the session is gone is
  // caught by the same handler a normal request's 401 would hit.
  useEffect(() => {
    if (!accessToken) return undefined;

    const interval = setInterval(() => {
      fetchMe().catch(() => {
        // onUnauthorized (registered above) already handles a 401 here;
        // any other failure (e.g. briefly offline) is not worth surfacing.
      });
    }, 45000);

    return () => clearInterval(interval);
  }, [accessToken]);

  const value = {
    user,
    accessToken,
    isAuthenticated: Boolean(user && accessToken),
    isBootstrapping,
    language,
    currency,
    setGuestLanguage,
    setSession,
    clearSession,
    markIntentionalLogout,
    updateUser,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
