import { create } from 'zustand';
import type { Product, ProductVariant, Receipt } from '../types';

export type TerminalStage = 'composition' | 'attribution' | 'issuance';

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
  setIssuedReceipt: (receipt: Receipt) => void;
}

const STAGE_ORDER: TerminalStage[] = ['composition', 'attribution', 'issuance'];

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
    const price = product.price;

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
    }),

  setIssuedReceipt: (receipt) => set({ issuedReceipt: receipt }),
}));
