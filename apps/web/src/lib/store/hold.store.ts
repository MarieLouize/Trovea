import { create } from 'zustand';
import type { HoldRequest } from '../types';
import { FIXTURE_HOLDS } from '../fixtures/holds';
import { supabase } from '../supabase';
import { 
  createHold as apiCreateHold, 
  getHoldsByMerchant, 
  releaseHold as apiReleaseHold 
} from '../api/holds.api';

interface HoldStore {
  holds: HoldRequest[];
  isLoading: boolean;
  error: string | null;
  _subscription: any;
  
  addHold: (hold: any) => Promise<HoldRequest | null>;
  releaseHold: (id: string) => Promise<void>;
  expireHold: (productId: string) => void;
  isProductOnHold: (productId: string) => boolean;
  getHoldForProduct: (productId: string) => HoldRequest | undefined;
  
  initFromDB: (merchantId: string) => Promise<void>;
  subscribeToChanges: () => void;
  unsubscribe: () => void;
}

export const useHoldStore = create<HoldStore>((set, get) => ({
  holds: FIXTURE_HOLDS,
  isLoading: false,
  error: null,
  _subscription: null,

  // ... (rest of methods) ...

  subscribeToChanges: () => {
    if (get()._subscription) return;

    const channel = supabase
      .channel('trovea-holds-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'trovea', table: 'holds' },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          set((state) => {
            if (eventType === 'INSERT') {
              // Avoid duplicates if we already added it locally
              if (state.holds.some(h => h.id === newRecord.id)) return state;
              return { holds: [...state.holds, newRecord as HoldRequest] };
            }
            if (eventType === 'UPDATE') {
              return {
                holds: state.holds.map((h) => 
                  h.id === newRecord.id ? (newRecord as HoldRequest) : h
                )
              };
            }
            if (eventType === 'DELETE') {
              return {
                holds: state.holds.filter((h) => h.id !== oldRecord.id)
              };
            }
            return state;
          });
        }
      )
      .subscribe();

    set({ _subscription: channel });
  },

  unsubscribe: () => {
    const { _subscription } = get();
    if (_subscription) {
      supabase.removeChannel(_subscription);
      set({ _subscription: null });
    }
  },

  addHold: async (holdDto) => {
    const hasApi = !!import.meta.env.VITE_API_URL;
    
    if (hasApi) {
      try {
        const newHold = await apiCreateHold(holdDto);
        set((state) => ({ holds: [...state.holds, newHold] }));
        return newHold;
      } catch (err) {
        console.error('Failed to create hold:', err);
        return null;
      }
    }

    // Fixture fallback
    const mockHold: HoldRequest = {
      ...holdDto,
      id: `hold-mock-${Date.now()}`,
      status: 'active',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + (holdDto.duration_hours || 24) * 3600000).toISOString(),
    };
    set((state) => ({ holds: [...state.holds, mockHold] }));
    return mockHold;
  },

  releaseHold: async (id) => {
    const hasApi = !!import.meta.env.VITE_API_URL;
    
    // Optimistic
    set((state) => ({
      holds: state.holds.map((h) =>
        h.id === id ? { ...h, status: 'released' } : h
      ),
    }));

    if (hasApi) {
      try {
        await apiReleaseHold(id);
      } catch (err) {
        console.error('Failed to release hold:', err);
        // In real app, revert optimistic update
      }
    }
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
    
    if (new Date(hold.expires_at).getTime() < Date.now()) {
      return false;
    }
    
    return true;
  },

  getHoldForProduct: (productId) => {
    return get().holds.find(
      (h) => h.product_id === productId && h.status === 'active'
    );
  },

  initFromDB: async (merchantId) => {
    const hasApi = !!import.meta.env.VITE_API_URL;
    if (!hasApi) return;

    set({ isLoading: true, error: null });
    try {
      const holds = await getHoldsByMerchant();
      set({ holds, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },
}));
