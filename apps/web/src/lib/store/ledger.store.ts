import { create } from 'zustand';
import type { Receipt, PaymentStatus, PaymentMethod, ShipmentStatus } from '../types';
import { FIXTURE_RECEIPTS } from '../fixtures';
import { getReceiptsByMerchant, updateReceiptStatus } from '../db/queries/receipts';
import { useUIStore } from './ui.store';

export type LedgerTab = 'all' | 'pending' | 'dispatch' | 'completed' | 'drops' | 'fulfilment' | 'deposits' | 'delivery' | 'pipeline' | 'buyers' | 'clients';

interface LedgerState {
  receipts: Receipt[];
  activeTab: LedgerTab;
  selectedReceiptId: string | null;
  selectedIds: string[];
  isMultiSelectMode: boolean;
  isLoading: boolean;
  error: string | null;

  setActiveTab: (tab: LedgerTab) => void;
  selectReceipt: (id: string | null) => void;

  // Multi-select
  enterMultiSelectMode: (initialId: string) => void;
  exitMultiSelectMode: () => void;
  toggleSelectId: (id: string) => void;
  selectAll: () => void;

  // Mutations
  setReceipts: (receipts: Receipt[]) => void;
  setProducts: (receipts: Receipt[]) => void; // alias for integration
  
  markAsPaid: (receiptId: string, method: PaymentMethod) => Promise<void>;
  markManyAsPaid: (ids: string[], method: PaymentMethod) => Promise<void>;
  markShipped: (receiptId: string) => Promise<void>;
  markReceived: (receiptId: string) => Promise<void>;
  markPacked: (id: string) => Promise<void>;
  markFulfilled: (id: string) => Promise<void>;
  
  // Update internal method
  _updateReceiptStatus: (receiptId: string, updates: Partial<Receipt>) => void;

  // Initialization
  initFromDB: (merchantId: string) => Promise<void>;

  // Derived
  filteredReceipts: () => Receipt[];
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
  receipts: FIXTURE_RECEIPTS,
  activeTab: 'all',
  selectedReceiptId: null,
  selectedIds: [],
  isMultiSelectMode: false,
  isLoading: false,
  error: null,

  setActiveTab: (tab) => set({ activeTab: tab, isMultiSelectMode: false, selectedIds: [] }),
  selectReceipt: (id) => set({ selectedReceiptId: id }),

