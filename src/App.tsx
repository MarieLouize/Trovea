import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LazyMotion, motionFeatures } from '@/lib/motion';
import ToastContainer from '@/components/primitives/Toast/Toast';
import ErrorBoundary from '@/components/primitives/ErrorBoundary/ErrorBoundary';
import MerchantShell from '@/components/merchant/MerchantShell/MerchantShell';

// ── Phase 1B ──
import AuthPage from '@/pages/auth/AuthPage';
import SelectRolePage from '@/pages/onboarding/SelectRolePage';
import IdentityPage from '@/pages/onboarding/IdentityPage';
import SetupStorePage from '@/pages/onboarding/SetupStorePage';
import FirstItemPage from '@/pages/onboarding/FirstItemPage';

// ── Phase 2B ──
import StoreTypePage from '@/pages/onboarding/StoreTypePage';

// ── Phase 1C ──
import DashboardPage from '@/pages/merchant/DashboardPage';
import ArchivePage from '@/pages/merchant/ArchivePage';

// ── Phase 1C (cont.) ──
import TerminalPage from '@/pages/merchant/TerminalPage';
import LedgerPage from '@/pages/merchant/LedgerPage';

// ── Phase 2D ──
import CataloguePage from '@/pages/merchant/CataloguePage';

// ── Phase 2E ──
import SchedulePage from '@/pages/merchant/SchedulePage';
import BookingsPage from '@/pages/merchant/BookingsPage';

// ── Phase 1D ──
import InsightsPage from '@/pages/merchant/InsightsPage';
import DispatchPage from '@/pages/merchant/DispatchPage';
import SettingsPage from '@/pages/merchant/SettingsPage';
import NotificationsPage from '@/pages/merchant/NotificationsPage';

// ── Phase 1E ──
import ReceiptPage from '@/pages/public/ReceiptPage';
import SubmitReceiptPage from '@/pages/public/SubmitReceiptPage';
import StorefrontPage from '@/pages/public/StorefrontPage';
import ItemDetailPage from '@/pages/public/ItemDetailPage';
import CollectionPage from '@/pages/public/CollectionPage';

import CustomizePage from '@/pages/public/CustomizePage';

// ── Phase 2P — Admin Panel ──
import AdminShell from '@/components/admin/AdminShell';
import AdminOverviewPage from '@/pages/admin/AdminOverviewPage';
import AdminStoresPage from '@/pages/admin/AdminStoresPage';
import AdminReportsPage from '@/pages/admin/AdminReportsPage';
import AdminVerificationPage from '@/pages/admin/AdminVerificationPage';
import AdminSuspensionsPage from '@/pages/admin/AdminSuspensionsPage';
import AdminReceiptsPage from '@/pages/admin/AdminReceiptsPage';

// ── Placeholder for routes not yet built ──
function Placeholder({ name }: { name: string }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', opacity: 0.5 }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
        {name} — coming soon
      </p>
    </div>
  );
}

export default function App() {
  return (
    <LazyMotion features={motionFeatures} strict>
      <BrowserRouter>
        <Routes>

          {/* ── Auth ── */}
          <Route
            path="/auth"
            element={
              <ErrorBoundary pageName="auth">
                <AuthPage />
              </ErrorBoundary>
            }
          />

          {/* ── Onboarding ── */}
          <Route
            path="/onboarding/select-role"
            element={
              <ErrorBoundary pageName="onboarding/select-role">
                <SelectRolePage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/onboarding/identity"
            element={
              <ErrorBoundary pageName="onboarding/identity">
                <IdentityPage />
              </ErrorBoundary>
            }
          />
          {/* Phase 2B — Store type selection step */}
          <Route
            path="/onboarding/store-type"
            element={
              <ErrorBoundary pageName="onboarding/store-type">
                <StoreTypePage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/onboarding/setup-store"
            element={
              <ErrorBoundary pageName="onboarding/setup-store">
                <SetupStorePage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/onboarding/first-item"
            element={
              <ErrorBoundary pageName="onboarding/first-item">
                <FirstItemPage />
              </ErrorBoundary>
            }
          />

          {/* ── Merchant — nested under MerchantShell (uses <Outlet />) ── */}
          <Route element={<MerchantShell />}>
            {/* Phase 1C — Updated */}
            <Route path="/dashboard"     element={<DashboardPage />} />

            {/* Phase 1C + 2D + 2F */}
            <Route path="/archive"       element={<ArchivePage />} />
            <Route path="/terminal"      element={<TerminalPage />} />
            <Route path="/ledger"        element={<LedgerPage />} />

            {/* Phase 2G */}
            <Route path="/insights"      element={<InsightsPage />} />
            {/* <Route path="/dispatch"      element={<DispatchPage />} /> */}
            <Route path="/settings"      element={<SettingsPage />} />
            {/* <Route path="/notifications" element={<NotificationsPage />} /> */}

            {/* Phase 2D — Digital Creator only */}
            <Route path="/catalogue" element={<CataloguePage />} />

            {/* Phase 2E — Vendor + Host */}
            <Route path="/schedule"  element={<SchedulePage />} />
            <Route path="/bookings"  element={<BookingsPage />} />
          </Route>

          {/* ── Public — Phase 1E (Pending Updates) ── */}
          <Route
            path="/receipt/:receipt_id"
            element={
              <ErrorBoundary pageName="receipt">
                <ReceiptPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/submit-receipt/:intent_id"
            element={
              <ErrorBoundary pageName="submit-receipt">
                <SubmitReceiptPage />
              </ErrorBoundary>
            }
          />

          {/* ── Phase 1F: The Architect — must be before /store/:handle ── */}
          <Route
            path="/store/:handle/customize"
            element={
              <ErrorBoundary pageName="customize">
                <CustomizePage />
              </ErrorBoundary>
            }
          />

          <Route
            path="/store/:handle/item/:item_id"
            element={
              <ErrorBoundary pageName="item">
                <ItemDetailPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/store/:handle/c/:collection_slug"
            element={
              <ErrorBoundary pageName="collection">
                <CollectionPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/store/:handle"
            element={
              <ErrorBoundary pageName="storefront">
                <StorefrontPage />
              </ErrorBoundary>
            }
          />

          {/* Phase 2I — Host booking flow (public) */}
          <Route
            path="/store/:handle/book"
            element={<Placeholder name="Booking Flow" />}
          />

          {/* ── Admin — Phase 2P (nested under AdminShell) ── */}
          <Route path="/admin" element={<AdminShell />}>
            <Route index                    element={<AdminOverviewPage />} />
            <Route path="stores"            element={<AdminStoresPage />} />
            <Route path="reports"           element={<AdminReportsPage />} />
            <Route path="verification"      element={<AdminVerificationPage />} />
            <Route path="suspensions"       element={<AdminSuspensionsPage />} />
            <Route path="receipts"          element={<AdminReceiptsPage />} />
          </Route>

          {/* ── Default ── */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />

        </Routes>

        {/* Global Toast */}
        <ToastContainer />
      </BrowserRouter>
    </LazyMotion>
  );
}
