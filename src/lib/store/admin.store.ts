import { create } from 'zustand';
import type { AdminLogEntry, ReportStatus, Merchant } from '@/lib/types';
import { FIXTURE_ADMIN_LOG } from '@/lib/fixtures';
import { 
  getAllMerchants, 
  suspendMerchant as apiSuspendMerchant, 
  unsuspendMerchant as apiUnsuspendMerchant,
  setVerificationTier as apiSetVerificationTier,
  getAdminReports,
  getAdminLog
} from '../api/admin.api';
import { useUIStore } from './ui.store';

export type AdminVerificationTier = 'unverified' | 'verified' | 'trusted';

interface AdminState {
  merchants: Merchant[];
  adminLog: AdminLogEntry[];
  reports: any[];
  isLoading: boolean;
  error: string | null;

  suspendMerchant(merchantId: string, note: string): Promise<void>;
  unsuspendMerchant(merchantId: string): Promise<void>;
  setMerchantTier(merchantId: string, tier: AdminVerificationTier): Promise<void>;
  
  initFromDB(): Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  merchants: [],
  adminLog: [...FIXTURE_ADMIN_LOG],
  reports: [],
  isLoading: false,
  error: null,

  suspendMerchant: async (merchantId, note) => {
    const hasApi = !!import.meta.env.VITE_API_URL;
    if (hasApi) {
      try {
        const updated = await apiSuspendMerchant(merchantId, note);
        set((s) => ({
          merchants: s.merchants.map(m => m.id === merchantId ? updated : m)
        }));
        useUIStore.getState().addToast('Merchant suspended', 'info');
        await get().initFromDB(); // Refresh log
      } catch (err) {
        useUIStore.getState().addToast('Failed to suspend merchant', 'error');
      }
    }
  },

  unsuspendMerchant: async (merchantId) => {
    const hasApi = !!import.meta.env.VITE_API_URL;
    if (hasApi) {
      try {
        const updated = await apiUnsuspendMerchant(merchantId);
        set((s) => ({
          merchants: s.merchants.map(m => m.id === merchantId ? updated : m)
        }));
        useUIStore.getState().addToast('Merchant unsuspended', 'success');
        await get().initFromDB(); // Refresh log
      } catch (err) {
        useUIStore.getState().addToast('Failed to unsuspend merchant', 'error');
      }
    }
  },

  setMerchantTier: async (merchantId, tier) => {
    const hasApi = !!import.meta.env.VITE_API_URL;
    if (hasApi) {
      try {
        const updated = await apiSetVerificationTier(merchantId, tier);
        set((s) => ({
          merchants: s.merchants.map(m => m.id === merchantId ? updated : m)
        }));
        useUIStore.getState().addToast(`Tier updated to ${tier}`, 'success');
        await get().initFromDB(); // Refresh log
      } catch (err) {
        useUIStore.getState().addToast('Failed to update tier', 'error');
      }
    }
  },

  initFromDB: async () => {
    const hasApi = !!import.meta.env.VITE_API_URL;
    if (!hasApi) return;

    set({ isLoading: true, error: null });
    try {
      const [merchants, reports, log] = await Promise.all([
        getAllMerchants(),
        getAdminReports(),
        getAdminLog()
      ]);
      set({ merchants, reports, adminLog: log, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },
}));
