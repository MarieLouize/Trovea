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

// ── Phase 1C ──
import DashboardPage from '@/pages/merchant/DashboardPage';
import ArchivePage from '@/pages/merchant/ArchivePage';
import TerminalPage from '@/pages/merchant/TerminalPage';
import LedgerPage from '@/pages/merchant/LedgerPage';

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

          {/* ── Onboarding ── *
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
            
            {/* Phase 1C — Pending Updates 
            <Route path="/archive"       element={<ArchivePage />} />
            <Route path="/terminal"      element={<TerminalPage />} />
            <Route path="/ledger"        element={<LedgerPage />} />
            
            Phase 1D — Pending Updates 
            <Route path="/insights"      element={<InsightsPage />} />
            <Route path="/dispatch"      element={<DispatchPage />} /> */}
            <Route path="/settings"      element={<SettingsPage />} />
           {/* <Route path="/notifications" element={<NotificationsPage />} /> */}
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