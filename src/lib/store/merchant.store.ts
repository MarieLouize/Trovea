import { create } from 'zustand';
import type { Merchant } from '@/lib/types';
import {
  FIXTURE_MERCHANT,
  FIXTURE_VENDOR_MERCHANT,
  FIXTURE_HOST_MERCHANT,
  FIXTURE_DIGITAL_MERCHANT,
  FIXTURE_STUDIO_MERCHANT,
} from '@/lib/fixtures';

export const DEV_MERCHANTS: Merchant[] = [
  FIXTURE_MERCHANT,
  FIXTURE_VENDOR_MERCHANT,
  FIXTURE_HOST_MERCHANT,
  FIXTURE_DIGITAL_MERCHANT,
  FIXTURE_STUDIO_MERCHANT,
];

interface MerchantState {
  merchant: Merchant;
  setMerchant: (merchant: Merchant) => void;
  storeName: () => string;
  handle: () => string;
}

export const useMerchantStore = create<MerchantState>((set, get) => ({
  merchant: FIXTURE_MERCHANT,
  setMerchant: (merchant) => set({ merchant }),
  storeName: () => get().merchant.store_name,
  handle: () => get().merchant.handle,
}));
