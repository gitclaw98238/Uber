import { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { UserRole } from '../types';
import { getDefaultRouteForRole } from '../utils/navigation';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps extends PropsWithChildren {
  roles?: UserRole[];
}

const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const { user, isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return <LoadingSpinner label="Preparing your workspace…" fullPage />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
