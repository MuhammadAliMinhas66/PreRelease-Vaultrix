import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import EmailField from '../components/EmailField.jsx';
import OtpInput from '../components/OtpInput.jsx';
import Button from '../components/Button.jsx';
import Captcha, { captchaEnabled } from '../components/Captcha.jsx';
import PasswordStrength from '../components/PasswordStrength.jsx';
import { passwordIssue } from '../utils/emailRules.js';
import { sanitizeNameInput, isValidName } from '../utils/nameRules.js';
import GoogleAuthButton from '../components/GoogleAuthButton.jsx';
import PageLoader from '../components/PageLoader.jsx';
import { signup, verifySignupCode, googleAuth } from '../services/authService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { notify } from '../i18n/notifications.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_LENGTH = 6;

const stepMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

function SignupPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const { t, tServer } = useTranslation();

  const [step, setStep] = useState('details');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState('idle');
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [errorStamp, setErrorStamp] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const proceedAfterAuth = (data) => {
    setSession(data);
    setRedirecting(true);
    setTimeout(() => {
      navigate(data.user.onboardingCompleted ? '/dashboard' : '/onboarding', { replace: true });
    }, 500);
  };

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = 'auth.nameRequired';
    else if (!isValidName(name)) next.name = 'errors.nameInvalid';
    if (!email.trim()) next.email = 'auth.emailRequired';
    else if (!EMAIL_PATTERN.test(email.trim()) || emailStatus === 'invalid') next.email = 'auth.emailInvalid';
    else if (emailStatus === 'disposable') next.email = 'auth.emailDisposable';
    else if (emailStatus === 'no_mail_server') next.email = 'auth.emailNoMailServer';
    const issue = passwordIssue(password);
    if (issue) next.password = issue;
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const sendCode = async ({ resend = false } = {}) => {
    if (!resend && !validate()) return;

    setLoading(true);
    try {
      const data = await signup(
        resend ? { email: email.trim(), resend: true } : { name: name.trim(), email: email.trim(), password, captchaToken }
      );
      setCooldown(data?.cooldownSeconds || 60);
      setCode('');
      setCodeError('');
      if (resend) notify.success(t('signupVerify.codeResent'));
      else setCaptchaToken(null);
      setStep('code');
    } catch (error) {
      notify.error(tServer(error));
      if (!resend) captchaRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendCode();
  };

  const submitCode = async (value) => {
    if (verifyingRef.current) return;

    if (value.length < CODE_LENGTH) {
      setCodeError(t('signupVerify.codeIncomplete'));
      setErrorStamp((stamp) => stamp + 1);
      return;
    }

    verifyingRef.current = true;
    setLoading(true);
    setCodeError('');

    try {
      const data = await verifySignupCode({ email: email.trim(), code: value });
      proceedAfterAuth(data);
    } catch (error) {
      setCodeError(tServer(error));
      setCode('');
      setErrorStamp((stamp) => stamp + 1);
      setLoading(false);
    } finally {
      verifyingRef.current = false;
    }
  };

  const handleCodeSubmit = (event) => {
    event.preventDefault();
    submitCode(code);
  };

  const handleGoogleToken = async (idToken) => {
    setLoading(true);
    try {
      const data = await googleAuth(idToken);
      if (data?.requiresDeviceVerification) {
        // Rare: this Google identity already has an account signed in on
        // the maximum number of devices. Signup has no device-verification
        // step of its own (that belongs to sign-in), so send them there
        // instead of half-building it here.
        notify.error(t('auth.tooManyDevicesUseLogin'));
        setLoading(false);
        return;
      }
      proceedAfterAuth(data);
    } catch (error) {
      notify.error(tServer(error));
      setLoading(false);
    }
  };

  const editDetails = () => {
    setStep('details');
    setCode('');
    setCodeError('');
    setCooldown(0);
  };

  const clearError = (field) => setFieldErrors((prev) => ({ ...prev, [field]: undefined }));

  if (redirecting) {
    return <PageLoader label={t('auth.settingUp')} />;
  }

  const [title, subtitle] =
    step === 'details'
      ? [t('auth.signupTitle'), t('auth.signupSubtitle')]
      : [t('signupVerify.title'), t('signupVerify.subtitle', { email: email.trim().toLowerCase() })];

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      <AnimatePresence mode="wait" initial={false}>
        {step === 'details' && (
          <motion.div key="details" {...stepMotion}>
            <GoogleAuthButton onToken={handleGoogleToken} onError={(message) => notify.error(message)} />

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted">{t('auth.or')}</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <FormField
                label={t('auth.fullNameLabel')}
                value={name}
                onChange={(event) => {
                  setName(sanitizeNameInput(event.target.value));
                  clearError('name');
                }}
                placeholder={t('auth.fullNamePlaceholder')}
                autoComplete="name"
                error={fieldErrors.name && t(fieldErrors.name)}
              />

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
                  placeholder={t('auth.signupPasswordPlaceholder')}
                  autoComplete="new-password"
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

              {password && <PasswordStrength password={password} />}

              <Captcha ref={captchaRef} onToken={setCaptchaToken} />

              <Button
                type="submit"
                loading={loading}
                loadingLabel={t('auth.creatingAccount')}
                disabled={captchaEnabled && !captchaToken}
              >
                {captchaEnabled && !captchaToken ? t('captcha.verifying') : t('auth.createAccount')}
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-muted">{t('auth.onboardingNote')}</p>

            <p className="mt-6 text-center text-sm text-muted">
              {t('auth.haveAccount')}{' '}
              <Link to="/login" className="font-medium text-ink hover:underline">
                {t('auth.signInLink')}
              </Link>
            </p>
          </motion.div>
        )}

        {step === 'code' && (
          <motion.form key="code" {...stepMotion} onSubmit={handleCodeSubmit} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">{t('signupVerify.codeLabel')}</span>
              <OtpInput
                length={CODE_LENGTH}
                value={code}
                onChange={(value) => {
                  setCode(value);
                  if (codeError) setCodeError('');
                }}
                onComplete={submitCode}
                disabled={loading}
                hasError={Boolean(codeError)}
                errorStamp={errorStamp}
                label={t('signupVerify.codeLabel')}
              />
              <div className="min-h-[1.25rem]" aria-live="assertive">
                {codeError && (
                  <span role="alert" className="text-xs font-medium text-red-600">
                    {codeError}
                  </span>
                )}
              </div>
              <p className="text-xs leading-snug text-muted">{t('signupVerify.codeHint')}</p>
            </div>

            <Button
              type="submit"
              loading={loading}
              loadingLabel={t('signupVerify.verifying')}
              disabled={code.length < CODE_LENGTH}
            >
              {t('signupVerify.verify')}
            </Button>

            <div className="flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
              <button
                type="button"
                onClick={() => sendCode({ resend: true })}
                disabled={cooldown > 0 || loading}
                className="font-medium text-ink transition hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
              >
                {cooldown > 0 ? t('signupVerify.resendIn', { seconds: cooldown }) : t('signupVerify.resend')}
              </button>
              <button
                type="button"
                onClick={editDetails}
                className="flex items-center gap-1.5 text-muted transition hover:text-ink"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('signupVerify.editDetails')}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}

export default SignupPage;
