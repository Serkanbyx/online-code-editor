import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { FullPageSpinner } from '../components/common/Spinner.jsx';

export function GuestOnlyRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <FullPageSpinner label="Checking session" />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default GuestOnlyRoute;
