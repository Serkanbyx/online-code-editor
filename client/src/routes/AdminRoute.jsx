import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { FullPageSpinner } from '../components/common/Spinner.jsx';

export function AdminRoute() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageSpinner label="Checking permissions" />;
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}

export default AdminRoute;
