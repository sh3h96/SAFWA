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
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    // Role not authorized, redirect to their respective dashboard
    if (user.role === 'admin') {
      return <Navigate to="/admin/appointments" replace />;
    } else if (user.role === 'mechanic') {
      return <Navigate to="/mechanic/tasks" replace />;
    } else {
      return <Navigate to="/client/vehicles" replace />;
    }
  }

  // Authorized, render child routes (Layouts/Pages)
  return <Outlet />;
}
