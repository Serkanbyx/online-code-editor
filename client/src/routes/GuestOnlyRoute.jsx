import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { FullPageSpinner } from '../components/common/Spinner.jsx';

function getSafeNextPath(search) {
  const next = new URLSearchParams(search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export function GuestOnlyRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageSpinner label="Checking session" />;
  }

  if (isAuthenticated) {
    return <Navigate to={getSafeNextPath(location.search)} replace />;
  }

  return <Outlet />;
}

export default GuestOnlyRoute;
