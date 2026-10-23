import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Laptop,
  Loader2,
  Mail,
  AlertTriangle,
  ShieldCheck,
  Copy,
  Check,
  Lock,
  MapPin,
  User,
  SlidersHorizontal,
  ArrowLeft,
  Link2,
  Link2Off,
  History,
} from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader.jsx';
import FormField from '../components/FormField.jsx';
import Button from '../components/Button.jsx';
import Combobox from '../components/Combobox.jsx';
import OtpInput from '../components/OtpInput.jsx';
import GoogleLinkButton from '../components/GoogleLinkButton.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  updateProfile,
  changePassword,
  uploadAvatar,
  listSessions,
  revokeSession,
  logoutAllSessions,
  requestEmailChange,
  verifyEmailChange,
  requestAccountDeletion,
  confirmAccountDeletion,
  beginMfaSetup,
  confirmMfaSetup,
  disableMfa,
} from '../services/userService.js';
import { linkGoogleAccount, unlinkGoogleAccount } from '../services/authService.js';
import { resolveAvatarUrl, initialsFromName } from '../utils/avatar.js';
import { sanitizeNameInput, isValidName } from '../utils/nameRules.js';
import { useTranslation } from '../i18n/useTranslation.js';
import { useLocalizedOptions } from '../i18n/useLocalizedOptions.js';
import { useFormat } from '../i18n/useFormat.js';
import { notify } from '../i18n/notifications.js';
import { serverMessageKey, translate } from '../i18n/translate.js';

const EMAIL_CODE_LENGTH = 6;

// Rounds up so "locked until tomorrow 2am" reads as "1 day left", not "0".
const daysUntil = (iso) => {
  if (!iso) return 0;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)));
};

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX_BYTES = 3 * 1024 * 1024;

