import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageLoader from '../common/PageLoader';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  // Check if route is restricted by role
  if (allowedRoles.length > 0 && user) {
    const userRole = user.role;
    const isAuthorized = allowedRoles.includes(userRole) || 
      (userRole === 'super_admin' && allowedRoles.includes('admin'));

    if (!isAuthorized) {
      // Role not authorized, redirect to their respective dashboard
      if (userRole === 'super_admin' || userRole === 'admin') {
        return <Navigate to="/admin/appointments" replace />;
      } else if (userRole === 'mechanic') {
        return <Navigate to="/mechanic/tasks" replace />;
      } else {
        return <Navigate to="/client/vehicles" replace />;
      }
    }
  }

  // Authorized, render child routes (Layouts/Pages)
  return <Outlet />;
}
