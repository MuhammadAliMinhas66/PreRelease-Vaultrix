import { useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera } from 'lucide-react';
import Button from '../components/Button.jsx';
import Combobox from '../components/Combobox.jsx';
import Logo from '../components/Logo.jsx';
import OptionTile from '../components/onboarding/OptionTile.jsx';
import PhotoPicker from '../components/onboarding/PhotoPicker.jsx';
import ProfilePreview from '../components/onboarding/ProfilePreview.jsx';
import WelcomeScreen from '../components/onboarding/WelcomeScreen.jsx';
import { CountryIcon, LanguageIcon, CurrencyIcon } from '../components/icons/StepIcons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { updateProfile, uploadAvatar } from '../services/userService.js';
import { resolveAvatarUrl } from '../utils/avatar.js';
import { useTranslation } from '../i18n/useTranslation.js';
import { useLocalizedOptions } from '../i18n/useLocalizedOptions.js';
import { notify } from '../i18n/notifications.js';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX_BYTES = 3 * 1024 * 1024;
const WELCOME_MS = 1800;

const POPULAR_COUNTRIES = ['PK', 'IN', 'AE', 'GB', 'US', 'SA', 'BD', 'CA'];
const POPULAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED', 'SAR', 'CAD'];
const NATIVE_NAMES = { en: 'English', fr: 'Français', es: 'Español', ar: 'العربية', hi: 'हिन्दी', ur: 'اردو' };

const steps = ['country', 'language', 'currency', 'photo'];
const stepIcons = { country: CountryIcon, language: LanguageIcon, currency: CurrencyIcon, photo: Camera };

