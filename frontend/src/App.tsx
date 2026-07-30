import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PageLoader } from '@/components/ui/Avatar';
import { RoleRoute, GuestRoute, SubscriptionGuard } from '@/routes/guards';
import { TenantPortalProtectedRoute, TenantPortalGuestRoute } from '@/routes/tenantPortalGuards';

import { PublicLayout }      from '@/components/layout/PublicLayout';
import { AuthLayout }        from '@/components/layout/AuthLayout';
import { BuilderLayout }     from '@/components/layout/BuilderLayout';
import { SuperAdminLayout }  from '@/components/layout/SuperAdminLayout';
import { TenantPortalLayout } from '@/components/layout/TenantPortalLayout';
import ScrollToTop from './components/ui/ScrollToTop';

// Public
const LandingPage          = lazy(() => import('@/pages/public/LandingPage'));
const ListingsPage         = lazy(() => import('@/pages/public/ListingsPage'));
const BuildingDetailPage   = lazy(() => import('@/pages/public/BuildingDetailPage'));
const RoomDetailPage       = lazy(() => import('@/pages/public/RoomDetailPage'));
const GetStartedPage       = lazy(() => import('@/pages/public/GetStartedPage'));
const SignAgreementPage    = lazy(() => import('@/pages/public/SignAgreementPage'));

// Auth
const LoginPage            = lazy(() => import('@/pages/auth/LoginPage'));
const VerifyEmailPage      = lazy(() => import('@/pages/auth/VerifyEmailPage'));
const ForgotPasswordPage   = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage    = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const SetupPage            = lazy(() => import('@/pages/auth/SetupPage'));

// Builder portal
const DashboardPage        = lazy(() => import('@/pages/builder/DashboardPage'));
const BuildingsPage        = lazy(() => import('@/pages/builder/BuildingsPage'));
const BuildingManagePage   = lazy(() => import('@/pages/builder/BuildingManagePage'));
const TenantsPage          = lazy(() => import('@/pages/builder/TenantsPage'));
const TenantDetailPage     = lazy(() => import('@/pages/builder/TenantDetailPage'));
const AgreementsPage       = lazy(() => import('@/pages/builder/AgreementsPage'));
const AgreementDetailPage  = lazy(() => import('@/pages/builder/AgreementDetailPage'));
const DocumentsPage        = lazy(() => import('@/pages/builder/DocumentsPage'));
const ExpensesPage         = lazy(() => import('@/pages/builder/ExpensesPage'));
const InquiriesPage        = lazy(() => import('@/pages/builder/InquiriesPage'));
const OffersPage           = lazy(() => import('@/pages/builder/OffersPage'));
const BookingsPage         = lazy(() => import('@/pages/builder/BookingsPage'));
const TransactionsPage     = lazy(() => import('@/pages/builder/TransactionsPage'));
const ManagersPage         = lazy(() => import('@/pages/builder/ManagersPage'));
const BillingPage          = lazy(() => import('@/pages/builder/BillingPage'));
const ActivityPage         = lazy(() => import('@/pages/builder/ActivityPage'));
const ProfilePage          = lazy(() => import('@/pages/builder/ProfilePage'));
const SubscriptionExpiredPage = lazy(() => import('@/pages/builder/SubscriptionExpiredPage'));

// Super admin portal
const SuperDashboardPage   = lazy(() => import('@/pages/superadmin/SuperDashboardPage'));
const BuildersPage         = lazy(() => import('@/pages/superadmin/BuildersPage'));
const BuilderDetailPage    = lazy(() => import('@/pages/superadmin/BuilderDetailPage'));
const SAModerationPage     = lazy(() => import('@/pages/superadmin/BuildingsModerationPage'));
const SASubscriptionsPage  = lazy(() => import('@/pages/superadmin/SubscriptionsPage'));
const SAActivityPage       = lazy(() => import('@/pages/superadmin/ActivityLogsPage'));
const SASettingsPage       = lazy(() => import('@/pages/superadmin/SettingsPage'));
const SADemoRequestsPage   = lazy(() => import('@/pages/superadmin/DemoRequestsPage'));
const SAUpgradeRequestsPage = lazy(() => import('@/pages/superadmin/UpgradeRequestsPage'));
const SAPayoutsPage        = lazy(() => import('@/pages/superadmin/PayoutsPage'));

