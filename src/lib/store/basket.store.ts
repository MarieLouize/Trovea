/**
 * Trove'a — Inquiry Basket Store
 * Buyers can queue multiple items and send a single WhatsApp bundle.
 * Phase 1: local Zustand state only.  Phase 2: persisted to Supabase buyer session.
 */

import { create } from 'zustand';

export interface BasketItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  variantLabel?: string;
}

export type FulfillmentType = 'pickup' | 'delivery';

interface BasketStore {
  items: BasketItem[];
  merchantId: string | null;
  isOpen: boolean;
  fulfillmentType: FulfillmentType;
  deliveryAddress: string;

  add: (item: Omit<BasketItem, 'quantity'>, merchantId: string) => void;
  remove: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  setFulfillment: (type: FulfillmentType) => void;
  setAddress: (address: string) => void;
  clear: () => void;
  clearIfDifferentStore: (incomingMerchantId: string) => void;
  toggle: () => void;
  open: () => void;
  close: () => void;
  has: (id: string) => boolean;
  total: () => number;
}

export const useBasketStore = create<BasketStore>((set, get) => ({
  items: [],
  merchantId: null,
  isOpen: false,
  fulfillmentType: 'pickup',
  deliveryAddress: '',

  add: (item, mId) => {
    const { items, merchantId } = get();
    
    // If adding from a different store, clear first
    if (merchantId && merchantId !== mId) {
      set({ items: [{ ...item, quantity: 1 }], merchantId: mId });
      return;
    }

    const existing = items.find((i) => i.id === item.id);

    if (existing) {
      set({
        items: items.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
        merchantId: mId,
      });
    } else {
      set({ items: [...items, { ...item, quantity: 1 }], merchantId: mId });
    }
  },

  remove: (id) => {
    const newItems = get().items.filter((i) => i.id !== id);
    set({ 
      items: newItems,
      merchantId: newItems.length === 0 ? null : get().merchantId 
    });
  },

  updateQuantity: (id, delta) => {
    set((s) => ({
      items: s.items.map((i) => {
        if (i.id !== id) return i;
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }),
    }));
  },

  setFulfillment: (fulfillmentType) => set({ fulfillmentType }),
  setAddress: (deliveryAddress) => set({ deliveryAddress }),

  clear: () => set({ items: [], merchantId: null, fulfillmentType: 'pickup', deliveryAddress: '' }),

  clearIfDifferentStore: (incomingMerchantId) => {
    const { merchantId, items } = get();
    if (items.length > 0 && merchantId !== incomingMerchantId) {
      set({ items: [], merchantId: incomingMerchantId, fulfillmentType: 'pickup', deliveryAddress: '' });
    } else if (!merchantId) {
      set({ merchantId: incomingMerchantId });
    }
  },

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: ()   => set({ isOpen: true }),
  close: ()  => set({ isOpen: false }),

  has: (id) => get().items.some((i) => i.id === id),

  total: () => get().items.reduce((sum, i) => sum + (i.price * i.quantity), 0),
}));

/** Build a single WhatsApp message linking all basket items */
export function buildBasketWhatsApp(
  phone: string,
  items: BasketItem[],
  storeName: string,
  fulfillment: FulfillmentType,
  address?: string
): string {
  const lines = items
    .map((item, i) => {
      const variant = item.variantLabel ? ` [${item.variantLabel}]` : '';
      const price = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
      }).format(item.price * item.quantity);

      const qtyLabel = item.quantity > 1 ? ` (x${item.quantity})` : '';
      return `${i + 1}. ${item.name}${variant}${qtyLabel} — ${price}`;
    })
    .join('\n');

  const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const deliveryFee = fulfillment === 'delivery' ? 1500 : 0; // Flat mock fee
  const total = subtotal + deliveryFee;

  const totalFmt = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(total);

  const message = [
    `*NEW ORDER: ${storeName}*`,
    '---',
    lines,
    '',
    `Subtotal: ₦${subtotal.toLocaleString()}`,
    fulfillment === 'delivery' ? `Delivery Fee: ₦${deliveryFee.toLocaleString()}` : 'Fulfillment: Pickup',
    fulfillment === 'delivery' ? `*Total: ${totalFmt}* (inc. delivery)` : `*Total: ${totalFmt}*`,
    '',
    fulfillment === 'delivery' ? `*Delivery Address:* ${address || 'Not provided'}` : '*Pickup requested*',
    '',
    'Confirming availability. Ready to pay! 🛍️',
  ].join('\n');

  const clean = phone.replace(/\D/g, '');
  const intl = clean.startsWith('0') ? `234${clean.slice(1)}` : clean;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

/** Build a bundled pre-order message for Vendors */
export function buildVendorPreOrderWhatsApp(
  phone: string,
  items: BasketItem[],
  storeName: string,
  fulfillment: FulfillmentType,
  address?: string
): string {
  const lines = items
    .map((item, i) => {
      const variant = item.variantLabel ? ` [${item.variantLabel}]` : '';
      const price = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
      }).format(item.price * item.quantity);

      const qtyLabel = item.quantity > 1 ? ` (x${item.quantity})` : '';
      return `${i + 1}. ${item.name}${variant}${qtyLabel} — ${price}`;
    })
    .join('\n');

  const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const totalFmt = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(subtotal);

  const message = [
    `*PRE-ORDER: ${storeName}*`,
    '---',
    lines,
    '',
    `Order Total: ${totalFmt}`,
    `Pickup: ${fulfillment === 'pickup' ? 'Store Pickup' : 'Delivery'}`,
    fulfillment === 'delivery' ? `Address: ${address || 'Not provided'}` : '',
    '',
    'Confirming my pre-order for the next window.',
  ].filter(Boolean).join('\n');

  const clean = phone.replace(/\D/g, '');
  const intl = clean.startsWith('0') ? `234${clean.slice(1)}` : clean;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}