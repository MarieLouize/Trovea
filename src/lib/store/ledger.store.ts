import { create } from 'zustand';
import type { Receipt, PaymentStatus, PaymentMethod, ShipmentStatus } from '../types';
import { FIXTURE_RECEIPTS } from '../fixtures';

export type LedgerTab = 'all' | 'pending' | 'dispatch' | 'completed' | 'drops' | 'fulfilment' | 'deposits' | 'delivery' | 'pipeline' | 'buyers' | 'clients';

interface LedgerState {
  receipts: Receipt[];
  activeTab: LedgerTab;
  selectedReceiptId: string | null;
  selectedIds: string[];
  isMultiSelectMode: boolean;

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
  
  markAsPaid: (receiptId: string, method: PaymentMethod) => void;
  markManyAsPaid: (ids: string[], method: PaymentMethod) => void;
  markShipped: (receiptId: string) => void;
  markReceived: (receiptId: string) => void;
  markPacked: (id: string) => void;
  
  updateReceiptStatus: (receiptId: string, updates: Partial<Receipt>) => void;

  // Derived
  filteredReceipts: () => Receipt[];
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
  receipts: FIXTURE_RECEIPTS,
  activeTab: 'all',
  selectedReceiptId: null,
  selectedIds: [],
  isMultiSelectMode: false,

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
  setProducts: (receipts) => set({ receipts }),

  markAsPaid: (receiptId, method) => {
    const logEntry = {
      id: `log-${Date.now()}`,
      event: `Payment confirmed — ${formatMethodName(method)}`,
      timestamp: new Date().toISOString(),
      actor: 'merchant' as const,
    };
    set((state) => ({
      receipts: state.receipts.map((r) =>
        r.id === receiptId
          ? {
              ...r,
              payment_status: 'paid' as PaymentStatus,
              payment_method: method,
              updated_at: new Date().toISOString(),
              log: [...r.log, logEntry],
            }
          : r
      ),
    }));
  },

  markManyAsPaid: (ids, method) => {
    const now = new Date().toISOString();
    const logEntry = {
      id: `log-${Date.now()}`,
      event: `Payment confirmed — ${formatMethodName(method)} (bulk)`,
      timestamp: now,
      actor: 'merchant' as const,
    };
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
  },
  
  markPacked: (id: string) =>
    set(state => ({
      receipts: state.receipts.map(r =>
        r.id === id
          ? {
              ...r,
              shipment_status: 'packed',
              log: [...(r.log ?? []), { 
                id: `log-${Date.now()}`,
                event: 'Marked as packed', 
                actor: 'merchant', 
                timestamp: new Date().toISOString() 
              }],
            }
          : r
      ),
    })),

  markShipped: (receiptId) => {
    const logEntry = {
      id: `log-${Date.now()}`,
      event: 'Marked as shipped',
      timestamp: new Date().toISOString(),
      actor: 'merchant' as const,
    };
    set((state) => ({
      receipts: state.receipts.map((r) =>
        r.id === receiptId
          ? {
              ...r,
              shipment_status: 'shipped' as ShipmentStatus,
              updated_at: new Date().toISOString(),
              log: [...r.log, logEntry],
            }
          : r
      ),
    }));
  },

  markReceived: (receiptId) => {
    const logEntry = {
      id: `log-${Date.now()}`,
      event: 'Buyer confirmed receipt',
      timestamp: new Date().toISOString(),
      actor: 'buyer' as const,
    };
    set((state) => ({
      receipts: state.receipts.map((r) =>
        r.id === receiptId
          ? {
              ...r,
              shipment_status: 'received' as ShipmentStatus,
              updated_at: new Date().toISOString(),
              log: [...r.log, logEntry],
            }
          : r
      ),
    }));
  },

  updateReceiptStatus: (receiptId, updates) =>
    set((state) => ({
      receipts: state.receipts.map((r) =>
        r.id === receiptId
          ? { ...r, ...updates, updated_at: new Date().toISOString() }
          : r
      ),
    })),

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
