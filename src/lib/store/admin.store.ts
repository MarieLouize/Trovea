import { create } from 'zustand';
import type { AdminLogEntry, ReportStatus } from '@/lib/types';
import { FIXTURE_ADMIN_LOG } from '@/lib/fixtures';
import { DEV_MERCHANTS } from './merchant.store';

export type AdminVerificationTier = 'unverified' | 'verified' | 'trusted';

// ── Build initial tier map from fixture merchants ──
const initialTiers: Record<string, AdminVerificationTier> = {};
DEV_MERCHANTS.forEach((m) => {
  initialTiers[m.id] = m.verification_tier;
});

interface AdminState {
  suspendedMerchantIds: string[];
  adminLog: AdminLogEntry[];
  merchantTiers: Record<string, AdminVerificationTier>;
  reportStatuses: Record<string, ReportStatus>;

  suspendMerchant(merchantId: string, storeName: string, note?: string): void;
  unsuspendMerchant(merchantId: string, storeName: string): void;
  setMerchantTier(merchantId: string, tier: AdminVerificationTier, storeName: string): void;
  setReportStatus(reportId: string, status: ReportStatus, storeName: string, note?: string): void;
}

let logIdCounter = FIXTURE_ADMIN_LOG.length + 1;

function nextLogId(): string {
  return `log-admin-${String(logIdCounter++).padStart(3, '0')}`;
}

export const useAdminStore = create<AdminState>((set) => ({
  suspendedMerchantIds: [],
  adminLog: [...FIXTURE_ADMIN_LOG],
  merchantTiers: { ...initialTiers },
  reportStatuses: {},

  suspendMerchant(merchantId, storeName, note) {
    const entry: AdminLogEntry = {
      id: nextLogId(),
      action: 'Store suspended',
      target_merchant_id: merchantId,
      actor: 'admin',
      timestamp: new Date().toISOString(),
      note: note ?? `${storeName} suspended by admin.`,
    };
    set((s) => ({
      suspendedMerchantIds: s.suspendedMerchantIds.includes(merchantId)
        ? s.suspendedMerchantIds
        : [...s.suspendedMerchantIds, merchantId],
      adminLog: [entry, ...s.adminLog],
    }));
  },

  unsuspendMerchant(merchantId, storeName) {
    const entry: AdminLogEntry = {
      id: nextLogId(),
      action: 'Store unsuspended',
      target_merchant_id: merchantId,
      actor: 'admin',
      timestamp: new Date().toISOString(),
      note: `${storeName} unsuspended by admin.`,
    };
    set((s) => ({
      suspendedMerchantIds: s.suspendedMerchantIds.filter((id) => id !== merchantId),
      adminLog: [entry, ...s.adminLog],
    }));
  },

  setMerchantTier(merchantId, tier, storeName) {
    const entry: AdminLogEntry = {
      id: nextLogId(),
      action: `Verification tier set to ${tier}`,
      target_merchant_id: merchantId,
      actor: 'admin',
      timestamp: new Date().toISOString(),
      note: `${storeName} tier changed to ${tier}.`,
    };
    set((s) => ({
      merchantTiers: { ...s.merchantTiers, [merchantId]: tier },
      adminLog: [entry, ...s.adminLog],
    }));
  },

  setReportStatus(reportId, status, storeName, note) {
    const entry: AdminLogEntry = {
      id: nextLogId(),
      action: `Report ${status}`,
      target_merchant_id: null,
      actor: 'admin',
      timestamp: new Date().toISOString(),
      note: note ?? `Report on ${storeName} marked as ${status}.`,
    };
    set((s) => ({
      reportStatuses: { ...s.reportStatuses, [reportId]: status },
      adminLog: [entry, ...s.adminLog],
    }));
  },
}));
