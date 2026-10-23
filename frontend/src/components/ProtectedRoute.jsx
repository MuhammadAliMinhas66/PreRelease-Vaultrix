import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import PageLoader from './PageLoader.jsx';

function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  if (isBootstrapping) {
    return <PageLoader label={t('common.loading')} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
