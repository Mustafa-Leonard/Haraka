import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../services/auth.store';

// ── Layouts ──
import { PublicLayout } from '../layouts/PublicLayout';
import { MerchantLayout } from '../layouts/MerchantLayout';
import { RiderLayout } from '../layouts/RiderLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import {
  ADMIN_WORKSPACE_ACCESS,
  getStaffHomePath,
  isStaffPortalRole,
  STAFF_PORTAL_ROLES,
} from '@haraka/shared-types';

// ── Route-level code splitting ──
const LandingPage = React.lazy(() =>
  import('../routes/public/LandingPage').then((module) => ({ default: module.LandingPage })),
);
const LoginPage = React.lazy(() =>
  import('../routes/public/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const TrackingPage = React.lazy(() =>
  import('../routes/public/TrackingPage').then((module) => ({ default: module.TrackingPage })),
);
const PricingPage = React.lazy(() =>
  import('../routes/public/PricingPage').then((module) => ({ default: module.PricingPage })),
);
const HowItWorksPage = React.lazy(() =>
  import('../routes/public/HowItWorksPage').then((module) => ({ default: module.HowItWorksPage })),
);
const CoveragePage = React.lazy(() =>
  import('../routes/public/CoveragePage').then((module) => ({ default: module.CoveragePage })),
);
const NotFoundPage = React.lazy(() =>
  import('../routes/public/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);
const MerchantDashboardPage = React.lazy(() =>
  import('../routes/merchant/MerchantDashboardPage').then((module) => ({
    default: module.MerchantDashboardPage,
  })),
);
const NewDeliveryPage = React.lazy(() =>
  import('../routes/merchant/NewDeliveryPage').then((module) => ({
    default: module.NewDeliveryPage,
  })),
);
const MerchantJobsPage = React.lazy(() =>
  import('../routes/merchant/MerchantJobsPage').then((module) => ({
    default: module.MerchantJobsPage,
  })),
);
const MerchantJobDetailPage = React.lazy(() =>
  import('../routes/merchant/MerchantJobDetailPage').then((module) => ({
    default: module.MerchantJobDetailPage,
  })),
);
const MerchantAddressesPage = React.lazy(() =>
  import('../routes/merchant/MerchantAddressesPage').then((module) => ({
    default: module.MerchantAddressesPage,
  })),
);
const MerchantPaymentsPage = React.lazy(() =>
  import('../routes/merchant/MerchantPaymentsPage').then((module) => ({
    default: module.MerchantPaymentsPage,
  })),
);
const MerchantSettingsPage = React.lazy(() =>
  import('../routes/merchant/MerchantSettingsPage').then((module) => ({
    default: module.MerchantSettingsPage,
  })),
);
const RiderOffersPage = React.lazy(() =>
  import('../routes/rider/RiderOffersPage').then((module) => ({ default: module.RiderOffersPage })),
);
const RiderActiveJobPage = React.lazy(() =>
  import('../routes/rider/RiderActiveJobPage').then((module) => ({
    default: module.RiderActiveJobPage,
  })),
);
const RiderEarningsPage = React.lazy(() =>
  import('../routes/rider/RiderEarningsPage').then((module) => ({
    default: module.RiderEarningsPage,
  })),
);
const RiderSettingsPage = React.lazy(() =>
  import('../routes/rider/RiderSettingsPage').then((module) => ({
    default: module.RiderSettingsPage,
  })),
);
const AdminLoginPage = React.lazy(() =>
  import('../routes/admin/AdminLoginPage').then((module) => ({ default: module.AdminLoginPage })),
);
const AdminDashboardPage = React.lazy(() =>
  import('../routes/admin/AdminDashboardPage').then((module) => ({
    default: module.AdminDashboardPage,
  })),
);
const AdminFleetMapPage = React.lazy(() =>
  import('../routes/admin/AdminFleetMapPage').then((module) => ({
    default: module.AdminFleetMapPage,
  })),
);
const AdminJobsPage = React.lazy(() =>
  import('../routes/admin/AdminJobsPage').then((module) => ({ default: module.AdminJobsPage })),
);
const AdminRidersPage = React.lazy(() =>
  import('../routes/admin/AdminRidersPage').then((module) => ({ default: module.AdminRidersPage })),
);
const AdminPricingPage = React.lazy(() =>
  import('../routes/admin/AdminPricingPage').then((module) => ({
    default: module.AdminPricingPage,
  })),
);
const AdminLedgerPage = React.lazy(() =>
  import('../routes/admin/AdminLedgerPage').then((module) => ({ default: module.AdminLedgerPage })),
);
const AdminDisputesPage = React.lazy(() =>
  import('../routes/admin/AdminDisputesPage').then((module) => ({
    default: module.AdminDisputesPage,
  })),
);
const AdminAuditPage = React.lazy(() =>
  import('../routes/admin/AdminAuditPage').then((module) => ({ default: module.AdminAuditPage })),
);

// ── Auth Guards ──
interface GuardProps {
  requiredRoles: string[];
  children: React.ReactNode;
}

const AuthGuard: React.FC<GuardProps> = ({ requiredRoles, children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  const isAdminRoute = requiredRoles.some((role) => isStaffPortalRole(role));

  // Unauthenticated redirect: admin paths go strictly to /admin/login; others to /login
  if (!isAuthenticated || !user) {
    if (isAdminRoute) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strict role verification:
  const hasAuthorizedRole = requiredRoles.some((role) => user.roles.includes(role));

  if (!hasAuthorizedRole) {
    // If an administrative user tries to access a merchant or rider path, send to admin
    if (user.roles.some((role) => isStaffPortalRole(role))) {
      return <Navigate to={getStaffHomePath(user.roles)} replace />;
    }
    // If a rider tries to access merchant portal, send to rider
    if (user.roles.includes('RIDER')) {
      return <Navigate to="/rider/offers" replace />;
    }
    // If a merchant tries to access rider portal, send to merchant
    if (user.roles.includes('MERCHANT')) {
      return <Navigate to="/merchant" replace />;
    }
    // Deny unauthorized access
    return <Navigate to="/login" replace />;
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
        {/* ── Public Routes (accessible to everyone) ── */}
        <Route element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="coverage" element={<CoveragePage />} />
          <Route path="login" element={<LoginPage />} />
          {/* Recipient Tracking: token-protected public view */}
          <Route path="track/:token" element={<TrackingPage />} />
        </Route>

        {/* ── Admin Dedicated Authentication Route ── */}
        <Route path="admin/login" element={<AdminLoginPage />} />

        {/* ── Merchant Portal (strictly for MERCHANT role) ── */}
        <Route
          path="merchant"
          element={
            <AuthGuard requiredRoles={['MERCHANT']}>
              <MerchantLayout />
            </AuthGuard>
          }
        >
          <Route index element={<MerchantDashboardPage />} />
          <Route path="new" element={<NewDeliveryPage />} />
          <Route path="new-delivery" element={<NewDeliveryPage />} />
          <Route path="jobs" element={<MerchantJobsPage />} />
          <Route path="jobs/:id" element={<MerchantJobDetailPage />} />
          <Route path="addresses" element={<MerchantAddressesPage />} />
          <Route path="payments" element={<MerchantPaymentsPage />} />
          <Route path="settings" element={<MerchantSettingsPage />} />
        </Route>

        {/* ── Rider Portal (strictly for RIDER role) ── */}
        <Route
          path="rider"
          element={
            <AuthGuard requiredRoles={['RIDER']}>
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

        {/* ── Admin & Dispatcher Console (strictly for ADMIN, SUPER_ADMIN, DISPATCHER) ── */}
        <Route
          path="admin"
          element={
            <AuthGuard requiredRoles={[...STAFF_PORTAL_ROLES]}>
              <AdminLayout />
            </AuthGuard>
          }
        >
          <Route index element={<StaffHomeRedirect />} />
          <Route
            path="fleet"
            element={
              <AuthGuard requiredRoles={ADMIN_WORKSPACE_ACCESS['/admin/fleet']}>
                <AdminFleetMapPage />
              </AuthGuard>
            }
          />
          <Route
            path="jobs"
            element={
              <AuthGuard requiredRoles={ADMIN_WORKSPACE_ACCESS['/admin/jobs']}>
                <AdminJobsPage />
              </AuthGuard>
            }
          />
          <Route
            path="riders"
            element={
              <AuthGuard requiredRoles={ADMIN_WORKSPACE_ACCESS['/admin/riders']}>
                <AdminRidersPage />
              </AuthGuard>
            }
          />
          <Route
            path="pricing"
            element={
              <AuthGuard requiredRoles={ADMIN_WORKSPACE_ACCESS['/admin/pricing']}>
                <AdminPricingPage />
              </AuthGuard>
            }
          />
          <Route
            path="ledger"
            element={
              <AuthGuard requiredRoles={ADMIN_WORKSPACE_ACCESS['/admin/ledger']}>
                <AdminLedgerPage />
              </AuthGuard>
            }
          />
          <Route
            path="disputes"
            element={
              <AuthGuard requiredRoles={ADMIN_WORKSPACE_ACCESS['/admin/disputes']}>
                <AdminDisputesPage />
              </AuthGuard>
            }
          />
          <Route
            path="audit"
            element={
              <AuthGuard requiredRoles={ADMIN_WORKSPACE_ACCESS['/admin/audit']}>
                <AdminAuditPage />
              </AuthGuard>
            }
          />
        </Route>

        {/* ── Fallback ── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

const StaffHomeRedirect: React.FC = () => {
  const { user } = useAuthStore();
  const homePath = getStaffHomePath(user?.roles ?? []);
  if (homePath === '/admin') return <AdminDashboardPage />;
  return <Navigate to={homePath} replace />;
};
