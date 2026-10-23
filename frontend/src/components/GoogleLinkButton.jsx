import { useLayoutEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from '../i18n/useTranslation.js';

const GOOGLE_LOCALES = { zh: 'zh-CN', tl: 'fil' };

// Unlike GoogleAuthButton (used on the login/signup pages), this one stays
// on the page and hands back a credential (idToken) via onToken - it never
// navigates away, because it's used from an already-signed-in Settings page
// to explicitly link a Google identity onto the current account.
function GoogleLinkButton({ onToken, onError, disabled }) {
  const { t, language } = useTranslation();
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(null);

  useLayoutEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const measured = node.getBoundingClientRect().width;
    setWidth(Math.max(220, Math.min(320, Math.floor(measured || 300))));
  }, []);

  if (disabled) return null;

  return (
    <div ref={wrapRef} className="flex w-full justify-start">
      {width && (
        <GoogleLogin
          key={language}
          onSuccess={(credentialResponse) => {
            if (credentialResponse?.credential) {
              onToken(credentialResponse.credential);
            } else {
              onError(t('auth.googleFailed'));
            }
          }}
          onError={() => onError(t('auth.googleFailed'))}
          useOneTap={false}
          width={width}
          text="signin_with"
          shape="rectangular"
          locale={GOOGLE_LOCALES[language] || language}
        />
      )}
    </div>
  );
}

export default GoogleLinkButton;
