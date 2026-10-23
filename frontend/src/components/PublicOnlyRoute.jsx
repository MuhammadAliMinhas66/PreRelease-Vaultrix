import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import PageLoader from './PageLoader.jsx';

function PublicOnlyRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const { t } = useTranslation();

  if (isBootstrapping) {
    return <PageLoader label={t('common.loading')} />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default PublicOnlyRoute;
