import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// This is a UX nicety only (bounces a non-admin straight to the dashboard
// instead of a page that will just 404 once it calls the API) - the real
// enforcement is server-side in backend/src/middleware/requireAdmin.js,
// which checks the signed-in session's email against ADMIN_EMAIL on every
// request and 404s anyone else. Keep this in sync with that default -
// VITE_ADMIN_EMAIL overrides it, same as ADMIN_EMAIL does on the backend.
export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'minhasvirtual@gmail.com').toLowerCase();

function RequireAdmin() {
  const { user } = useAuth();

  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default RequireAdmin;
