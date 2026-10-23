import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { CountryIcon, LanguageIcon, CurrencyIcon } from '../icons/StepIcons.jsx';
import { initialsFromName } from '../../utils/avatar.js';
import { useTranslation } from '../../i18n/useTranslation.js';

function Row({ icon: Icon, label, value, detail, active, done, t }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors duration-300 ${
        active ? 'border-white/30 bg-white/[0.09]' : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
          done ? 'bg-white text-ink' : 'bg-white/10 text-white/60'
        }`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-white/45">{label}</p>
        <div className="relative h-6 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={value || 'empty'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              dir="ltr"
              style={{ unicodeBidi: 'isolate' }}
              className={`truncate text-left text-sm leading-6 ${value ? 'font-semibold text-white' : 'text-white/35'}`}
            >
              {value || t('onboarding.notSet')}
              {value && detail && <span className="ms-2 font-normal text-white/50">{detail}</span>}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <span
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition ${
          done ? 'border-emerald-400 bg-emerald-400 text-ink' : 'border-white/20 text-transparent'
        }`}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    </div>
  );
}

function ProfilePreview({ name, email, avatarSrc, country, language, currency, activeStep }) {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
        <div className="flex items-center gap-4">
          <span className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-lg font-semibold text-white ring-2 ring-white/20">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            ) : (
              initialsFromName(name) || '?'
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white">{name}</p>
            <p className="truncate text-sm text-white/50" dir="ltr">
              {email}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <Row
            icon={CountryIcon}
            label={t('onboarding.rowCountry')}
            value={country?.label}
            detail={country?.value}
            active={activeStep === 'country'}
            done={Boolean(country)}
            t={t}
          />
          <Row
            icon={LanguageIcon}
            label={t('onboarding.rowLanguage')}
            value={language?.native}
            active={activeStep === 'language'}
            done={Boolean(language)}
            t={t}
          />
          <Row
            icon={CurrencyIcon}
            label={t('onboarding.rowCurrency')}
            value={currency ? `${currency.symbol} ${currency.value}` : ''}
            detail={currency?.label}
            active={activeStep === 'currency'}
            done={Boolean(currency)}
            t={t}
          />
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-white/40">{t('onboarding.changeLater')}</p>
    </div>
  );
}

export default ProfilePreview;
