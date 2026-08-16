import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import PageLoader from './components/common/PageLoader';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import ClientLayout from './layouts/ClientLayout';
import MechanicLayout from './layouts/MechanicLayout';

// Create a client
const queryClient = new QueryClient();

// Auth Pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const PasswordResetPage = lazy(() => import('./pages/auth/PasswordResetPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));

// Admin Pages
const AppointmentsControlPage = lazy(() => import('./pages/admin/AppointmentsControlPage'));
const InventoryPage = lazy(() => import('./pages/admin/InventoryPage'));
const FinancialsPage = lazy(() => import('./pages/admin/FinancialsPage'));
const UsersManagementPage = lazy(() => import('./pages/admin/UsersManagementPage'));
const ReviewsReportsPage = lazy(() => import('./pages/admin/ReviewsReportsPage'));

// Client Pages
const ClientVehiclesPage = lazy(() => import('./pages/client/ClientVehiclesPage'));
const ClientAppointmentsPage = lazy(() => import('./pages/client/ClientAppointmentsPage'));
const ClientBookingPage = lazy(() => import('./pages/client/ClientBookingPage'));
const ClientBillingPage = lazy(() => import('./pages/client/ClientBillingPage'));
const ClientReviewsPage = lazy(() => import('./pages/client/ClientReviewsPage'));

// Mechanic Pages
const MechanicTasksPage = lazy(() => import('./pages/mechanic/MechanicTasksPage'));

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-center" />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* Default Landing Page -> Login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Auth routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
            <Route path="/reset-password" element={<PasswordResetPage />} />
            <Route path="/auth/reset-password" element={<PasswordResetPage />} />

            {/* Admin & Super Admin Dashboard */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="appointments" element={<AppointmentsControlPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="financials" element={<FinancialsPage />} />
                <Route path="users" element={<UsersManagementPage />} />
                <Route path="reviews" element={<ReviewsReportsPage />} />
                {/* Fallback redirect */}
                <Route path="*" element={<Navigate to="/admin/appointments" replace />} />
              </Route>
            </Route>

            {/* Client Dashboard */}
            <Route element={<ProtectedRoute allowedRoles={['client']} />}>
              <Route path="/client" element={<ClientLayout />}>
                <Route path="vehicles" element={<ClientVehiclesPage />} />
                <Route path="appointments" element={<ClientAppointmentsPage />} />
                <Route path="booking" element={<ClientBookingPage />} />
                <Route path="billing" element={<ClientBillingPage />} />
                <Route path="reviews" element={<ClientReviewsPage />} />
                {/* Fallback redirect */}
                <Route path="*" element={<Navigate to="/client/vehicles" replace />} />
              </Route>
            </Route>

            {/* Mechanic Dashboard */}
            <Route element={<ProtectedRoute allowedRoles={['mechanic']} />}>
              <Route path="/mechanic" element={<MechanicLayout />}>
                <Route path="tasks" element={<MechanicTasksPage />} />
                {/* Fallback redirect */}
                <Route path="*" element={<Navigate to="/mechanic/tasks" replace />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
