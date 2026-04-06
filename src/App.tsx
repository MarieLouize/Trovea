import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LazyMotion, motionFeatures } from '@/lib/motion';
import ToastContainer from '@/components/primitives/Toast/Toast';
import ErrorBoundary from '@/components/primitives/ErrorBoundary/ErrorBoundary';
import MerchantShell from '@/components/merchant/MerchantShell/MerchantShell';
import RequireAuth from '@/components/auth/RequireAuth';
import ScrollToTop from '@/components/primitives/ScrollToTop/ScrollToTop';

import { useAuthStore } from '@/lib/store/auth.store';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { useArchiveStore } from '@/lib/store/archive.store';
import { useLedgerStore } from '@/lib/store/ledger.store';
import { getMerchantByOwnerId } from '@/lib/db/queries';

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
import ReceiptsPage from '@/pages/merchant/ReceiptsPage';

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
import NotFoundPage from '@/pages/public/NotFoundPage/NotFoundPage';

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
  const { initSession, isAuthenticated, user, isLoading: authLoading } = useAuthStore();

  // ─── Auth Initialization ──────────────────────────────────────────────────
  useEffect(() => {
    initSession();
  }, [initSession]);

  // ─── Post-Auth Data Hydration ─────────────────────────────────────────────
  useEffect(() => {
    const loadMerchantData = async () => {
      // If Supabase not configured, fallback to fixture mode
      const hasEnv = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!hasEnv) {
        // Dev fallback: load merchant-001 fixtures
        const { merchant } = useMerchantStore.getState();
        if (merchant.id === 'merchant-001') {
          useArchiveStore.getState().initFromDB('merchant-001');
          useLedgerStore.getState().initFromDB('merchant-001');
        }
        return;
      }

      if (!isAuthenticated || !user) return;

      try {
        const merchant = await getMerchantByOwnerId(user.id);
        if (merchant) {
          useMerchantStore.getState().setMerchant(merchant);
          useArchiveStore.getState().initFromDB(merchant.id);
          useLedgerStore.getState().initFromDB(merchant.id);
        }
      } catch (err) {
        console.error('Failed to load merchant data:', err);
      }
    };

    if (!authLoading) {
      loadMerchantData();
    }
  }, [isAuthenticated, user, authLoading]);

  // Global loading state while checking auth session:
  if (authLoading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--color-bg)'
      }}>
        <div style={{ 
          fontFamily: 'var(--font-serif)', 
          fontSize: '24px', 
          color: 'var(--color-fg)',
          letterSpacing: '-0.02em'
        }}>
          Trove<span style={{ color: 'var(--color-accent)' }}>'</span>a
        </div>
      </div>
    );
  }

  return (
    <LazyMotion features={motionFeatures} strict>
      <BrowserRouter>
        <ScrollToTop />
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

          {/* ── Protected Merchant Routes ── */}
          <Route element={<RequireAuth><MerchantShell /></RequireAuth>}>
            <Route path="/dashboard" element={<ErrorBoundary pageName="dashboard"><DashboardPage /></ErrorBoundary>} />
            <Route path="/archive"   element={<ErrorBoundary pageName="archive"><ArchivePage /></ErrorBoundary>} />
            <Route path="/terminal"  element={<ErrorBoundary pageName="terminal"><TerminalPage /></ErrorBoundary>} />
            <Route path="/ledger"    element={<ErrorBoundary pageName="ledger"><LedgerPage /></ErrorBoundary>} />
            <Route path="/receipts"  element={<ErrorBoundary pageName="receipts"><ReceiptsPage /></ErrorBoundary>} />

            <Route path="/insights"      element={<ErrorBoundary pageName="insights"><InsightsPage /></ErrorBoundary>} />
            <Route path="/dispatch"      element={<ErrorBoundary pageName="dispatch"><DispatchPage /></ErrorBoundary>} />
            <Route path="/settings"      element={<ErrorBoundary pageName="settings"><SettingsPage /></ErrorBoundary>} />
            <Route path="/notifications" element={<ErrorBoundary pageName="notifications"><NotificationsPage /></ErrorBoundary>} />

            <Route path="/catalogue" element={<ErrorBoundary pageName="catalogue"><CataloguePage /></ErrorBoundary>} />
            <Route path="/schedule"  element={<ErrorBoundary pageName="schedule"><SchedulePage /></ErrorBoundary>} />
            <Route path="/bookings"  element={<ErrorBoundary pageName="bookings"><BookingsPage /></ErrorBoundary>} />
            
            {/* Onboarding steps that require session */}
            <Route path="/onboarding/select-role" element={<ErrorBoundary pageName="onboarding/select-role"><SelectRolePage /></ErrorBoundary>} />
            <Route path="/onboarding/identity"    element={<ErrorBoundary pageName="onboarding/identity"><IdentityPage /></ErrorBoundary>} />
            <Route path="/onboarding/store-type"  element={<ErrorBoundary pageName="onboarding/store-type"><StoreTypePage /></ErrorBoundary>} />
            <Route path="/onboarding/setup-store" element={<ErrorBoundary pageName="onboarding/setup-store"><SetupStorePage /></ErrorBoundary>} />
            <Route path="/onboarding/first-item"  element={<ErrorBoundary pageName="onboarding/first-item"><FirstItemPage /></ErrorBoundary>} />
          </Route>

          {/* ── Public Routes ── */}
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

          <Route
            path="/store/:handle/book"
            element={<ErrorBoundary pageName="booking-flow"><Placeholder name="Booking Flow" /></ErrorBoundary>}
          />

          {/* ── Admin — Phase 2P (nested under AdminShell) ── */}
          <Route path="/admin" element={<RequireAuth><AdminShell /></RequireAuth>}>
            <Route index                    element={<ErrorBoundary pageName="admin/overview"><AdminOverviewPage /></ErrorBoundary>} />
            <Route path="stores"            element={<ErrorBoundary pageName="admin/stores"><AdminStoresPage /></ErrorBoundary>} />
            <Route path="reports"           element={<ErrorBoundary pageName="admin/reports"><AdminReportsPage /></ErrorBoundary>} />
            <Route path="verification"      element={<ErrorBoundary pageName="admin/verification"><AdminVerificationPage /></ErrorBoundary>} />
            <Route path="suspensions"       element={<ErrorBoundary pageName="admin/suspensions"><AdminSuspensionsPage /></ErrorBoundary>} />
            <Route path="receipts"          element={<ErrorBoundary pageName="admin/receipts"><AdminReceiptsPage /></ErrorBoundary>} />
          </Route>

          {/* ── Default & 404 ── */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />

        </Routes>

        {/* Global Toast */}
        <ToastContainer />
      </BrowserRouter>
    </LazyMotion>
  );
}
