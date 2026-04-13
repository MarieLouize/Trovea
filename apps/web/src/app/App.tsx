import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LazyMotion, motionFeatures } from '@/lib/motion';
import ToastContainer from '@/components/ui/Toast/Toast';
import ErrorBoundary from '@/components/ui/ErrorBoundary/ErrorBoundary';
import MerchantShell from '@/features/merchant/components/MerchantShell/MerchantShell';
import RequireAuth from '@/features/auth/components/RequireAuth';
import RequireAdmin from '@/features/auth/components/RequireAdmin';
import ScrollToTop from '@/components/ui/ScrollToTop/ScrollToTop';

import { useAuthStore } from '@/lib/store/auth.store';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { useArchiveStore } from '@/lib/store/archive.store';
import { useLedgerStore } from '@/lib/store/ledger.store';
import { useUIStore } from '@/lib/store/ui.store';
import { getMerchantByOwnerId } from '@/lib/db/queries';
import { supabase } from '@/lib/supabase';
import type { Receipt } from '@/lib/types';

// ── Phase 1B ──
import AuthPage from '@/features/auth/pages/AuthPage';
import SelectRolePage from '@/features/merchant/onboarding/SelectRolePage';
import IdentityPage from '@/features/merchant/onboarding/IdentityPage';
import SetupStorePage from '@/features/merchant/onboarding/SetupStorePage';
import FirstItemPage from '@/features/merchant/onboarding/FirstItemPage';

// ── Phase 2B ──
import StoreTypePage from '@/features/merchant/onboarding/StoreTypePage';

// ── Phase 1C ──
import DashboardPage from '@/features/merchant/pages/DashboardPage';
import ArchivePage from '@/features/merchant/pages/ArchivePage';

// ── Phase 1C (cont.) ──
import TerminalPage from '@/features/merchant/pages/TerminalPage';
import LedgerPage from '@/features/merchant/pages/LedgerPage';
import ReceiptsPage from '@/features/merchant/pages/ReceiptsPage';

// ── Phase 2D ──
import CataloguePage from '@/features/merchant/pages/CataloguePage';

// ── Phase 2E ──
import SchedulePage from '@/features/merchant/pages/SchedulePage';
import BookingsPage from '@/features/merchant/pages/BookingsPage';

// ── Phase 1D ──
import InsightsPage from '@/features/merchant/pages/InsightsPage';
import DispatchPage from '@/features/merchant/pages/DispatchPage';
import SettingsPage from '@/features/merchant/pages/SettingsPage';
import NotificationsPage from '@/features/merchant/pages/NotificationsPage';

// ── Phase 1E ──
import ReceiptPage from '@/features/public/pages/ReceiptPage';
import SubmitReceiptPage from '@/features/public/pages/SubmitReceiptPage';
import StorefrontPage from '@/features/public/pages/StorefrontPage';
import ItemDetailPage from '@/features/public/pages/ItemDetailPage';
import CollectionPage from '@/features/public/pages/CollectionPage';
import NotFoundPage from '@/features/public/pages/NotFoundPage/NotFoundPage';

import CustomizePage from '@/features/public/pages/CustomizePage';

// ── Phase 2P — Admin Panel ──
import AdminShell from '@/features/admin/components/AdminShell';
import AdminOverviewPage from '@/features/admin/pages/AdminOverviewPage';
import AdminStoresPage from '@/features/admin/pages/AdminStoresPage';
import AdminReportsPage from '@/features/admin/pages/AdminReportsPage';
import AdminVerificationPage from '@/features/admin/pages/AdminVerificationPage';
import AdminSuspensionsPage from '@/features/admin/pages/AdminSuspensionsPage';
import AdminReceiptsPage from '@/features/admin/pages/AdminReceiptsPage';

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
        // Dev fallback: fixtures are already loaded by default in stores.
        return;
      }

      if (!isAuthenticated || !user) return;

      try {
        const merchant = await getMerchantByOwnerId(user.id);
        if (merchant) {
          useMerchantStore.getState().setMerchant(merchant);
          useArchiveStore.getState().initFromDB(merchant.id);
          useLedgerStore.getState().initFromDB(merchant.id);

          // Phase 3G: Realtime subscription for receipts
          const channel = supabase
            .channel(`merchant-receipts-${merchant.id}`)
            .on('postgres_changes', {
              event: 'INSERT',
              schema: 'trovea',
              table: 'receipts',
              filter: `merchant_id=eq.${merchant.id}`
            }, (payload) => {
              const newReceipt = payload.new as Receipt;
              const { receipts, setReceipts } = useLedgerStore.getState();
              setReceipts([newReceipt, ...receipts]);
              useUIStore.getState().addToast(`New order from ${newReceipt.buyer_name}`, 'success');
            })
            .subscribe();

          return () => {
            supabase.removeChannel(channel);
          };
        }
      } catch (err) {
        useUIStore.getState().addToast('Failed to load store data', 'error');
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
          Trov<span style={{ color: 'var(--color-accent)' }}>é</span>a
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
          <Route path="/admin" element={<RequireAdmin><AdminShell /></RequireAdmin>}>
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
