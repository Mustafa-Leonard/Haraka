import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../services/auth.store';

// ── Layouts ──
import { PublicLayout } from '../layouts/PublicLayout';
import { MerchantLayout } from '../layouts/MerchantLayout';
import { RiderLayout } from '../layouts/RiderLayout';
import { AdminLayout } from '../layouts/AdminLayout';

// ── Public ──
import { LandingPage } from '../routes/public/LandingPage';
import { LoginPage } from '../routes/public/LoginPage';
import { TrackingPage } from '../routes/public/TrackingPage';
import { PricingPage } from '../routes/public/PricingPage';
import { HowItWorksPage } from '../routes/public/HowItWorksPage';
import { CoveragePage } from '../routes/public/CoveragePage';

// ── Merchant ──
import { MerchantDashboardPage } from '../routes/merchant/MerchantDashboardPage';
import { NewDeliveryPage } from '../routes/merchant/NewDeliveryPage';
import { MerchantJobsPage } from '../routes/merchant/MerchantJobsPage';
import { MerchantJobDetailPage } from '../routes/merchant/MerchantJobDetailPage';
import { MerchantAddressesPage } from '../routes/merchant/MerchantAddressesPage';
import { MerchantPaymentsPage } from '../routes/merchant/MerchantPaymentsPage';
import { MerchantSettingsPage } from '../routes/merchant/MerchantSettingsPage';

// ── Rider ──
import { RiderOffersPage } from '../routes/rider/RiderOffersPage';
import { RiderActiveJobPage } from '../routes/rider/RiderActiveJobPage';
import { RiderEarningsPage } from '../routes/rider/RiderEarningsPage';
import { RiderSettingsPage } from '../routes/rider/RiderSettingsPage';

// ── Admin / Dispatcher ──
import { AdminDashboardPage } from '../routes/admin/AdminDashboardPage';
import { AdminFleetMapPage } from '../routes/admin/AdminFleetMapPage';
import { AdminJobsPage } from '../routes/admin/AdminJobsPage';
import { AdminRidersPage } from '../routes/admin/AdminRidersPage';
import { AdminPricingPage } from '../routes/admin/AdminPricingPage';
import { AdminLedgerPage } from '../routes/admin/AdminLedgerPage';
import { AdminDisputesPage } from '../routes/admin/AdminDisputesPage';
import { AdminAuditPage } from '../routes/admin/AdminAuditPage';

// ── Auth Guards ──
interface GuardProps {
  requiredRoles?: string[];
  children: React.ReactNode;
}

const AuthGuard: React.FC<GuardProps> = ({ requiredRoles, children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && user) {
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      // Redirect to the appropriate home for the user's actual role
      if (user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN') || user.roles.includes('DISPATCHER')) {
        return <Navigate to="/admin" replace />;
      }
      if (user.roles.includes('RIDER')) {
        return <Navigate to="/rider/offers" replace />;
      }
      return <Navigate to="/merchant" replace />;
    }
  }

  return <>{children}</>;
};

const LoadingFallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontSize: '1rem',
      color: 'var(--color-muted)',
    }}
  >
    Loading…
  </div>
);

export const AppRouter: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* ── Public Routes ── */}
        <Route element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="coverage" element={<CoveragePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="track/:token" element={<TrackingPage />} />
        </Route>

        {/* ── Merchant Routes ── */}
        <Route
          path="merchant"
          element={
            <AuthGuard requiredRoles={['MERCHANT', 'ADMIN', 'SUPER_ADMIN']}>
              <MerchantLayout />
            </AuthGuard>
          }
        >
          <Route index element={<MerchantDashboardPage />} />
          <Route path="new" element={<NewDeliveryPage />} />
          <Route path="jobs" element={<MerchantJobsPage />} />
          <Route path="jobs/:id" element={<MerchantJobDetailPage />} />
          <Route path="addresses" element={<MerchantAddressesPage />} />
          <Route path="payments" element={<MerchantPaymentsPage />} />
          <Route path="settings" element={<MerchantSettingsPage />} />
        </Route>

        {/* ── Rider Routes ── */}
        <Route
          path="rider"
          element={
            <AuthGuard requiredRoles={['RIDER', 'ADMIN', 'SUPER_ADMIN']}>
              <RiderLayout />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="offers" replace />} />
          <Route path="offers" element={<RiderOffersPage />} />
          <Route path="active" element={<RiderActiveJobPage />} />
          <Route path="earnings" element={<RiderEarningsPage />} />
          <Route path="settings" element={<RiderSettingsPage />} />
        </Route>

        {/* ── Admin / Dispatcher Routes ── */}
        <Route
          path="admin"
          element={
            <AuthGuard requiredRoles={['ADMIN', 'SUPER_ADMIN', 'DISPATCHER']}>
              <AdminLayout />
            </AuthGuard>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="fleet" element={<AdminFleetMapPage />} />
          <Route path="jobs" element={<AdminJobsPage />} />
          <Route path="riders" element={<AdminRidersPage />} />
          <Route path="pricing" element={<AdminPricingPage />} />
          <Route path="ledger" element={<AdminLedgerPage />} />
          <Route path="disputes" element={<AdminDisputesPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
        </Route>

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
