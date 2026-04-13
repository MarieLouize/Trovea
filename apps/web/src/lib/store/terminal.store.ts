import { create } from 'zustand';
import type { Product, ProductVariant, Receipt, ReceiptType } from '../types';
import { createReceipt } from '../db/queries';
import { updateMerchant } from '../db/queries/merchants';
import { db } from '../db';
import { useMerchantStore } from './merchant.store';

export type TerminalStage = 
  | 'composition' 
  | 'attribution' 
  | 'review' 
  | 'submitting' 
  | 'ceremony_card' 
  | 'ceremony_code' 
  | 'ceremony_done';

export interface VisorLineItem {
  productId: string | null;
  name: string;
  variantLabel: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  isQuickItem: boolean;
}

interface DiscountState {
  expanded: boolean;
  type: 'flat' | 'percent';
  value: number;
}

interface DepositSplit {
  totalAmount: number;
  depositDue: number;
  balanceDue: number;
}

interface TerminalState {
  stage: TerminalStage;
  visorItems: VisorLineItem[];
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  discount: DiscountState;
  deliveryFee: number;
  deliveryFeeExpanded: boolean;
  issuedReceipt: Receipt | null;
  isPersisting: boolean;

  // New fields from Phase 2.5-F
  saleNote: string;
  orderType: 'preorder' | 'walkin' | null;
  fulfilmentType: 'pickup' | 'delivery' | null;
  depositSplit: DepositSplit | null;

  // Stage navigation
  setStage: (stage: TerminalStage) => void;
  nextStage: () => void;
  prevStage: () => void;

  // Visor
  addItem: (product: Product, variant?: ProductVariant | null) => void;
  removeItem: (index: number) => void;
  addQuickItem: (name: string, price: number) => void;
  clearVisor: () => void;

  // Attribution
  setBuyerName: (name: string) => void;
  setBuyerPhone: (phone: string) => void;
  setBuyerEmail: (email: string) => void;

  // New actions from Phase 2.5-F
  setSaleNote: (note: string) => void;
  setOrderType: (type: 'preorder' | 'walkin' | null) => void;
  setFulfilmentType: (type: 'pickup' | 'delivery' | null) => void;
  setDepositSplit: (split: DepositSplit | null) => void;

  // Discount
  setDiscountExpanded: (expanded: boolean) => void;
  setDiscountType: (type: 'flat' | 'percent') => void;
  setDiscountValue: (value: number) => void;

  // Delivery fee
  setDeliveryFee: (fee: number) => void;
  setDeliveryFeeExpanded: (expanded: boolean) => void;

  // Computed
  subtotal: () => number;
  discountAmount: () => number;
  total: () => number;

  // Reset
  reset: () => void;
  setIssuedReceipt: (receipt: Receipt, storeType: ReceiptType) => void;
  persistReceipt: () => Promise<boolean>;
}

const STAGE_ORDER: TerminalStage[] = [
  'composition', 
  'attribution', 
  'review', 
  'submitting', 
  'ceremony_card', 
  'ceremony_code', 
  'ceremony_done'
];

