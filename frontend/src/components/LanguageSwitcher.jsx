import Combobox from './Combobox.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useLocalizedOptions } from '../i18n/useLocalizedOptions.js';

// Signed-out screens only (login / signup). Signed-in users change their language
// in Settings and it is applied by "Update preferences".
function LanguageSwitcher() {
  const { language, setGuestLanguage } = useAuth();
  const { t } = useTranslation();
  const { languages } = useLocalizedOptions();

  return (
    <Combobox
      ariaLabel={t('dashboard.language')}
      items={languages}
      value={language}
      onChange={setGuestLanguage}
      placeholder={t('combobox.searchLanguages')}
      className="w-52"
      menuClassName="right-0 w-72 max-w-[calc(100vw-2rem)]"
    />
  );
}

export default LanguageSwitcher;