const NotFoundPage         = lazy(() => import('@/pages/NotFoundPage'));

// Tenant Portal
const TenantLoginPage        = lazy(() => import('@/pages/tenant-portal/TenantLoginPage'));
const TenantSetPasswordPage  = lazy(() => import('@/pages/tenant-portal/TenantSetPasswordPage'));
const TenantDashboardPage    = lazy(() => import('@/pages/tenant-portal/TenantDashboardPage'));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/"                              element={<LandingPage />} />
          <Route path="/listings"                      element={<ListingsPage />} />
          <Route path="/listings/:slug"                element={<BuildingDetailPage />} />
          <Route path="/listings/:slug/rooms/:unitId"  element={<RoomDetailPage />} />
          <Route path="/get-started"                   element={<GetStartedPage />} />
        </Route>

        <Route path="/sign/:token" element={<SignAgreementPage />} />

        <Route element={<AuthLayout />}>
          <Route path="/login"           element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/verify-email"    element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
          <Route path="/reset-password"  element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
          <Route path="/setup"           element={<SetupPage />} />
        </Route>

        {/* Subscription expired wall — no sidebar, billing still accessible */}
        <Route
          path="/subscription-expired"
          element={<RoleRoute roles={['admin', 'manager']}><SubscriptionExpiredPage /></RoleRoute>}
        />

        <Route
          path="/dashboard"
          element={
            <RoleRoute roles={['admin', 'manager']}>
              <SubscriptionGuard>
                <BuilderLayout />
              </SubscriptionGuard>
            </RoleRoute>
          }
        >
          <Route index                 element={<DashboardPage />} />
          <Route path="buildings"      element={<BuildingsPage />} />
          <Route path="buildings/:id"  element={<BuildingManagePage />} />
          <Route path="tenants"        element={<TenantsPage />} />
          <Route path="tenants/:id"    element={<TenantDetailPage />} />
          <Route path="agreements"     element={<AgreementsPage />} />
          <Route path="agreements/:id" element={<AgreementDetailPage />} />
          <Route path="documents"      element={<DocumentsPage />} />
          <Route path="expenses"       element={<ExpensesPage />} />
          <Route path="inquiries"      element={<InquiriesPage />} />
          <Route path="offers"         element={<OffersPage />} />
          <Route path="bookings"       element={<BookingsPage />} />
          <Route path="transactions"   element={<TransactionsPage />} />
          <Route path="managers"       element={<ManagersPage />} />
          <Route path="billing"        element={<BillingPage />} />
          <Route path="activity"       element={<ActivityPage />} />
          <Route path="profile"        element={<ProfilePage />} />
        </Route>

        <Route
          path="/super-admin"
          element={<RoleRoute roles={['super_admin']}><SuperAdminLayout /></RoleRoute>}
        >
          <Route index                      element={<SuperDashboardPage />} />
          <Route path="builders"            element={<BuildersPage />} />
          <Route path="builders/:id"        element={<BuilderDetailPage />} />
          <Route path="buildings"           element={<SAModerationPage />} />
          <Route path="subscriptions"       element={<SASubscriptionsPage />} />
          <Route path="upgrade-requests"    element={<SAUpgradeRequestsPage />} />
          <Route path="payouts"             element={<SAPayoutsPage />} />
          <Route path="activity"            element={<SAActivityPage />} />
          <Route path="settings"            element={<SASettingsPage />} />
          <Route path="demo-requests"       element={<SADemoRequestsPage />} />
        </Route>

        <Route path="/tenant-portal/login" element={<AuthLayout />}>
          <Route index element={<TenantPortalGuestRoute><TenantLoginPage /></TenantPortalGuestRoute>} />
        </Route>
        <Route path="/tenant-portal/set-password" element={<AuthLayout />}>
          <Route index element={<TenantSetPasswordPage />} />
        </Route>
        <Route
          path="/tenant-portal"
          element={<TenantPortalProtectedRoute><TenantPortalLayout /></TenantPortalProtectedRoute>}
        >
          <Route index element={<TenantDashboardPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