export const useTerminalStore = create<TerminalState>((set, get) => ({
  stage: 'composition',
  visorItems: [],
  buyerName: '',
  buyerPhone: '',
  buyerEmail: '',
  discount: { expanded: false, type: 'flat', value: 0 },
  deliveryFee: 0,
  deliveryFeeExpanded: false,
  issuedReceipt: null,
  isPersisting: false,

  // New initial state
  saleNote: '',
  orderType: null,
  fulfilmentType: null,
  depositSplit: null,

  setStage: (stage) => set({ stage }),
  nextStage: () => {
    const current = get().stage;
    const idx = STAGE_ORDER.indexOf(current);
    if (idx < STAGE_ORDER.length - 1) {
      set({ stage: STAGE_ORDER[idx + 1] });
    }
  },
  prevStage: () => {
    const current = get().stage;
    const idx = STAGE_ORDER.indexOf(current);
    if (idx > 0) {
      set({ stage: STAGE_ORDER[idx - 1] });
    }
  },

  addItem: (product, variant = null) => {
    const variantLabel = variant?.label ?? null;
    // FIX: use variant price_override if set, otherwise fall back to product.price
    const price = variant?.price_override ?? product.price;

    set((state) => {
      const existingIdx = state.visorItems.findIndex(
        (item) => item.productId === product.id && item.variantLabel === variantLabel
      );

      if (existingIdx >= 0) {
        const updated = [...state.visorItems];
        const existing = updated[existingIdx];
        updated[existingIdx] = {
          ...existing,
          quantity: existing.quantity + 1,
          totalPrice: (existing.quantity + 1) * existing.unitPrice,
        };
        return { visorItems: updated };
      }

      return {
        visorItems: [
          ...state.visorItems,
          {
            productId: product.id,
            name: product.name,
            variantLabel,
            unitPrice: price,
            quantity: 1,
            totalPrice: price,
            isQuickItem: false,
          },
        ],
      };
    });
  },

  removeItem: (index) =>
    set((state) => ({
      visorItems: state.visorItems.filter((_, i) => i !== index),
    })),

  addQuickItem: (name, price) =>
    set((state) => ({
      visorItems: [
        ...state.visorItems,
        {
          productId: null,
          name,
          variantLabel: null,
          unitPrice: price,
          quantity: 1,
          totalPrice: price,
          isQuickItem: true,
        },
      ],
    })),

  clearVisor: () => set({ visorItems: [] }),

  setBuyerName: (name) => set({ buyerName: name }),
  setBuyerPhone: (phone) => set({ buyerPhone: phone }),
  setBuyerEmail: (email) => set({ buyerEmail: email }),

  setSaleNote: (note) => set({ saleNote: note }),
  setOrderType: (type) => set({ orderType: type }),
  setFulfilmentType: (type) => set({ fulfilmentType: type }),
  setDepositSplit: (split) => set({ depositSplit: split }),

  setDiscountExpanded: (expanded) =>
    set((state) => ({ discount: { ...state.discount, expanded } })),
  setDiscountType: (type) =>
    set((state) => ({ discount: { ...state.discount, type } })),
  setDiscountValue: (value) =>
    set((state) => ({ discount: { ...state.discount, value } })),

  setDeliveryFee: (fee) => set({ deliveryFee: fee }),
  setDeliveryFeeExpanded: (expanded) => set({ deliveryFeeExpanded: expanded }),

  subtotal: () => get().visorItems.reduce((sum, item) => sum + item.totalPrice, 0),

  discountAmount: () => {
    const { discount } = get();
    const subtotal = get().subtotal();
    if (discount.value <= 0) return 0;
    if (discount.type === 'flat') return Math.min(discount.value, subtotal);
    return Math.round((subtotal * discount.value) / 100);
  },

  total: () =>
    Math.max(0, get().subtotal() - get().discountAmount() + get().deliveryFee),

  reset: () =>
    set({
      stage: 'composition',
      visorItems: [],
      buyerName: '',
      buyerPhone: '',
      buyerEmail: '',
      discount: { expanded: false, type: 'flat', value: 0 },
      deliveryFee: 0,
      deliveryFeeExpanded: false,
      issuedReceipt: null,
      isPersisting: false,
      saleNote: '',
      orderType: null,
      fulfilmentType: null,
      depositSplit: null,
    }),

  setIssuedReceipt: (receipt, storeType) => {
    const state = get();
    const ds = state.depositSplit;
    const enrichedReceipt: Receipt = {
      ...receipt,
      receipt_type: storeType,
      sale_note: state.saleNote || null,
      order_type: state.orderType || null,
      fulfilment_type: state.fulfilmentType || null,
      delivery_status: state.buyerEmail ? 'pending' : (receipt.delivery_status || null),
      // Studio: store deposit split so ReceiptPage can show balance due
      deposit_amount: ds ? ds.depositDue : (receipt.deposit_amount ?? null),
      balance_due: ds ? ds.balanceDue : (receipt.balance_due ?? null),
      payment_status: ds && ds.balanceDue > 0 ? 'deposit_paid' : receipt.payment_status,
    };
    set({ issuedReceipt: enrichedReceipt });
  },

  persistReceipt: async () => {
    const { issuedReceipt, visorItems } = get();
    if (!issuedReceipt) return false;

    set({ isPersisting: true });
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, created_at: _ca, updated_at: _ua, ...receiptData } = issuedReceipt;
      const saved = await createReceipt(receiptData);
      if (saved) {
        // Atomic stock decrement
        await Promise.allSettled(
          visorItems.map((item) => {
            if (!item.productId) return Promise.resolve();
            return db.rpc('decrement_stock', {
              p_product_id: item.productId,
              p_quantity: item.quantity,
            });
          })
        ).then((results) => {
          results.forEach((r) => {
            if (r.status === 'rejected') console.warn('Failed to decrement stock', r.reason);
          });
        });

        // Update first_seal_issued if needed
        const merchantStore = useMerchantStore.getState();
        const merchant = merchantStore.merchant;
        if (merchant.id && !merchant.first_seal_issued) {
          await updateMerchant(merchant.id, { first_seal_issued: true });
          merchantStore.setMerchant({ ...merchant, first_seal_issued: true });
        }

        set({ issuedReceipt: saved, isPersisting: false });
        return true;
      }
      set({ isPersisting: false });
      return false;
    } catch (err) {
      console.error('Failed to persist receipt:', err);
      set({ isPersisting: false });
      return false;
    }
  },
}));
