import { create } from 'zustand';
import type { HoldRequest } from '../types';
import { FIXTURE_HOLDS } from '../fixtures/holds';

interface HoldStore {
  holds: HoldRequest[];
  addHold: (hold: HoldRequest) => void;
  releaseHold: (productId: string) => void;
  expireHold: (productId: string) => void;
  isProductOnHold: (productId: string) => boolean;
  getHoldForProduct: (productId: string) => HoldRequest | undefined;
}

export const useHoldStore = create<HoldStore>((set, get) => ({
  holds: FIXTURE_HOLDS,

  addHold: (hold) => {
    set((state) => ({ holds: [...state.holds, hold] }));
  },

  releaseHold: (productId) => {
    set((state) => ({
      holds: state.holds.map((h) =>
        h.product_id === productId ? { ...h, status: 'released' } : h
      ),
    }));
  },

  expireHold: (productId) => {
    set((state) => ({
      holds: state.holds.map((h) =>
        h.product_id === productId ? { ...h, status: 'expired' } : h
      ),
    }));
  },

  isProductOnHold: (productId) => {
    const hold = get().holds.find(
      (h) => h.product_id === productId && h.status === 'active'
    );
    if (!hold) return false;
    
    // Check if expired
    if (new Date(hold.expires_at).getTime() < Date.now()) {
      // Logic to actually set it to expired could go here if we were polling
      return false;
    }
    
    return true;
  },

  getHoldForProduct: (productId) => {
    return get().holds.find(
      (h) => h.product_id === productId && h.status === 'active'
    );
  },
}));
