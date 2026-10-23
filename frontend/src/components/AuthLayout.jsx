import { motion } from 'framer-motion';
import AuthVisual from './AuthVisual.jsx';
import Logo from './Logo.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import { useTranslation } from '../i18n/useTranslation.js';

function AuthLayout({ title, subtitle, children }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background lg:h-[100dvh] lg:flex-row lg:overflow-hidden">
      <div className="hidden flex-1 flex-col justify-between overflow-y-auto bg-ink px-12 py-8 text-white lg:flex xl:px-16 xl:py-10">
        <Logo size="lg" dark />

        <AuthVisual />

        <p className="border-t border-white/10 pt-6 text-sm font-semibold text-white/85">
          {t('auth.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-y-auto px-5 py-16 sm:px-8 sm:py-20">
        <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
          <LanguageSwitcher />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm sm:max-w-md"
        >
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}

export default AuthLayout;
