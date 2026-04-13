import { create } from 'zustand';
import type { ClaimRequest } from '../types';
import { FIXTURE_CLAIMS } from '../fixtures/claims';
import { supabase } from '../supabase';
import { 
  createClaim as apiCreateClaim, 
  getPendingClaimForProduct,
  getClaimsByMerchant, 
  updateClaimStatus as apiUpdateStatus 
} from '../api/claims.api';

interface ClaimStore {
  claims: ClaimRequest[];
  isLoading: boolean;
  error: string | null;
  _subscription: any;

  addClaim: (claim: any) => Promise<ClaimRequest | null>;
  updateStatus: (id: string, status: string) => Promise<void>;
  bulkUpdateStatus: (ids: string[], status: string) => Promise<void>;
  getPendingClaim: (productId: string) => ClaimRequest | undefined;
  
  initFromDB: (merchantId: string) => Promise<void>;
  subscribeToChanges: () => void;
  unsubscribe: () => void;
}

export const useClaimStore = create<ClaimStore>((set, get) => ({
  claims: FIXTURE_CLAIMS,
  isLoading: false,
  error: null,
  _subscription: null,

  addClaim: async (claimDto) => {
    const hasApi = !!import.meta.env.VITE_API_URL;
    
    if (hasApi) {
      try {
        const newClaim = await apiCreateClaim(claimDto);
        set((state) => ({ claims: [...state.claims, newClaim] }));
        return newClaim;
      } catch (err) {
        console.error('Failed to create claim:', err);
        return null;
      }
    }

    // Fixture fallback
    const mockClaim: ClaimRequest = {
      ...claimDto,
      id: `claim-mock-${Date.now()}`,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
    };
    set((state) => ({ claims: [...state.claims, mockClaim] }));
    return mockClaim;
  },

  updateStatus: async (id, status) => {
    const hasApi = !!import.meta.env.VITE_API_URL;
    
    set((state) => ({
      claims: state.claims.map((c) =>
        c.id === id ? { ...c, status } : c
      ),
    }));

    if (hasApi) {
      try {
        await apiUpdateStatus(id, status);
      } catch (err) {
        console.error('Failed to update claim status:', err);
      }
    }
  },

  bulkUpdateStatus: async (ids, status) => {
    const hasApi = !!import.meta.env.VITE_API_URL;

    set((state) => ({
      claims: state.claims.map((c) =>
        ids.includes(c.id) ? { ...c, status } : c
      ),
    }));

    if (hasApi) {
      await Promise.all(ids.map((id) => apiUpdateStatus(id, status).catch(console.error)));
    }
  },

  getPendingClaim: (productId) => {
    return get().claims.find(
      (c) => c.product_id === productId && c.status === 'pending'
    );
  },

  initFromDB: async (merchantId) => {
    const hasApi = !!import.meta.env.VITE_API_URL;
    if (!hasApi) return;

    set({ isLoading: true, error: null });
    try {
      const claims = await getClaimsByMerchant();
      set({ claims, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  subscribeToChanges: () => {
    if (get()._subscription) return;

    const channel = supabase
      .channel('trovea-claims-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'trovea', table: 'claims' },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          set((state) => {
            if (eventType === 'INSERT') {
              if (state.claims.some(c => c.id === newRecord.id)) return state;
              return { claims: [...state.claims, newRecord as ClaimRequest] };
            }
            if (eventType === 'UPDATE') {
              return {
                claims: state.claims.map((c) => 
                  c.id === newRecord.id ? (newRecord as ClaimRequest) : c
                )
              };
            }
            if (eventType === 'DELETE') {
              return {
                claims: state.claims.filter((c) => c.id !== oldRecord.id)
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
}));