function SettingsCard({ title, subtitle, locked, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl border bg-white ${locked ? 'border-ink' : 'border-border'}`}
    >
      {/* overflow-hidden used to live on the whole card so the locked
          banner's top corners stayed rounded, but that also clipped any
          dropdown menu (Combobox) that opens below it - the Country
          dropdown had enough room before the card's bottom edge to still
          be visible, but Language/Currency further down did not, and
          looked broken/unscrollable. Rounding is scoped to just the
          banner itself instead, so menus can now overflow the card. */}
      {locked && (
        <div className="flex items-center gap-2 rounded-t-xl bg-ink px-6 py-2.5 text-white">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs font-medium">{title}</span>
        </div>
      )}
      <div className="p-6">
        {!locked && (
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
          </div>
        )}
        {subtitle && <p className={`${locked ? '' : 'mt-0.5'} text-sm text-muted`}>{subtitle}</p>}
        <div className={subtitle || !locked ? 'mt-5' : ''}>{children}</div>
      </div>
    </motion.section>
  );
}

function ProfileSection() {
  const { user, updateUser } = useAuth();
  const { t, tServer } = useTranslation();
  const { formatDate } = useFormat();
  const inputRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const nameLocked = Boolean(user?.usernameLockedUntil);

  const avatarSrc = resolveAvatarUrl(user?.avatarUrl);

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!PHOTO_TYPES.includes(file.type)) {
      notify.error(t('errors.uploadImageType'));
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      notify.error(t('errors.imageTooLarge'));
      return;
    }

    setUploadingPhoto(true);
    try {
      const data = await uploadAvatar(file);
      updateUser(data.user);
      setAvatarFailed(false);
      notify.success(t('status.photoUpdated'));
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleNameSave = async (event) => {
    event.preventDefault();

    if (!name.trim()) {
      setNameError('status.nameEmpty');
      return;
    }

    if (!isValidName(name)) {
      setNameError('errors.nameInvalid');
      return;
    }

    setSavingName(true);
    try {
      const data = await updateProfile({ name });
      updateUser(data.user);
      notify.success(t('status.nameUpdated'));
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setSavingName(false);
    }
  };

  return (
    <SettingsCard title={t('settings.profileTitle')} subtitle={t('settings.profileSubtitle')}>
      <div className="flex items-center gap-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handlePhotoChange}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploadingPhoto}
          aria-label={t('settings.changePhoto')}
          aria-busy={uploadingPhoto ? 'true' : undefined}
          className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-surface"
        >
          {uploadingPhoto ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          ) : avatarSrc && !avatarFailed ? (
            <img
              src={avatarSrc}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-muted">{initialsFromName(user?.name)}</span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition hover:bg-black/40 hover:opacity-100">
            <Camera className="h-4 w-4" />
          </span>
        </button>
        <div>
          <p className="text-sm font-medium text-ink">{t('settings.photoLabel')}</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploadingPhoto}
            className="text-sm text-muted hover:text-ink disabled:cursor-wait"
          >
            {uploadingPhoto ? t('common.uploading') : t('settings.changePhoto')}
          </button>
        </div>
      </div>

      <form onSubmit={handleNameSave} noValidate className="mt-6 flex flex-col gap-4">
        <FormField
          label={t('settings.fullName')}
          value={name}
          onChange={(event) => {
            setName(sanitizeNameInput(event.target.value));
            setNameError('');
          }}
          error={nameError && t(nameError)}
          disabled={nameLocked}
        />
        {nameLocked ? (
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            {t('settings.cooldownLocked', {
              days: daysUntil(user.usernameLockedUntil),
              date: formatDate(new Date(user.usernameLockedUntil), { day: 'numeric', month: 'short' }),
            })}
          </p>
        ) : (
          <div>
            <Button type="submit" loading={savingName} loadingLabel={t('common.saving')}>
              {t('settings.saveName')}
            </Button>
          </div>
        )}
      </form>

      {user?.nameHistory?.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="flex items-center gap-1 text-xs text-muted hover:text-ink"
          >
            <History className="h-3 w-3" /> {t('settings.viewHistory')}
          </button>
          {showHistory && (
            <ul className="mt-1.5 flex flex-col gap-1">
              {user.nameHistory.map((entry, index) => (
                <li key={index} className="text-xs text-muted">
                  {t('settings.previouslyWas', {
                    value: entry.value,
                    date: formatDate(new Date(entry.changedAt), { day: 'numeric', month: 'short', year: 'numeric' }),
                  })}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </SettingsCard>
  );
}

function PasswordSection() {
  const { user, setSession, updateUser } = useAuth();
  const { t, tServer } = useTranslation();
  const isGoogleOnly = !user?.hasPassword;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const clearError = (field) => setFieldErrors((prev) => ({ ...prev, [field]: undefined }));

  const validate = () => {
    const next = {};
    if (!isGoogleOnly && !currentPassword) next.current = 'settings.currentPasswordRequired';
    if (!newPassword) next.new = 'auth.passwordRequired';
    else if (newPassword.length < 8) next.new = 'auth.passwordTooShort';
    if (newPassword && confirmPassword !== newPassword) next.confirm = 'status.passwordMismatch';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const data = await changePassword(isGoogleOnly ? { newPassword } : { currentPassword, newPassword });
      if (data?.accessToken) setSession(data);
      else if (data?.user) updateUser(data.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify.success(isGoogleOnly ? t('status.passwordSet') : t('status.passwordUpdated'));
    } catch (error) {
      if (serverMessageKey(error) === 'errors.currentPasswordWrong') {
        setFieldErrors({ current: 'errors.currentPasswordWrong' });
      } else {
        notify.error(tServer(error));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard
      title={t('settings.passwordTitle')}
      subtitle={isGoogleOnly ? t('settings.passwordSetSubtitle') : t('settings.passwordSubtitle')}
    >
      {isGoogleOnly && <p className="mb-4 text-sm text-muted">{t('settings.googleNoPassword')}</p>}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {!isGoogleOnly && (
          <FormField
            label={t('settings.currentPassword')}
            type="password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              clearError('current');
            }}
            autoComplete="current-password"
            error={fieldErrors.current && t(fieldErrors.current)}
          />
        )}
        <FormField
          label={isGoogleOnly ? t('settings.newPasswordToSet') : t('settings.newPassword')}
          type="password"
          value={newPassword}
          onChange={(event) => {
            setNewPassword(event.target.value);
            clearError('new');
          }}
          placeholder={t('auth.signupPasswordPlaceholder')}
          autoComplete="new-password"
          error={fieldErrors.new && t(fieldErrors.new)}
        />
        <FormField
          label={t('settings.confirmPassword')}
          type="password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            clearError('confirm');
          }}
          autoComplete="new-password"
          error={fieldErrors.confirm && t(fieldErrors.confirm)}
        />
        <div>
          <Button type="submit" loading={saving} loadingLabel={t('common.updating')}>
            {isGoogleOnly ? t('settings.setPassword') : t('settings.updatePassword')}
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}

function GoogleLinkStatus({ user, updateUser }) {
  const { t, tServer } = useTranslation();
  const { formatDate } = useFormat();
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [unlinkPassword, setUnlinkPassword] = useState('');
  const [unlinkError, setUnlinkError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleLinkGoogleToken = async (idToken) => {
    setLinkingGoogle(true);
    try {
      const data = await linkGoogleAccount(idToken);
      updateUser(data.user);
      notify.success(t('settings.googleLinked'));
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setLinkingGoogle(false);
    }
  };

  const handleUnlink = async (event) => {
    event.preventDefault();
    if (!unlinkPassword) {
      setUnlinkError('settings.currentPasswordRequired');
      return;
    }
    setSaving(true);
    try {
      const data = await unlinkGoogleAccount(unlinkPassword);
      updateUser(data.user);
      notify.success(t('settings.googleUnlinked'));
      setUnlinking(false);
      setUnlinkPassword('');
      setUnlinkError('');
    } catch (error) {
      setUnlinkError(tServer(error));
    } finally {
      setSaving(false);
    }
  };

  if (user?.googleLinkLockedUntil) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        {t('settings.googleRelinkLocked', {
          days: daysUntil(user.googleLinkLockedUntil),
          date: formatDate(new Date(user.googleLinkLockedUntil), { day: 'numeric', month: 'short' }),
        })}
      </p>
    );
  }

  if (user?.googleLinked) {
    return (
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <Link2 className="h-3.5 w-3.5" /> {t('settings.googleAlreadyLinked')}
        </p>
        {!user?.hasPassword ? (
          // Unlinking needs a password to fall back on - this account
          // doesn't have one yet, so there's nothing a password field here
          // could ever confirm. Point to where one can actually be set
          // instead of showing a form that can never succeed.
          <p className="text-xs text-muted">{t('settings.googleUnlinkNeedsPasswordFirst')}</p>
        ) : unlinking ? (
          <form onSubmit={handleUnlink} className="flex flex-col gap-2">
            <FormField
              label={t('settings.currentPassword')}
              type="password"
              value={unlinkPassword}
              onChange={(event) => {
                setUnlinkPassword(event.target.value);
                setUnlinkError('');
              }}
              autoComplete="current-password"
              error={unlinkError && t(unlinkError)}
            />
            <div className="flex items-center gap-3">
              <Button type="submit" loading={saving} loadingLabel={t('common.saving')}>
                {t('settings.confirmGoogleUnlink')}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setUnlinking(false);
                  setUnlinkPassword('');
                  setUnlinkError('');
                }}
                className="text-sm text-muted hover:text-ink"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setUnlinking(true)}
            className="flex w-fit items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700"
          >
            <Link2Off className="h-3.5 w-3.5" /> {t('settings.googleUnlink')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-muted">{t('settings.googleLinkHint')}</p>
      {linkingGoogle ? (
        <p className="text-xs text-muted">{t('common.saving')}</p>
      ) : (
        <GoogleLinkButton onToken={handleLinkGoogleToken} onError={(message) => notify.error(message)} />
      )}
    </div>
  );
}

function EmailSection() {
  const { user, updateUser } = useAuth();
  const { t, tServer } = useTranslation();
  const { formatDate } = useFormat();

  const [step, setStep] = useState('idle'); // idle | code
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [oldCode, setOldCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [oldCodeError, setOldCodeError] = useState(false);
  const [newCodeError, setNewCodeError] = useState(false);
  const [codeMessage, setCodeMessage] = useState('');
  const [errorStamp, setErrorStamp] = useState(0);
  const [saving, setSaving] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!user?.hasPassword) {
    return (
      <SettingsCard title={t('settings.emailTitle')} locked>
        <p className="text-sm text-muted">{t('settings.emailGoogleManaged')}</p>
      </SettingsCard>
    );
  }

  if (user?.emailLockedUntil) {
    return (
      <SettingsCard title={t('settings.emailTitle')} locked>
        <p className="text-sm text-ink">{user?.email}</p>
        <p className="mt-2 text-sm text-muted">
          {t('settings.cooldownLocked', {
            days: daysUntil(user.emailLockedUntil),
            date: formatDate(new Date(user.emailLockedUntil), { day: 'numeric', month: 'short' }),
          })}
        </p>
      </SettingsCard>
    );
  }

  const handleRequest = async (event) => {
    event.preventDefault();
    const next = {};
    if (!newEmail.trim()) next.newEmail = 'auth.emailRequired';
    if (!password) next.password = 'settings.currentPasswordRequired';
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const data = await requestEmailChange({ newEmail: newEmail.trim(), password });
      setCooldown(data?.cooldownSeconds || 60);
      setOldCode('');
      setNewCode('');
      setOldCodeError(false);
      setNewCodeError(false);
      setCodeMessage('');
      setStep('code');
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setSaving(false);
    }
  };

  const submitCodes = async (overrides = {}) => {
    // OtpInput's onComplete fires in the same tick as its onChange, before
    // React has committed the matching setOldCode/setNewCode state update -
    // so reading oldCode/newCode straight from this closure can see a value
    // that's one digit short of what was actually just typed. Accept the
    // freshly-completed value directly instead of trusting the closure.
    const effectiveOldCode = overrides.oldCode ?? oldCode;
    const effectiveNewCode = overrides.newCode ?? newCode;
    if (effectiveOldCode.length < EMAIL_CODE_LENGTH || effectiveNewCode.length < EMAIL_CODE_LENGTH) {
      setCodeMessage(t('auth.deviceCodeIncomplete'));
      setErrorStamp((stamp) => stamp + 1);
      return;
    }
    setSaving(true);
    setCodeMessage('');
    setOldCodeError(false);
    setNewCodeError(false);
    try {
      const data = await verifyEmailChange({ oldCode: effectiveOldCode, newCode: effectiveNewCode });
      updateUser(data.user);
      notify.success(t('status.emailUpdated'));
      setStep('idle');
      setNewEmail('');
      setPassword('');
      setOldCode('');
      setNewCode('');
    } catch (error) {
      setCodeMessage(tServer(error));
      const field = error?.data?.invalidField;
      setOldCodeError(field === 'old' || field === 'both');
      setNewCodeError(field === 'new' || field === 'both');
      setOldCode('');
      setNewCode('');
      setErrorStamp((stamp) => stamp + 1);
    } finally {
      setSaving(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || saving) return;
    setSaving(true);
    try {
      const data = await requestEmailChange({ newEmail: newEmail.trim(), password });
      setCooldown(data?.cooldownSeconds || 60);
      notify.success(t('auth.deviceCodeResent'));
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard title={t('settings.emailTitle')} subtitle={t('settings.emailSubtitle')}>
      <p className="mb-1 text-sm text-ink">{user?.email}</p>

      {user?.emailHistory?.length > 0 && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="flex items-center gap-1 text-xs text-muted hover:text-ink"
          >
            <History className="h-3 w-3" /> {t('settings.viewHistory')}
          </button>
          {showHistory && (
            <ul className="mt-1.5 flex flex-col gap-1">
              {user.emailHistory.map((entry, index) => (
                <li key={index} className="text-xs text-muted">
                  {t('settings.previouslyWas', {
                    value: entry.value,
                    date: formatDate(new Date(entry.changedAt), { day: 'numeric', month: 'short', year: 'numeric' }),
                  })}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {step === 'code' ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">{t('settings.emailCodeSentToOld')}</p>
            <OtpInput
              length={EMAIL_CODE_LENGTH}
              value={oldCode}
              onChange={(value) => {
                setOldCode(value);
                if (codeMessage) setCodeMessage('');
              }}
              onComplete={(value) => submitCodes({ oldCode: value })}
              disabled={saving}
              hasError={oldCodeError}
              errorStamp={errorStamp}
              label={t('settings.emailOldCodeLabel')}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">{t('settings.emailCodeSentTo', { email: newEmail.trim() })}</p>
            <OtpInput
              length={EMAIL_CODE_LENGTH}
              value={newCode}
              onChange={(value) => {
                setNewCode(value);
                if (codeMessage) setCodeMessage('');
              }}
              onComplete={(value) => submitCodes({ newCode: value })}
              disabled={saving}
              hasError={newCodeError}
              errorStamp={errorStamp}
              label={t('settings.emailNewCodeLabel')}
            />
          </div>
          {codeMessage && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {codeMessage}
            </p>
          )}
          <div className="flex items-center gap-4">
            <Button type="button" loading={saving} loadingLabel={t('common.saving')} onClick={submitCodes}>
              {t('settings.confirmEmail')}
            </Button>
            <button
              type="button"
              onClick={resend}
              disabled={cooldown > 0 || saving}
              className="text-sm text-muted hover:text-ink disabled:cursor-default disabled:opacity-60"
            >
              {cooldown > 0 ? t('auth.deviceResendIn', { seconds: cooldown }) : t('auth.deviceResend')}
            </button>
          </div>
          <button type="button" onClick={() => setStep('idle')} className="self-start text-sm text-muted hover:text-ink">
            {t('common.cancel')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleRequest} noValidate className="flex flex-col gap-4">
          <FormField
            label={t('settings.newEmail')}
            type="email"
            value={newEmail}
            onChange={(event) => {
              setNewEmail(event.target.value);
              setFieldErrors((prev) => ({ ...prev, newEmail: undefined }));
            }}
            error={fieldErrors.newEmail && t(fieldErrors.newEmail)}
          />
          <FormField
            label={t('settings.currentPassword')}
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            autoComplete="current-password"
            error={fieldErrors.password && t(fieldErrors.password)}
          />
          <div>
            <Button type="submit" loading={saving} loadingLabel={t('common.saving')}>
              {t('settings.sendEmailCode')}
            </Button>
          </div>
        </form>
      )}
    </SettingsCard>
  );
}

function MfaSection() {
  const { user, updateUser } = useAuth();
  const { t, tServer } = useTranslation();

  // idle -> setup (QR + confirm code) -> backup-codes (shown once) | idle -> disable (password)
  const [stage, setStage] = useState('idle');
  const [setupToken, setSetupToken] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [errorStamp, setErrorStamp] = useState(0);
  const [backupCodes, setBackupCodes] = useState([]);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState('');
  const [disableError, setDisableError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user?.hasPassword) {
    return (
      <SettingsCard title={t('settings.mfaTitle')} locked>
        <p className="text-sm text-muted">{t('settings.mfaGoogleManaged')}</p>
      </SettingsCard>
    );
  }

  const reset = () => {
    setStage('idle');
    setSetupToken('');
    setQrCode('');
    setSecret('');
    setCode('');
    setCodeError('');
    setBackupCodes([]);
    setCopied(false);
    setPassword('');
    setDisableError('');
  };

  const startSetup = async () => {
    setLoading(true);
    try {
      const data = await beginMfaSetup();
      setSetupToken(data.setupToken);
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStage('setup');
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setLoading(false);
    }
  };

  const submitSetupCode = async (value) => {
    if (value.length < EMAIL_CODE_LENGTH) {
      setCodeError(t('auth.deviceCodeIncomplete'));
      setErrorStamp((stamp) => stamp + 1);
      return;
    }
    setLoading(true);
    setCodeError('');
    try {
      const data = await confirmMfaSetup({ setupToken, code: value });
      setBackupCodes(data.backupCodes || []);
      updateUser({ mfaEnabled: true });
      setStage('backup-codes');
    } catch (error) {
      setCodeError(tServer(error));
      setCode('');
      setErrorStamp((stamp) => stamp + 1);
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Clipboard access can be blocked by the browser; the codes are still
      // visible on screen to copy by hand.
    }
  };

  const handleDisable = async (event) => {
    event.preventDefault();
    setDisableError('');
    if (!password) {
      setDisableError(t('settings.currentPasswordRequired'));
      return;
    }
    setLoading(true);
    try {
      await disableMfa(password);
      updateUser({ mfaEnabled: false });
      notify.success(t('status.mfaDisabled'));
      reset();
    } catch (error) {
      setDisableError(tServer(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsCard title={t('settings.mfaTitle')} subtitle={t('settings.mfaSubtitle')}>
      {stage === 'idle' && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                user?.mfaEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-surface text-muted'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
            </span>
            <p className="text-sm text-ink">{user?.mfaEnabled ? t('settings.mfaOn') : t('settings.mfaOff')}</p>
          </div>
          {user?.mfaEnabled ? (
            <button
              type="button"
              onClick={() => setStage('disable')}
              className="shrink-0 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-black/[0.03]"
            >
              {t('settings.mfaTurnOff')}
            </button>
          ) : (
            <button
              type="button"
              onClick={startSetup}
              disabled={loading}
              aria-busy={loading ? 'true' : undefined}
              className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? t('common.saving') : t('settings.mfaTurnOn')}
            </button>
          )}
        </div>
      )}

      {stage === 'setup' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">{t('settings.mfaScanHint')}</p>
          {qrCode && (
            <img src={qrCode} alt={t('settings.mfaQrAlt')} className="h-40 w-40 rounded-lg border border-border" />
          )}
          <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5 font-mono text-sm text-ink break-all">
            {secret}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">{t('settings.mfaEnterCode')}</span>
            <OtpInput
              length={EMAIL_CODE_LENGTH}
              value={code}
              onChange={(value) => {
                setCode(value);
                if (codeError) setCodeError('');
              }}
              onComplete={submitSetupCode}
              disabled={loading}
              hasError={Boolean(codeError)}
              errorStamp={errorStamp}
              label={t('settings.mfaEnterCode')}
            />
            {codeError && (
              <p role="alert" className="text-xs font-medium text-red-600">
                {codeError}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button type="button" loading={loading} loadingLabel={t('common.saving')} onClick={() => submitSetupCode(code)}>
              {t('settings.mfaConfirmEnable')}
            </Button>
            <button type="button" onClick={reset} disabled={loading} className="text-sm text-muted hover:text-ink">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {stage === 'backup-codes' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink">{t('settings.mfaBackupHint')}</p>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface p-4 font-mono text-sm text-ink">
            {backupCodes.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={copyBackupCodes}
              className="flex items-center gap-1.5 text-sm font-medium text-ink hover:underline"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? t('settings.mfaCopied') : t('settings.mfaCopyCodes')}
            </button>
          </div>
          <div>
            <Button type="button" onClick={reset}>
              {t('settings.mfaBackupDone')}
            </Button>
          </div>
        </div>
      )}

      {stage === 'disable' && (
        <form onSubmit={handleDisable} noValidate className="flex flex-col gap-4">
          <p className="text-sm text-muted">{t('settings.mfaTurnOffHint')}</p>
          <FormField
            label={t('settings.currentPassword')}
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setDisableError('');
            }}
            autoComplete="current-password"
            error={disableError}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" loading={loading} loadingLabel={t('common.saving')}>
              {t('settings.mfaConfirmDisable')}
            </Button>
            <button type="button" onClick={reset} disabled={loading} className="text-sm text-muted hover:text-ink">
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}
    </SettingsCard>
  );
}

function DevicesSection() {
  const { clearSession, markIntentionalLogout } = useAuth();
  const { t, tServer } = useTranslation();
  const { formatDate } = useFormat();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await listSessions();
        if (!cancelled) setSessions(data?.sessions || []);
      } catch (error) {
        if (!cancelled) notify.error(tServer(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRevoke = async (id) => {
    const target = sessions.find((session) => session.id === id);
    setRevokingId(id);
    try {
      await revokeSession(id);
      setSessions((prev) => prev.filter((session) => session.id !== id));
      if (target?.isCurrent) {
        // Revoking the device we're actually using right now immediately
        // invalidates this very session - any request right after this one
        // (including ones already in flight) would otherwise also trip the
        // generic "session expired" toast from the global 401 handler,
        // showing two different messages for one action. Mark this as an
        // intentional logout first so only our own clear message shows, then
        // sign out of this device for real.
        markIntentionalLogout();
        notify.success(t('status.sessionRevokedSelf'));
        clearSession();
        return;
      }
      notify.success(t('status.sessionRevoked'));
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setRevokingId(null);
    }
  };

  const handleLogoutAll = async () => {
    setLoggingOutAll(true);
    markIntentionalLogout();
    try {
      await logoutAllSessions();
      notify.success(t('status.loggedOutEverywhere'));
      clearSession();
    } catch (error) {
      notify.error(tServer(error));
      setLoggingOutAll(false);
    }
  };

  const lastActiveLabel = (value) =>
    t('settings.lastActive', { time: formatDate(new Date(value), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) });

  const LOOPBACK_IPS = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1']);
  // Show the actual IP address value, always - no friendly relabeling. In
  // local development that's genuinely ::1/127.0.0.1 (this computer talking
  // to itself); once deployed, this same field shows real visitor IPs.
  const ipLabel = (ip) => ip;
  const hasLocalSession = sessions.some((session) => LOOPBACK_IPS.has(session.ip));

  return (
    <SettingsCard title={t('settings.devicesTitle')} subtitle={t('settings.devicesSubtitle')}>
      {!loading && hasLocalSession && (
        <p className="mb-4 rounded-lg bg-surface px-3 py-2 text-xs text-muted">{t('settings.devicesLocalNote')}</p>
      )}
      {loading ? (
        <p className="text-sm text-muted">{t('common.loading')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
                  <Laptop className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {session.device}
                    {session.isCurrent && (
                      <span className="ml-2 rounded-full bg-ink/5 px-2 py-0.5 text-xs font-semibold text-ink/70">
                        {t('settings.thisDevice')}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">{lastActiveLabel(session.lastUsedAt)}</p>
                  {session.ip && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted/80">
                      <MapPin className="h-3 w-3 shrink-0" /> {ipLabel(session.ip)}
                    </p>
                  )}
                </div>
              </div>

              {!session.isCurrent && (
                <button
                  type="button"
                  onClick={() => handleRevoke(session.id)}
                  disabled={revokingId === session.id}
                  className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {revokingId === session.id ? t('common.revoking') : t('settings.revoke')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 border-t border-border pt-5">
        <Button
          type="button"
          onClick={handleLogoutAll}
          loading={loggingOutAll}
          loadingLabel={t('common.loggingOutEverywhere')}
        >
          {t('settings.logoutEverywhere')}
        </Button>
      </div>
    </SettingsCard>
  );
}

function PreferencesSection() {
  const { user, updateUser, language, currency } = useAuth();
  const { t, tServer } = useTranslation();
  const { countries, languages, currencies } = useLocalizedOptions();

  // Everything here is a PENDING selection local to this form. Nothing is applied
  // to the app (or saved) until "Update preferences" succeeds; country, language
  // and currency are independent and never change one another.
  const [country, setCountry] = useState(user?.country || '');
  const [pendingLanguage, setPendingLanguage] = useState(language);
  const [pendingCurrency, setPendingCurrency] = useState(currency);
  const [saving, setSaving] = useState(false);
  const [countryError, setCountryError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!country) {
      setCountryError('onboarding.selectRequired');
      return;
    }

    setSaving(true);
    try {
      const data = await updateProfile({
        country,
        language: pendingLanguage,
        currency: pendingCurrency,
      });
      // Committing the saved user is what switches the whole app to the new language.
      updateUser(data.user);
      // Announce in the language that was just applied, not the one being replaced.
      notify.success(translate(pendingLanguage, 'status.preferencesSaved'));
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard title={t('settings.preferencesTitle')} subtitle={t('settings.preferencesSubtitle')}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Combobox
          label={t('dashboard.country')}
          items={countries}
          value={country}
          onChange={(code) => {
            setCountry(code);
            setCountryError('');
          }}
          placeholder={t('combobox.searchCountries')}
          error={countryError && t(countryError)}
        />
        <div className="flex flex-col gap-1.5">
          <Combobox
            label={t('settings.appLanguage')}
            items={languages}
            value={pendingLanguage}
            onChange={setPendingLanguage}
            placeholder={t('combobox.searchLanguages')}
          />
          <p className="text-xs text-muted">{t('settings.languageHint')}</p>
        </div>
        <Combobox
          label={t('dashboard.currency')}
          items={currencies}
          value={pendingCurrency}
          onChange={setPendingCurrency}
          placeholder={t('combobox.searchCurrencies')}
        />

        <div>
          <Button type="submit" loading={saving} loadingLabel={t('common.saving')}>
            {t('settings.savePreferences')}
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}

function DangerZoneSection() {
  const { user, markIntentionalLogout, clearSession } = useAuth();
  const { t, tServer } = useTranslation();
  const sectionRef = useRef(null);

  // idle -> confirm (password / typed DELETE) -> code (emailed OTP)
  const [stage, setStage] = useState('idle');
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [errorStamp, setErrorStamp] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  // What confirms "this is really you" depends on whether this account has
  // a password at all - NOT on how it originally signed up. A Google
  // signup that later set a password (Settings > Password) now has one,
  // so it should confirm with that password just like any other account;
  // only an account with no password yet falls back to typing DELETE.
  // This must match requestAccountDeletion()'s own check (user.passwordHash)
  // on the backend, or the form asks for one thing while the server expects
  // another.
  const hasPassword = Boolean(user?.hasPassword);
  const isGoogle = !hasPassword;

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const openConfirm = () => {
    setStage('confirm');
    // The button that reveals this panel sits at the bottom of a long
    // Settings page, so bring the panel into view rather than leaving the
    // person to scroll down and find it themselves.
    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const sendDeletionCode = async () => {
    const data = await requestAccountDeletion(isGoogle ? { confirm: confirmText.trim() } : { password });
    setCooldown(data?.cooldownSeconds || 60);
    setCode('');
    setCodeError('');
    setStage('code');
  };

  const handleConfirmSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (isGoogle && confirmText.trim().toUpperCase() !== 'DELETE') {
      setError(t('settings.typeDeleteToConfirm'));
      return;
    }
    if (!isGoogle && !password) {
      setError(t('settings.currentPasswordRequired'));
      return;
    }

    setDeleting(true);
    try {
      await sendDeletionCode();
    } catch (err) {
      setError(tServer(err));
    } finally {
      setDeleting(false);
    }
  };

  const submitCode = async (value) => {
    if (value.length < EMAIL_CODE_LENGTH) {
      setCodeError(t('auth.deviceCodeIncomplete'));
      setErrorStamp((stamp) => stamp + 1);
      return;
    }

    setDeleting(true);
    setCodeError('');
    try {
      markIntentionalLogout();
      await confirmAccountDeletion(value);
      notify.success(t('status.accountDeleted'));
      clearSession();
    } catch (err) {
      setCodeError(tServer(err));
      setCode('');
      setErrorStamp((stamp) => stamp + 1);
      setDeleting(false);
    }
  };

  const resendCode = async () => {
    if (cooldown > 0 || deleting) return;
    setDeleting(true);
    try {
      await sendDeletionCode();
      notify.success(t('auth.deviceCodeResent'));
    } catch (err) {
      notify.error(tServer(err));
    } finally {
      setDeleting(false);
    }
  };

  const reset = () => {
    setStage('idle');
    setPassword('');
    setConfirmText('');
    setError('');
    setCode('');
    setCodeError('');
  };

  return (
    <SettingsCard title={t('settings.dangerZoneTitle')} subtitle={t('settings.dangerZoneSubtitle')}>
      <div ref={sectionRef} className="min-w-0">
        {stage === 'idle' && (
          <button
            type="button"
            onClick={openConfirm}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            <AlertTriangle className="h-4 w-4" />
            {t('settings.deleteAccount')}
          </button>
        )}

        {stage === 'confirm' && (
          <form onSubmit={handleConfirmSubmit} noValidate className="flex flex-col gap-4 rounded-lg border border-red-200 bg-red-50/60 p-4">
            <p className="text-sm text-red-700">{t('settings.deleteAccountWarning')}</p>

            {isGoogle ? (
              <FormField
                label={t('settings.typeDeleteLabel')}
                value={confirmText}
                onChange={(event) => {
                  setConfirmText(event.target.value);
                  setError('');
                }}
                error={error}
              />
            ) : (
              <FormField
                label={t('settings.currentPassword')}
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
                autoComplete="current-password"
                error={error}
              />
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={deleting} loadingLabel={t('common.saving')}>
                {t('settings.sendDeleteCode')}
              </Button>
              <button type="button" onClick={reset} disabled={deleting} className="text-sm text-muted hover:text-ink">
                {t('common.cancel')}
              </button>
            </div>
          </form>
        )}

        {stage === 'code' && (
          <div className="flex flex-col gap-4 rounded-lg border border-red-200 bg-red-50/60 p-4">
            <p className="text-sm text-red-700">{t('settings.deleteCodeSentTo', { email: user?.email || '' })}</p>
            <OtpInput
              length={EMAIL_CODE_LENGTH}
              value={code}
              onChange={(value) => {
                setCode(value);
                if (codeError) setCodeError('');
              }}
              onComplete={submitCode}
              disabled={deleting}
              hasError={Boolean(codeError)}
              errorStamp={errorStamp}
              label={t('auth.deviceCodeLabel')}
            />
            {codeError && (
              <p role="alert" className="text-xs font-medium text-red-600">
                {codeError}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4">
              <Button type="button" loading={deleting} loadingLabel={t('common.deleting')} onClick={() => submitCode(code)}>
                {t('settings.confirmDeleteAccount')}
              </Button>
              <button
                type="button"
                onClick={resendCode}
                disabled={cooldown > 0 || deleting}
                className="text-sm text-red-700/80 hover:text-red-700 disabled:cursor-default disabled:opacity-60"
              >
                {cooldown > 0 ? t('auth.deviceResendIn', { seconds: cooldown }) : t('auth.deviceResend')}
              </button>
              <button type="button" onClick={reset} disabled={deleting} className="text-sm text-muted hover:text-ink">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </SettingsCard>
  );
}

function GoogleAccountSection() {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation();

  return (
    <SettingsCard
      title={t('settings.googleTitle')}
      subtitle={user?.hasPassword ? t('settings.googleSubtitle') : t('settings.googleSubtitleGoogleOnly')}
    >
      <GoogleLinkStatus user={user} updateUser={updateUser} />
    </SettingsCard>
  );
}

function SecuritySection() {
  return (
    <div className="flex flex-col gap-6">
      <EmailSection />
      <PasswordSection />
      <GoogleAccountSection />
      <MfaSection />
    </div>
  );
}

const useSettingsSections = () => {
  const { t } = useTranslation();
  return [
    { id: 'profile', label: t('settings.sectionProfile'), icon: User, Component: ProfileSection },
    { id: 'security', label: t('settings.sectionSecurity'), icon: ShieldCheck, Component: SecuritySection },
    { id: 'devices', label: t('settings.sectionDevices'), icon: Laptop, Component: DevicesSection },
    { id: 'preferences', label: t('settings.sectionPreferences'), icon: SlidersHorizontal, Component: PreferencesSection },
    { id: 'danger', label: t('settings.sectionDanger'), icon: AlertTriangle, Component: DangerZoneSection, danger: true },
  ];
};

function SettingsNav({ sections, active, onChange }) {
  return (
    <nav
      aria-label="Settings sections"
      className="flex flex-row gap-1 overflow-x-auto pb-1 sm:flex-col sm:gap-1 sm:overflow-visible sm:pb-0"
    >
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = section.id === active;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? section.danger
                  ? 'text-red-700'
                  : 'text-ink'
                : 'text-muted hover:text-ink'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="settingsActiveTab"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                className={`absolute inset-0 rounded-lg ${section.danger ? 'bg-red-50' : 'bg-black/[0.04]'}`}
              />
            )}
            <Icon className="relative z-10 h-4 w-4 shrink-0" />
            <span className="relative z-10">{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function SettingsPage() {
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const sections = useSettingsSections();

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  const ActiveComponent = sections.find((section) => section.id === activeSection)?.Component || ProfileSection;

  return (
    <div className="min-h-screen bg-surface">
      <DashboardHeader />

      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label={t('settings.back')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-white text-ink hover:bg-black/[0.03]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-2xl font-semibold text-ink">{t('settings.title')}</h1>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            aria-busy={signingOut ? 'true' : undefined}
            className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-black/[0.03] disabled:cursor-wait disabled:opacity-70"
          >
            {signingOut && <Loader2 className="h-4 w-4 animate-spin" />}
            {signingOut ? t('common.signingOut') : t('settings.signOut')}
          </button>
        </div>

        <div className="flex flex-col gap-6 sm:grid sm:grid-cols-[200px_1fr] sm:items-start sm:gap-8">
          <div className="min-w-0 sm:sticky sm:top-6">
            <SettingsNav sections={sections} active={activeSection} onChange={setActiveSection} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="min-w-0"
            >
              <ActiveComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
