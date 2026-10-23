import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/AuthLayout.jsx';
import EmailField from '../components/EmailField.jsx';
import FormField from '../components/FormField.jsx';
import OtpInput from '../components/OtpInput.jsx';
import PasswordStrength from '../components/PasswordStrength.jsx';
import Button from '../components/Button.jsx';
import Captcha, { captchaEnabled } from '../components/Captcha.jsx';
import { requestPasswordReset, verifyResetCode, resetPassword } from '../services/authService.js';
import { passwordIssue } from '../utils/emailRules.js';
import { useTranslation } from '../i18n/useTranslation.js';
import { notify } from '../i18n/notifications.js';

const CODE_LENGTH = 6;
const STEPS = ['email', 'code', 'password'];

const stepMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

function StepIndicator({ current }) {
  const { t } = useTranslation();
  const index = STEPS.indexOf(current);

  return (
    <div
      className="mb-6 flex items-center gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={STEPS.length}
      aria-valuenow={index + 1}
      aria-label={t('forgot.stepLabel', { current: index + 1, total: STEPS.length })}
    >
      {STEPS.map((step, position) => (
        <span
          key={step}
          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
            position <= index ? 'bg-ink' : 'bg-border'
          }`}
        />
      ))}
    </div>
  );
}

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, tServer } = useTranslation();

  const [step, setStep] = useState('email');
  const [email, setEmail] = useState(location.state?.email || '');
  const [emailStatus, setEmailStatus] = useState('idle');
  const [emailError, setEmailError] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [errorStamp, setErrorStamp] = useState(0);
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const verifyingRef = useRef(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const titles = {
    email: [t('forgot.emailTitle'), t('forgot.emailSubtitle')],
    code: [t('forgot.codeTitle'), t('forgot.codeSubtitle', { email: email.trim().toLowerCase() })],
    password: [t('forgot.passwordTitle'), t('forgot.passwordSubtitle')],
    done: [t('forgot.doneTitle'), t('forgot.doneSubtitle')],
  };

  const sendCode = async ({ resend = false } = {}) => {
    setEmailError('');

    if (!resend) {
      if (!email.trim()) {
        setEmailError(t('auth.emailRequired'));
        return;
      }
      if (emailStatus === 'invalid') {
        setEmailError(t('auth.emailInvalid'));
        return;
      }
      if (emailStatus === 'disposable') {
        setEmailError(t('auth.emailDisposable'));
        return;
      }
    }

    setLoading(true);
    try {
      const data = await requestPasswordReset({ email: email.trim(), captchaToken, resend });
      setCooldown(data?.cooldownSeconds || 60);
      setCode('');
      setCodeError('');
      if (resend) notify.success(t('forgot.codeResent'));
      else setCaptchaToken(null);
      setStep('code');
    } catch (error) {
      if (resend || step === 'code') notify.error(tServer(error));
      else setEmailError(tServer(error));
      if (!resend) captchaRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = (event) => {
    event.preventDefault();
    sendCode();
  };

  const submitCode = async (value) => {
    if (verifyingRef.current) return;

    if (value.length < CODE_LENGTH) {
      setCodeError(t('forgot.codeIncomplete'));
      setErrorStamp((stamp) => stamp + 1);
      return;
    }

    verifyingRef.current = true;
    setLoading(true);
    setCodeError('');

    try {
      const data = await verifyResetCode({ email: email.trim(), code: value });
      setResetToken(data.resetToken);
      setStep('password');
    } catch (error) {
      setCodeError(tServer(error));
      setCode('');
      setErrorStamp((stamp) => stamp + 1);
    } finally {
      verifyingRef.current = false;
      setLoading(false);
    }
  };

  const handleCodeSubmit = (event) => {
    event.preventDefault();
    submitCode(code);
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    const next = {};
    const issue = passwordIssue(password);
    if (issue) next.password = t(issue);
    if (!confirm) next.confirm = t('forgot.confirmRequired');
    else if (confirm !== password) next.confirm = t('forgot.passwordMismatch');
    setPasswordErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      await resetPassword({ resetToken, newPassword: password });
      notify.success(t('forgot.successToast'));
      setStep('done');
    } catch (error) {
      const message = tServer(error);
      notify.error(message);
      if (error?.status === 400 && error.message === 'Your reset session has expired. Please start again.') {
        setStep('email');
        setCode('');
        setResetToken('');
        setPassword('');
        setConfirm('');
      }
    } finally {
      setLoading(false);
    }
  };

  const changeEmail = () => {
    setStep('email');
    setCode('');
    setCodeError('');
    setCooldown(0);
  };

  const [title, subtitle] = titles[step];

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      {step !== 'done' && <StepIndicator current={step} />}

      <AnimatePresence mode="wait" initial={false}>
        {step === 'email' && (
          <motion.form key="email" {...stepMotion} onSubmit={handleEmailSubmit} noValidate className="flex flex-col gap-5">
            <EmailField
              label={t('auth.emailLabel')}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError('');
              }}
              placeholder={t('auth.emailPlaceholder')}
              autoFocus
              checkProvider
              error={emailError}
              onStatusChange={setEmailStatus}
            />

            <Captcha ref={captchaRef} onToken={setCaptchaToken} />

            <Button
              type="submit"
              loading={loading}
              loadingLabel={t('forgot.sendingCode')}
              disabled={captchaEnabled && !captchaToken}
            >
              {captchaEnabled && !captchaToken ? t('captcha.verifying') : t('forgot.sendCode')}
            </Button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm text-muted transition hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('forgot.backToSignIn')}
            </Link>
          </motion.form>
        )}

        {step === 'code' && (
          <motion.form key="code" {...stepMotion} onSubmit={handleCodeSubmit} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">{t('forgot.codeLabel')}</span>
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
                label={t('forgot.codeLabel')}
              />
              <div className="min-h-[1.25rem]" aria-live="assertive">
                {codeError && (
                  <span role="alert" className="text-xs font-medium text-red-600">
                    {codeError}
                  </span>
                )}
              </div>
              <p className="text-xs leading-snug text-muted">{t('forgot.codeHint')}</p>
            </div>

            <Button type="submit" loading={loading} loadingLabel={t('forgot.verifying')} disabled={code.length < CODE_LENGTH}>
              {t('forgot.verify')}
            </Button>

            <div className="flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
              <button
                type="button"
                onClick={() => sendCode({ resend: true })}
                disabled={cooldown > 0 || loading}
                className="font-medium text-ink transition hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
              >
                {cooldown > 0 ? t('forgot.resendIn', { seconds: cooldown }) : t('forgot.resend')}
              </button>
              <button type="button" onClick={changeEmail} className="text-muted transition hover:text-ink">
                {t('forgot.changeEmail')}
              </button>
            </div>
          </motion.form>
        )}

        {step === 'password' && (
          <motion.form key="password" {...stepMotion} onSubmit={handlePasswordSubmit} noValidate className="flex flex-col gap-4">
            <div className="relative">
              <FormField
                label={t('forgot.newPassword')}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setPasswordErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder={t('auth.signupPasswordPlaceholder')}
                autoComplete="new-password"
                autoFocus
                error={passwordErrors.password}
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

            <PasswordStrength password={password} />

            <FormField
              label={t('forgot.confirmPassword')}
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value);
                setPasswordErrors((prev) => ({ ...prev, confirm: undefined }));
              }}
              placeholder={t('forgot.confirmPlaceholder')}
              autoComplete="new-password"
              error={passwordErrors.confirm}
            />

            <Button type="submit" loading={loading} loadingLabel={t('forgot.updatingPassword')}>
              {t('forgot.updatePassword')}
            </Button>
          </motion.form>
        )}

        {step === 'done' && (
          <motion.div key="done" {...stepMotion} className="flex flex-col items-center gap-6 text-center">
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
            >
              <Check className="h-8 w-8" strokeWidth={2.5} />
            </motion.span>
            <Button type="button" onClick={() => navigate('/login', { replace: true, state: { email: email.trim() } })}>
              {t('forgot.signInNow')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
