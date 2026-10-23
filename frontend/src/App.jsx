import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import PublicOnlyRoute from './components/PublicOnlyRoute.jsx';
import RequireOnboarding from './components/RequireOnboarding.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';
import DashboardHeader from './components/DashboardHeader.jsx';
import ToastViewport from './components/ToastViewport.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { useTranslation } from './i18n/useTranslation.js';
import { useFormat } from './i18n/useFormat.js';
import { useLocalizedOptions } from './i18n/useLocalizedOptions.js';

function PreferenceChip({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-white px-3.5 py-2.5 text-left">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function DashboardPlaceholder() {
  const { user, language, currency } = useAuth();
  const { t } = useTranslation();
  const { formatMoney } = useFormat();
  const { countries, languages, currencies } = useLocalizedOptions();

  const country = countries.find((item) => item.value === user?.country);
  const languageOption = languages.find((item) => item.value === language);
  const currencyOption = currencies.find((item) => item.value === currency);
  const notSet = t('dashboard.notSet');

  return (
    <div className="min-h-screen bg-surface">
      <DashboardHeader />
      <div className="flex flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <div>
          <p className="text-ink">
            {user ? t('dashboard.welcomeSignedIn', { name: user.name }) : t('dashboard.noUser')}
          </p>
          <p className="mt-1 text-sm text-muted">{t('dashboard.settingsHint')}</p>
        </div>

        {user && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <PreferenceChip
              label={t('dashboard.country')}
              value={country ? `${country.flag} ${country.label}` : notSet}
            />
            <PreferenceChip label={t('dashboard.language')} value={languageOption?.label || notSet} />
            <PreferenceChip
              label={t('dashboard.currency')}
              value={
                currencyOption
                  ? `${currencyOption.label} (${formatMoney(0, { decimals: 2 })})`
                  : notSet
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <>
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />

          <Route element={<RequireOnboarding />}>
            <Route path="/dashboard" element={<DashboardPlaceholder />} />
            <Route path="/settings" element={<SettingsPage />} />

            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <ToastViewport />
    </>
  );
}

export default App;
