import { scorePassword } from '../utils/emailRules.js';
import { useTranslation } from '../i18n/useTranslation.js';

const LEVELS = [
  null,
  { key: 'forgot.strengthWeak', bar: 'bg-red-500', text: 'text-red-600' },
  { key: 'forgot.strengthFair', bar: 'bg-amber-500', text: 'text-amber-600' },
  { key: 'forgot.strengthStrong', bar: 'bg-emerald-500', text: 'text-emerald-700' },
];

function PasswordStrength({ password }) {
  const { t } = useTranslation();
  const score = scorePassword(password);
  const level = LEVELS[score];

  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5" role="presentation">
          {[1, 2, 3].map((segment) => (
            <span
              key={segment}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
                level && segment <= score ? level.bar : 'bg-border'
              }`}
            />
          ))}
        </div>
        <span className={`min-w-[3.5rem] text-end text-xs font-medium ${level ? level.text : 'text-muted'}`}>
          {level ? t(level.key) : ''}
        </span>
      </div>
      <p className="text-xs leading-snug text-muted">{t('forgot.passwordHint')}</p>
    </div>
  );
}

export default PasswordStrength;
