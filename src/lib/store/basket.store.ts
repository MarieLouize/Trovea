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
  variantLabel?: string;
}

interface BasketStore {
  items: BasketItem[];
  isOpen: boolean;

  add: (item: BasketItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  toggle: () => void;
  open: () => void;
  close: () => void;
  has: (id: string) => boolean;
}

export const useBasketStore = create<BasketStore>((set, get) => ({
  items: [],
  isOpen: false,

  add: (item) => {
    if (get().has(item.id)) return;
    set((s) => ({ items: [...s.items, item] }));
  },

  remove: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  clear: () => set({ items: [] }),

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: ()   => set({ isOpen: true }),
  close: ()  => set({ isOpen: false }),

  has: (id) => get().items.some((i) => i.id === id),
}));

/** Build a single WhatsApp message linking all basket items */
export function buildBasketWhatsApp(
  phone: string,
  items: BasketItem[],
  storeName: string
): string {
  const lines = items
    .map((item, i) => {
      const variant = item.variantLabel ? ` (${item.variantLabel})` : '';
      const price = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
      }).format(item.price);
      return `${i + 1}. ${item.name}${variant} — ${price}`;
    })
    .join('\n');

  const total = items.reduce((sum, i) => sum + i.price, 0);
  const totalFmt = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(total);

  const message = [
    `Hi ${storeName}! I'm interested in the following pieces:`,
    '',
    lines,
    '',
    `Total: ${totalFmt}`,
    '',
    'Can we sort this out? 🛍️',
  ].join('\n');

  const clean = phone.replace(/\D/g, '');
  const intl = clean.startsWith('0') ? `234${clean.slice(1)}` : clean;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}