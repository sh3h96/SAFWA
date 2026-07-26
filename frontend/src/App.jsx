import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout/DashboardLayout';
import PageLoader from './components/common/PageLoader';

// Lazy loaded page components for optimal code splitting
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));
const InventoryPage = lazy(() => import('./pages/admin/InventoryPage'));
const WorkshopDispatcherPage = lazy(() => import('./pages/admin/WorkshopDispatcherPage'));
const InvoicePaymentPage = lazy(() => import('./pages/admin/InvoicePaymentPage'));
const TechnicianWorkbenchPage = lazy(() => import('./pages/admin/TechnicianWorkbenchPage'));
const DigitalInspectionPage = lazy(() => import('./pages/admin/DigitalInspectionPage'));
const GarageServiceHistoryPage = lazy(() => import('./pages/admin/GarageServiceHistoryPage'));
const BookingWizardPage = lazy(() => import('./pages/admin/BookingWizardPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));

const CustomerDashboardPage = lazy(() => import('./pages/customer/CustomerDashboardPage'));

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const PasswordResetPage = lazy(() => import('./pages/auth/PasswordResetPage'));

function App() {
  return (
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
          <Route path="/reset-password" element={<PasswordResetPage />} />
          <Route path="/auth/reset-password" element={<PasswordResetPage />} />

          {/* Dashboard routes */}
          <Route path="/admin" element={<DashboardLayout />}>
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="workshop" element={<WorkshopDispatcherPage />} />
            <Route path="invoices" element={<InvoicePaymentPage />} />
            <Route path="technician" element={<TechnicianWorkbenchPage />} />
            <Route path="inspection" element={<DigitalInspectionPage />} />
            <Route path="reports" element={<GarageServiceHistoryPage />} />
            <Route path="customer" element={<CustomerDashboardPage />} />
            <Route path="booking" element={<BookingWizardPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