  enterMultiSelectMode: (initialId) =>
    set({ isMultiSelectMode: true, selectedIds: [initialId] }),
  exitMultiSelectMode: () =>
    set({ isMultiSelectMode: false, selectedIds: [] }),
  toggleSelectId: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((s) => s !== id)
        : [...state.selectedIds, id],
    })),
  selectAll: () => {
    const pending = get().receipts.filter((r) => r.payment_status === 'pending_payment');
    set({ selectedIds: pending.map((r) => r.id) });
  },

  setReceipts: (receipts) => set({ receipts }),
  // TODO: Phase 2.D integration bridge; receipts are domain-distinct from products.
  setProducts: (receipts) => set({ receipts }),

  markAsPaid: async (receiptId, method) => {
    const r = get().receipts.find(x => x.id === receiptId);
    if (!r) return;
    
    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      event: `Payment confirmed — ${formatMethodName(method)}`,
      timestamp: new Date().toISOString(),
      actor: 'merchant' as const,
    };
    
    // Optimistic
    get()._updateReceiptStatus(receiptId, {
      payment_status: 'paid',
      payment_method: method,
      log: [...(r.log ?? []), logEntry],
    });

    const success = await updateReceiptStatus(receiptId, {
      payment_status: 'paid',
      log: [...(r.log ?? []), logEntry],
    });
    
    if (!success) {
      useUIStore.getState().addToast('Failed to sync payment status', 'error');
    }
  },

  markManyAsPaid: async (ids, method) => {
    const now = new Date().toISOString();
    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      event: `Payment confirmed — ${formatMethodName(method)} (bulk)`,
      timestamp: now,
      actor: 'merchant' as const,
    };
    
    // Optimistic UI updates
    set((state) => ({
      receipts: state.receipts.map((r) =>
        ids.includes(r.id)
          ? {
              ...r,
              payment_status: 'paid' as PaymentStatus,
              payment_method: method,
              updated_at: now,
              log: [...r.log, logEntry],
            }
          : r
      ),
      isMultiSelectMode: false,
      selectedIds: [],
    }));

    // Promise.all to DB
    const results = await Promise.all(
      ids.map(async id => {
        const r = get().receipts.find(x => x.id === id);
        return updateReceiptStatus(id, {
          payment_status: 'paid',
          log: [...(r?.log ?? []), logEntry]
        });
      })
    );

    if (results.some(success => !success)) {
      useUIStore.getState().addToast('Some receipts failed to sync', 'error');
    }
  },
  
  markPacked: async (id: string) => {
    const r = get().receipts.find(x => x.id === id);
    if (!r) return;

    const logEntry = { 
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      event: 'Marked as packed', 
      actor: 'merchant' as const, 
      timestamp: new Date().toISOString() 
    };

    get()._updateReceiptStatus(id, {
      shipment_status: 'packed',
      log: [...(r.log ?? []), logEntry],
    });

    const success = await updateReceiptStatus(id, {
      shipment_status: 'packed',
      log: [...(r.log ?? []), logEntry],
    });

    if (!success) useUIStore.getState().addToast('Sync failed', 'error');
  },

  markShipped: async (receiptId) => {
    const r = get().receipts.find(x => x.id === receiptId);
    if (!r) return;

    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      event: 'Marked as shipped',
      timestamp: new Date().toISOString(),
      actor: 'merchant' as const,
    };

    get()._updateReceiptStatus(receiptId, {
      shipment_status: 'shipped',
      log: [...(r.log ?? []), logEntry],
    });

    const success = await updateReceiptStatus(receiptId, {
      shipment_status: 'shipped',
      log: [...(r.log ?? []), logEntry],
    });

    if (!success) useUIStore.getState().addToast('Sync failed', 'error');
  },

  markReceived: async (receiptId) => {
    const r = get().receipts.find(x => x.id === receiptId);
    if (!r) return;

    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      event: 'Buyer confirmed receipt',
      timestamp: new Date().toISOString(),
      actor: 'buyer' as const,
    };

    get()._updateReceiptStatus(receiptId, {
      shipment_status: 'received',
      log: [...(r.log ?? []), logEntry],
    });

    const success = await updateReceiptStatus(receiptId, {
      shipment_status: 'received',
      log: [...(r.log ?? []), logEntry],
    });

    if (!success) useUIStore.getState().addToast('Sync failed', 'error');
  },

  markFulfilled: async (id: string) => {
    const r = get().receipts.find(x => x.id === id);
    if (!r) return;

    const logEntry = { 
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      event: 'Marked as fulfilled', 
      actor: 'merchant' as const, 
      timestamp: new Date().toISOString() 
    };

    get()._updateReceiptStatus(id, {
      shipment_status: 'received', // fulfilled sets shipment to received
      log: [...(r.log ?? []), logEntry],
    });

    const success = await updateReceiptStatus(id, {
      shipment_status: 'received',
      log: [...(r.log ?? []), logEntry],
    });

    if (!success) useUIStore.getState().addToast('Sync failed', 'error');
  },

  _updateReceiptStatus: (receiptId, updates) =>
    set((state) => ({
      receipts: state.receipts.map((r) =>
        r.id === receiptId
          ? { ...r, ...updates, updated_at: new Date().toISOString() }
          : r
      ),
    })),

  initFromDB: async (merchantId) => {
    set({ isLoading: true, error: null });
    try {
      const receipts = await getReceiptsByMerchant(merchantId);
      if (receipts.length > 0) {
        set({ receipts, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  filteredReceipts: () => {
    const { receipts, activeTab } = get();
    switch (activeTab) {
      case 'pending':
        return receipts.filter((r) => r.payment_status === 'pending_payment');
      case 'dispatch':
        return receipts.filter(
          (r) =>
            r.payment_status === 'paid' &&
            (r.shipment_status === 'packed' || r.shipment_status === 'shipped')
        );
      case 'completed':
        return receipts.filter(
          (r) => r.payment_status === 'paid' && (r.shipment_status === 'received' || r.receipt_type === 'download' || r.receipt_type === 'project')
        );
      
      // TODO: Phase 3D — Filter by drop ID
      case 'drops':
      // TODO: Phase 3E — Filter by fulfillment type
      case 'fulfilment':
      // TODO: Phase 4A — Filter by deposit payment status
      case 'deposits':
      // TODO: Phase 3E — Filter by delivery status
      case 'delivery':
      // TODO: Phase 4B — Filter by project pipeline stage
      case 'pipeline':
      // TODO: Phase 4C — Group by buyer profile
      case 'buyers':
      // TODO: Phase 4C — Group by client profile
      case 'clients':
      default:
        return receipts.filter((r) => r.payment_status !== 'cancelled');
    }
  },
}));

function formatMethodName(method: PaymentMethod): string {
  const names: Record<PaymentMethod, string> = {
    bank_transfer: 'Bank Transfer',
    cash: 'Cash',
    opay: 'Opay',
    palmpay: 'PalmPay',
    moniepoint: 'Moniepoint',
    ussd: 'USSD',
    other: 'Other'
  };
  return names[method];
}
