import { useLayoutEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from '../i18n/useTranslation.js';

const GOOGLE_LOCALES = { zh: 'zh-CN', tl: 'fil' };

// Popup mode (the library's default: no ux_mode/login_uri), the same pattern
// GoogleLinkButton already uses. This used to run in ux_mode="redirect",
// which sends the WHOLE page to accounts.google.com - so after picking an
// account you'd land on Google's own full-page consent/description screen
// before ever coming back to Vaultrix. Popup mode keeps everything in a
// small popup window that closes itself the moment Google hands back a
// credential, so the app never navigates away and there's no detour through
// a Google-branded page in between.
function GoogleAuthButton({ onToken, onError }) {
  const { t, language } = useTranslation();
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(null);

  useLayoutEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const measured = node.getBoundingClientRect().width;
    setWidth(Math.max(220, Math.min(320, Math.floor(measured || 300))));
  }, []);

  return (
    <div ref={wrapRef} className="flex w-full justify-center">
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
          text="continue_with"
          shape="rectangular"
          locale={GOOGLE_LOCALES[language] || language}
        />
      )}
    </div>
  );
}

export default GoogleAuthButton;
