import { UserRole } from '../types';

export const getDefaultRouteForRole = (role?: UserRole | null) => {
  switch (role) {
    case 'provider':
      return '/provider/dashboard';
    case 'admin':
      return '/admin/dashboard';
    case 'customer':
    default:
      return '/customer/home';
  }
};
