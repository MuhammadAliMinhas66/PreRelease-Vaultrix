import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import EmailField from '../components/EmailField.jsx';
import Button from '../components/Button.jsx';
import Captcha, { captchaEnabled } from '../components/Captcha.jsx';
import GoogleAuthButton from '../components/GoogleAuthButton.jsx';
import PageLoader from '../components/PageLoader.jsx';
import LockScreen from '../components/LockScreen.jsx';
import LockTimerBadge from '../components/LockTimerBadge.jsx';
import OtpInput from '../components/OtpInput.jsx';
import { login, googleAuth, getLoginStatus, verifyDeviceLogin, verifyMfaLogin } from '../services/authService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { notify } from '../i18n/notifications.js';

const DEVICE_CODE_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatCountdown = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();
  const { t, tServer } = useTranslation();
  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState(location.state?.email || '');
  const [emailStatus, setEmailStatus] = useState('idle');
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [lockUntil, setLockUntil] = useState(null);
  const [lockTier, setLockTier] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Shown instead of the credentials form when the account is already
  // signed in on 2 devices and this 3rd one needs an emailed code before
  // it's let in (and the oldest device is signed out to make room).
  const [deviceStep, setDeviceStep] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [deviceCodeError, setDeviceCodeError] = useState('');
  const [deviceErrorStamp, setDeviceErrorStamp] = useState(0);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [deviceCooldown, setDeviceCooldown] = useState(0);
  const deviceVerifyingRef = useRef(false);

  // Shown instead of the credentials form when the account has 2-step
  // verification turned on. Can submit either a 6-digit authenticator code
  // or one of the printed backup codes.
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaCodeError, setMfaCodeError] = useState('');
  const [mfaErrorStamp, setMfaErrorStamp] = useState(0);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const mfaVerifyingRef = useRef(false);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('google_error')) {
      notify.error(t('auth.googleFailed'));
      navigate('/login', { replace: true });
    }
  }, []);

  // The lock is tracked on the server against the account, not the browser,
  // so it shows the same countdown after a refresh or from a different device.
  useEffect(() => {
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) return undefined;

    const timer = setTimeout(() => {
      getLoginStatus(value).then((data) => {
        if (data?.locked && data.lockUntil) {
          setLockUntil(new Date(data.lockUntil));
          setLockTier(data.lockTier || 1);
        } else {
          setLockUntil(null);
          setLockTier(0);
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [email]);

  useEffect(() => {
    if (!lockUntil) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lockUntil]);

  const isLocked = Boolean(lockUntil) && now < lockUntil.getTime();
  const secondsRemaining = isLocked ? Math.max(0, Math.ceil((lockUntil.getTime() - now) / 1000)) : 0;

  useEffect(() => {
    if (lockUntil && now >= lockUntil.getTime()) {
      setLockUntil(null);
    }
  }, [now, lockUntil]);

  useEffect(() => {
    if (deviceCooldown <= 0) return undefined;
    const timer = setInterval(() => setDeviceCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [deviceCooldown]);

  const proceedAfterAuth = (data) => {
    setSession(data);
    setRedirecting(true);
    setTimeout(() => {
      const destination = data.user.onboardingCompleted ? redirectTo : '/onboarding';
      navigate(destination, { replace: true });
    }, 500);
  };

  const validate = () => {
    const next = {};
    if (!email.trim()) next.email = 'auth.emailRequired';
    else if (!EMAIL_PATTERN.test(email.trim()) || emailStatus === 'invalid') next.email = 'auth.emailInvalid';
    else if (emailStatus === 'disposable') next.email = 'auth.emailDisposable';
    if (!password) next.password = 'auth.passwordRequired';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleGoogleToken = async (idToken) => {
    setLoading(true);
    try {
      const data = await googleAuth(idToken);
      if (data?.requiresDeviceVerification) {
        setMaskedEmail(data.maskedEmail || '');
        setDeviceCooldown(data.cooldownSeconds || 60);
        setDeviceCode('');
        setDeviceCodeError('');
        setDeviceStep(true);
        setLoading(false);
        return;
      }
      proceedAfterAuth(data);
    } catch (error) {
      notify.error(tServer(error));
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate() || isLocked) return;

    setLoading(true);
    try {
      const data = await login({ email: email.trim(), password, captchaToken });
      if (data?.requiresMfa) {
        setMfaToken(data.mfaToken || '');
        setMfaCode('');
        setMfaCodeError('');
        setUseBackupCode(false);
        setMfaStep(true);
        setLoading(false);
        return;
      }
      if (data?.requiresDeviceVerification) {
        setMaskedEmail(data.maskedEmail || '');
        setDeviceCooldown(data.cooldownSeconds || 60);
        setDeviceCode('');
        setDeviceCodeError('');
        setDeviceStep(true);
        setLoading(false);
        return;
      }
      proceedAfterAuth(data);
    } catch (error) {
      notify.error(tServer(error));
      captchaRef.current?.reset();
      setLoading(false);
      if (error?.data?.lockUntil) {
        setLockUntil(new Date(error.data.lockUntil));
        setLockTier(error.data.lockTier || 1);
      }
    }
  };

  const clearError = (field) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submitDeviceCode = async (value) => {
    if (deviceVerifyingRef.current) return;

    if (value.length < DEVICE_CODE_LENGTH) {
      setDeviceCodeError(t('auth.deviceCodeIncomplete'));
      setDeviceErrorStamp((stamp) => stamp + 1);
      return;
    }

    deviceVerifyingRef.current = true;
    setDeviceLoading(true);
    setDeviceCodeError('');

    try {
      const data = await verifyDeviceLogin({ email: email.trim(), code: value });
      proceedAfterAuth(data);
    } catch (error) {
      setDeviceCodeError(tServer(error));
      setDeviceCode('');
      setDeviceErrorStamp((stamp) => stamp + 1);
    } finally {
      deviceVerifyingRef.current = false;
      setDeviceLoading(false);
    }
  };

  const handleDeviceCodeSubmit = (event) => {
    event.preventDefault();
    submitDeviceCode(deviceCode);
  };

  const resendDeviceCode = async () => {
    if (deviceCooldown > 0 || deviceLoading) return;
    setDeviceLoading(true);
    try {
      const data = await login({ email: email.trim(), password, captchaToken });
      if (data?.requiresDeviceVerification) {
        setMaskedEmail(data.maskedEmail || maskedEmail);
        setDeviceCooldown(data.cooldownSeconds || 60);
        setDeviceCode('');
        setDeviceCodeError('');
        notify.success(t('auth.deviceCodeResent'));
      }
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setDeviceLoading(false);
    }
  };

  const backToCredentials = () => {
    setDeviceStep(false);
    setDeviceCode('');
    setDeviceCodeError('');
    setDeviceCooldown(0);
  };

  const submitMfaCode = async (value) => {
    if (mfaVerifyingRef.current) return;

    if (!value || (!useBackupCode && value.length < DEVICE_CODE_LENGTH)) {
      setMfaCodeError(t(useBackupCode ? 'auth.mfaBackupCodeRequired' : 'auth.deviceCodeIncomplete'));
      setMfaErrorStamp((stamp) => stamp + 1);
      return;
    }

    mfaVerifyingRef.current = true;
    setMfaLoading(true);
    setMfaCodeError('');

    try {
      const data = await verifyMfaLogin({ mfaToken, code: value });
      // MFA cleared, but this may still be a 3rd device - hand off to the
      // same device-verification step used from the plain login form.
      if (data?.requiresDeviceVerification) {
        setMaskedEmail(data.maskedEmail || '');
        setDeviceCooldown(data.cooldownSeconds || 60);
        setDeviceCode('');
        setDeviceCodeError('');
        setMfaStep(false);
        setDeviceStep(true);
        return;
      }
      proceedAfterAuth(data);
    } catch (error) {
      setMfaCodeError(tServer(error));
      setMfaCode('');
      setMfaErrorStamp((stamp) => stamp + 1);
    } finally {
      mfaVerifyingRef.current = false;
      setMfaLoading(false);
    }
  };

  const handleMfaCodeSubmit = (event) => {
    event.preventDefault();
    submitMfaCode(mfaCode);
  };

  const backToCredentialsFromMfa = () => {
    setMfaStep(false);
    setMfaCode('');
    setMfaCodeError('');
    setMfaToken('');
    setUseBackupCode(false);
  };

  if (redirecting) {
    return <PageLoader label={t('auth.settingUp')} />;
  }

  if (isLocked && lockTier >= 2) {
    return <LockScreen display={formatCountdown(secondsRemaining)} />;
  }

  if (mfaStep) {
    return (
      <AuthLayout title={t('auth.mfaTitle')} subtitle={t('auth.mfaSubtitle')}>
        <form onSubmit={handleMfaCodeSubmit} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            {useBackupCode ? (
              <FormField
                label={t('auth.mfaBackupCodeLabel')}
                value={mfaCode}
                onChange={(event) => {
                  setMfaCode(event.target.value);
                  if (mfaCodeError) setMfaCodeError('');
                }}
                placeholder="XXXXX-XXXXX"
                error={mfaCodeError}
              />
            ) : (
              <>
                <span className="text-sm font-medium text-ink">{t('auth.deviceCodeLabel')}</span>
                <OtpInput
                  length={DEVICE_CODE_LENGTH}
                  value={mfaCode}
                  onChange={(value) => {
                    setMfaCode(value);
                    if (mfaCodeError) setMfaCodeError('');
                  }}
                  onComplete={submitMfaCode}
                  disabled={mfaLoading}
                  hasError={Boolean(mfaCodeError)}
                  errorStamp={mfaErrorStamp}
                  label={t('auth.deviceCodeLabel')}
                />
                {mfaCodeError && (
                  <p role="alert" className="text-xs font-medium text-red-600">
                    {mfaCodeError}
                  </p>
                )}
              </>
            )}
          </div>

          <Button type="submit" loading={mfaLoading} loadingLabel={t('auth.verifying')}>
            {t('auth.deviceVerifyButton')}
          </Button>

          <button
            type="button"
            onClick={() => {
              setUseBackupCode((prev) => !prev);
              setMfaCode('');
              setMfaCodeError('');
            }}
            className="text-sm text-muted transition hover:text-ink"
          >
            {useBackupCode ? t('auth.mfaUseAppCode') : t('auth.mfaUseBackupCode')}
          </button>

          <button
            type="button"
            onClick={backToCredentialsFromMfa}
            className="flex items-center justify-center gap-2 text-sm text-muted transition hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('forgot.backToSignIn')}
          </button>
        </form>
      </AuthLayout>
    );
  }

  if (deviceStep) {
    return (
      <AuthLayout title={t('auth.deviceVerifyTitle')} subtitle={t('auth.deviceVerifySubtitle', { email: maskedEmail })}>
        <form onSubmit={handleDeviceCodeSubmit} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">{t('auth.deviceCodeLabel')}</span>
            <OtpInput
              length={DEVICE_CODE_LENGTH}
              value={deviceCode}
              onChange={(value) => {
                setDeviceCode(value);
                if (deviceCodeError) setDeviceCodeError('');
              }}
              onComplete={submitDeviceCode}
              disabled={deviceLoading}
              hasError={Boolean(deviceCodeError)}
              errorStamp={deviceErrorStamp}
              label={t('auth.deviceCodeLabel')}
            />
            {deviceCodeError && (
              <p role="alert" className="text-xs font-medium text-red-600">
                {deviceCodeError}
              </p>
            )}
          </div>

          <Button type="submit" loading={deviceLoading} loadingLabel={t('auth.verifying')}>
            {t('auth.deviceVerifyButton')}
          </Button>

          <button
            type="button"
            onClick={resendDeviceCode}
            disabled={deviceCooldown > 0 || deviceLoading}
            className="text-sm text-muted transition hover:text-ink disabled:cursor-default disabled:opacity-60"
          >
            {deviceCooldown > 0 ? t('auth.deviceResendIn', { seconds: deviceCooldown }) : t('auth.deviceResend')}
          </button>

          <button
            type="button"
            onClick={backToCredentials}
            className="flex items-center justify-center gap-2 text-sm text-muted transition hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('forgot.backToSignIn')}
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      {isLocked && <LockTimerBadge display={formatCountdown(secondsRemaining)} />}

      <GoogleAuthButton onToken={handleGoogleToken} onError={(message) => notify.error(message)} />

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">{t('auth.or')}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <EmailField
          label={t('auth.emailLabel')}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            clearError('email');
          }}
          placeholder={t('auth.emailPlaceholder')}
          checkProvider
          onStatusChange={setEmailStatus}
          error={fieldErrors.email && t(fieldErrors.email)}
        />

        <div className="relative">
          <FormField
            label={t('auth.passwordLabel')}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearError('password');
            }}
            placeholder={t('auth.passwordPlaceholder')}
            autoComplete="current-password"
            error={fieldErrors.password && t(fieldErrors.password)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            className="absolute right-3 top-9 text-muted hover:text-ink"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            state={{ email: email.trim() }}
            className="text-sm text-muted hover:text-ink"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>

        <Captcha ref={captchaRef} onToken={setCaptchaToken} />

        <Button
          type="submit"
          loading={loading}
          loadingLabel={t('auth.signingIn')}
          disabled={isLocked || (captchaEnabled && !captchaToken)}
        >
          {captchaEnabled && !captchaToken ? t('captcha.verifying') : t('auth.signIn')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t('auth.noAccount')}{' '}
        <Link to="/signup" className="font-medium text-ink hover:underline">
          {t('auth.createOne')}
        </Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;
