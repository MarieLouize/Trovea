import { create } from 'zustand';
import type { Merchant } from '@/lib/types';
import {
  FIXTURE_MERCHANT,
  FIXTURE_VENDOR_MERCHANT,
  FIXTURE_HOST_MERCHANT,
  FIXTURE_DIGITAL_MERCHANT,
  FIXTURE_STUDIO_MERCHANT,
} from '@/lib/fixtures';
import { getMerchantById } from '../db/queries';
import { updateMerchant as apiUpdateMerchant } from '../api/merchants.api';

export const DEV_MERCHANTS: Merchant[] = [
  FIXTURE_MERCHANT,
  FIXTURE_VENDOR_MERCHANT,
  FIXTURE_HOST_MERCHANT,
  FIXTURE_DIGITAL_MERCHANT,
  FIXTURE_STUDIO_MERCHANT,
];

interface MerchantState {
  merchant: Merchant;
  isLoading: boolean;
  error: string | null;
  setMerchant: (merchant: Merchant) => void;
  updateMerchant: (updates: Partial<Merchant>) => void;
  saveMerchant: () => Promise<boolean>;
  storeName: () => string;
  handle: () => string;
  initFromDB: (merchantId: string) => Promise<void>;
}

export const useMerchantStore = create<MerchantState>((set, get) => ({
  merchant: FIXTURE_MERCHANT,
  isLoading: false,
  error: null,
  setMerchant: (merchant) => set({ merchant }),
  updateMerchant: (updates) =>
    set((state) => ({
      merchant: { ...state.merchant, ...updates },
    })),
  saveMerchant: async () => {
    const { merchant } = get();
    const hasApi = !!import.meta.env.VITE_API_URL;
    if (!hasApi) return true;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, owner_id, handle, store_type, initialized_at, updated_at, ...payload } = merchant;
      const updated = await apiUpdateMerchant(payload);
      set({ merchant: updated });
      return true;
    } catch (err) {
      console.error('Failed to save merchant:', err);
      return false;
    }
  },
  storeName: () => get().merchant.store_name,
  handle: () => get().merchant.handle,
  initFromDB: async (merchantId) => {
    set({ isLoading: true, error: null });
    try {
      const merchant = await getMerchantById(merchantId);
      if (merchant) {
        set({ merchant, isLoading: false });
      } else {
        set({ error: 'Failed to load merchant', isLoading: false });
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },
}));