function Chip({ selected, onClick, code, label }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      aria-pressed={selected}
      className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ink/30 ${
        selected ? 'border-ink bg-ink text-white' : 'border-border bg-white text-ink hover:border-ink/40 hover:bg-surface'
      }`}
    >
      <span className={`text-[10px] font-semibold tracking-wider ${selected ? 'text-white/60' : 'text-muted'}`}>{code}</span>
      <span dir="auto" className="truncate">
        {label}
      </span>
    </motion.button>
  );
}

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, updateUser, language: appLanguage, currency: savedCurrency } = useAuth();
  const { t, tServer } = useTranslation();
  const { countries, languages, currencies } = useLocalizedOptions();

  const [stepIndex, setStepIndex] = useState(0);
  const [country, setCountry] = useState(user?.country || '');
  const [language, setLanguage] = useState(appLanguage);
  const [currency, setCurrency] = useState(savedCurrency || '');
  const [photoError, setPhotoError] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [welcoming, setWelcoming] = useState(false);

  const [activeSteps] = useState(() => (user?.avatarUrl ? steps.slice(0, 3) : steps));
  const currentStep = activeSteps[stepIndex];
  const isLastStep = stepIndex === activeSteps.length - 1;

  const requiredValueByStep = { country, language, currency, photo: 'optional' };
  const canContinue = Boolean(requiredValueByStep[currentStep]);

  const popularCountries = useMemo(
    () => POPULAR_COUNTRIES.map((code) => countries.find((item) => item.value === code)).filter(Boolean),
    [countries]
  );

  const popularCurrencies = useMemo(
    () => POPULAR_CURRENCIES.map((code) => currencies.find((item) => item.value === code)).filter(Boolean),
    [currencies]
  );

  const languageTiles = useMemo(() => {
    let names = null;
    try {
      names = new Intl.DisplayNames([appLanguage], { type: 'language' });
    } catch (error) {
      names = null;
    }
    return languages.map((item) => {
      const native = NATIVE_NAMES[item.value] || item.label;
      let localized = '';
      try {
        localized = names?.of(item.value) || '';
      } catch (error) {
        localized = '';
      }
      return { value: item.value, native, localized: localized && localized !== native ? localized : '' };
    });
  }, [languages, appLanguage]);

  const selectedCountry = countries.find((item) => item.value === country) || null;
  const selectedCurrency = currencies.find((item) => item.value === currency) || null;
  const selectedLanguage = languageTiles.find((item) => item.value === language) || null;

  if (welcoming) {
    return (
      <WelcomeScreen
        duration={WELCOME_MS}
        title={t('onboarding.welcomeTitle', { name: user?.name?.split(' ')[0] || '' })}
        subtitle={t('onboarding.welcomeSubtitle')}
      />
    );
  }

  if (user?.onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  const handlePhotoSelect = (file) => {
    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError(t('errors.uploadImageType'));
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setPhotoError(t('errors.imageTooLarge'));
      return;
    }
    setPhotoError('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handlePhotoClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhotoFile(null);
    setPreviewUrl('');
    setPhotoError('');
  };

  const finish = async () => {
    if (photoFile) {
      setUploadingPhoto(true);
      try {
        const avatarData = await uploadAvatar(photoFile);
        updateUser(avatarData.user);
      } finally {
        setUploadingPhoto(false);
      }
    }
    const data = await updateProfile({ completeOnboarding: true });
    updateUser(data.user);

    setWelcoming(true);
    setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, WELCOME_MS);
  };

  const handleContinue = async () => {
    if (!canContinue) {
      notify.warning(t('onboarding.selectRequired'));
      return;
    }

    setSubmitting(true);
    try {
      if (currentStep === 'country') {
        const data = await updateProfile({ country });
        updateUser(data.user);
      } else if (currentStep === 'language') {
        const data = await updateProfile({ language });
        updateUser(data.user);
      } else if (currentStep === 'currency') {
        const data = await updateProfile({ currency });
        updateUser(data.user);
      }

      if (isLastStep) {
        await finish();
        return;
      }

      setStepIndex((prev) => prev + 1);
    } catch (err) {
      notify.error(tServer(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipPhoto = async () => {
    setSubmitting(true);
    try {
      await finish();
    } catch (err) {
      notify.error(tServer(err));
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  };

  const avatarSrc = previewUrl || resolveAvatarUrl(user?.avatarUrl);
  const StepIcon = stepIcons[currentStep];
  const stepLabel = t('onboarding.stepOf', { current: stepIndex + 1, total: activeSteps.length });
  const hasAnyChoice = Boolean(selectedCountry || selectedLanguage || selectedCurrency);

  const titleKey = {
    country: ['onboarding.countryTitle', 'onboarding.countrySubtitle'],
    language: ['onboarding.languageTitle', 'onboarding.languageSubtitle'],
    currency: ['onboarding.currencyTitle', 'onboarding.currencySubtitle'],
    photo: ['onboarding.photoTitle', 'onboarding.photoSubtitle'],
  }[currentStep];

  return (
    <div className="flex min-h-[100dvh] overflow-x-hidden bg-background">
      <aside className="relative hidden w-[42%] max-w-[600px] flex-shrink-0 flex-col overflow-hidden bg-ink px-10 py-10 text-white lg:flex xl:px-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse at 30% 40%, #000 20%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 30% 40%, #000 20%, transparent 75%)',
          }}
        />

        <div className="relative">
          <Logo size="md" dark />
        </div>

        <div className="relative my-auto py-10">
          <h2 className="max-w-sm text-3xl font-semibold leading-tight xl:text-4xl">{t('onboarding.leftTitle')}</h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">{t('onboarding.leftBody')}</p>

          <div className="mt-10">
            <ProfilePreview
              name={user?.name}
              email={user?.email}
              avatarSrc={avatarSrc}
              country={selectedCountry}
              language={selectedLanguage}
              currency={selectedCurrency}
              activeStep={currentStep}
            />
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between px-5 pt-5 sm:px-8 lg:px-12 lg:pt-8">
          <div className="lg:hidden">
            <Logo size="sm" />
          </div>
          <p className="text-xs font-medium text-muted lg:ms-auto">{stepLabel}</p>
        </header>

        <div className="px-5 pt-4 sm:px-8 lg:px-12">
          <div
            className="mx-auto flex w-full max-w-lg gap-1.5"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={activeSteps.length}
            aria-valuenow={stepIndex + 1}
            aria-label={stepLabel}
          >
            {activeSteps.map((step, index) => (
              <span key={step} className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                <motion.span
                  className="block h-full rounded-full bg-ink"
                  initial={false}
                  animate={{ width: index <= stepIndex ? '100%' : '0%' }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </span>
            ))}
          </div>

          {hasAnyChoice && (
            <div className="mx-auto mt-4 flex w-full max-w-lg flex-wrap gap-1.5 lg:hidden">
              {selectedCountry && (
                <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink">{selectedCountry.label}</span>
              )}
              {selectedLanguage && (
                <span dir="auto" className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink">
                  {selectedLanguage.native}
                </span>
              )}
              {selectedCurrency && (
                <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink">{selectedCurrency.value}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-1 items-start px-5 sm:px-8 lg:items-center lg:px-12">
          <div className="mx-auto w-full max-w-lg py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-ink">
                  <StepIcon className="h-5 w-5" />
                </span>
                <h1 className="mt-4 text-2xl font-semibold text-ink sm:text-3xl">{t(titleKey[0])}</h1>
                <p className="mt-1.5 text-sm text-muted sm:text-base">{t(titleKey[1])}</p>

                <div className="mt-7">
                  {currentStep === 'country' && (
                    <div>
                      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">{t('onboarding.popular')}</p>
                      <div className="flex flex-wrap gap-2">
                        {popularCountries.map((item) => (
                          <Chip
                            key={item.value}
                            code={item.value}
                            label={item.label}
                            selected={country === item.value}
                            onClick={() => setCountry(item.value)}
                          />
                        ))}
                      </div>
                      <div className="mt-6">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{t('onboarding.moreCountries')}</p>
                        <Combobox items={countries} value={country} onChange={setCountry} placeholder={t('combobox.searchCountries')} />
                      </div>
                      <p className="mt-4 text-xs text-muted">{t('onboarding.countryNote')}</p>
                    </div>
                  )}

                  {currentStep === 'language' && (
                    <div>
                      <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
                        {languageTiles.map((item) => {
                          const selected = language === item.value;
                          return (
                            <OptionTile key={item.value} selected={selected} onClick={() => setLanguage(item.value)}>
                              <p dir="ltr" style={{ unicodeBidi: 'isolate' }} className="pe-6 text-left text-lg font-semibold leading-snug">
                                {item.native}
                              </p>
                              <p className={`mt-0.5 truncate text-xs ${selected ? 'text-white/60' : 'text-muted'}`}>
                                {item.localized || '\u00a0'}
                              </p>
                            </OptionTile>
                          );
                        })}
                      </div>
                      <p className="mt-4 text-xs text-muted">{t('onboarding.languageNote')}</p>
                    </div>
                  )}

                  {currentStep === 'currency' && (
                    <div>
                      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">{t('onboarding.popular')}</p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {popularCurrencies.map((item) => {
                          const selected = currency === item.value;
                          return (
                            <OptionTile key={item.value} selected={selected} onClick={() => setCurrency(item.value)}>
                              <p dir="ltr" style={{ unicodeBidi: 'isolate' }} className="text-left text-xl font-semibold leading-none">
                                {item.symbol}
                              </p>
                              <p className="mt-2 text-sm font-semibold">{item.value}</p>
                              <p className={`mt-0.5 truncate text-[11px] ${selected ? 'text-white/60' : 'text-muted'}`}>{item.label}</p>
                            </OptionTile>
                          );
                        })}
                      </div>
                      <div className="mt-6">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{t('onboarding.moreCurrencies')}</p>
                        <Combobox items={currencies} value={currency} onChange={setCurrency} placeholder={t('combobox.searchCurrencies')} />
                      </div>
                      <p className="mt-4 text-xs text-muted">{t('onboarding.currencyNote')}</p>
                    </div>
                  )}

                  {currentStep === 'photo' && (
                    <PhotoPicker
                      name={user?.name}
                      displaySrc={avatarSrc}
                      file={photoFile}
                      error={photoError}
                      uploading={uploadingPhoto}
                      onSelect={handlePhotoSelect}
                      onClear={handlePhotoClear}
                      t={t}
                    />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <footer className="sticky bottom-0 z-10 border-t border-border bg-white/90 px-5 backdrop-blur sm:px-8 lg:border-transparent lg:bg-transparent lg:px-12 lg:backdrop-blur-none">
          <div className="mx-auto w-full max-w-lg py-4">
            <div className="flex items-center gap-3">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={submitting}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted hover:text-ink"
                >
                  {t('onboarding.back')}
                </button>
              )}
              <Button onClick={handleContinue} loading={submitting} loadingLabel={t('common.saving')} disabled={!canContinue}>
                {isLastStep ? t('onboarding.finish') : t('onboarding.continue')}
              </Button>
            </div>

            {currentStep === 'photo' && (
              <button
                type="button"
                onClick={handleSkipPhoto}
                disabled={submitting}
                className="mt-3 w-full text-center text-sm text-muted hover:text-ink"
              >
                {submitting ? t('common.saving') : t('onboarding.skip')}
              </button>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}

function OnboardingRoute() {
  const { user } = useAuth();
  return <OnboardingPage key={user?.id} />;
}

export default OnboardingRoute;
