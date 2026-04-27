import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { FullPageSpinner } from '../components/common/Spinner.jsx';

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageSpinner label="Checking session" />;
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}`;
    const search = next && next !== '/' ? `?next=${encodeURIComponent(next)}` : '';
    return <Navigate to={`/login${search}`} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
