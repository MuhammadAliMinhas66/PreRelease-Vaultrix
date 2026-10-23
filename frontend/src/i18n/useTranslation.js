import { useAuth } from '../context/AuthContext.jsx';
import { translate, translateError } from './translate.js';

export function useTranslation() {
  const { language } = useAuth();

  const t = (key, vars) => translate(language, key, vars);
  const tServer = (error) => translateError(language, error);

  return { t, tServer, language };
}
