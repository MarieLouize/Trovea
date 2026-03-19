import { create } from 'zustand';
import type { Product, ProductStatus } from '../types';
import type { ParsedItem } from '../utils/smart-paste';
import { FIXTURE_PRODUCTS } from '../fixtures';

export interface GhostCard extends ParsedItem {
  tempId: string;
  confirmedName: string;
  confirmedPrice: number;
}

interface ArchiveState {
  products: Product[];
  statusFilter: ProductStatus | 'all';
  collectionFilter: string | null;
  searchQuery: string;

  // Smart paste
  ghostCards: GhostCard[];
  setGhostCards: (cards: GhostCard[]) => void;
  updateGhostCard: (tempId: string, updates: Partial<GhostCard>) => void;
  removeGhostCard: (tempId: string) => void;
  clearGhostCards: () => void;

  // Filters
  setStatusFilter: (status: ProductStatus | 'all') => void;
  setCollectionFilter: (collectionId: string | null) => void;
  setSearchQuery: (query: string) => void;

  // Mutations (Phase 1: operates on local state)
  mintProducts: (cards: GhostCard[]) => void;
  toggleProductStatus: (productId: string) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;

  // Derived
  filteredProducts: () => Product[];
}

let ghostCounter = 0;

export const useArchiveStore = create<ArchiveState>((set, get) => ({
  products: FIXTURE_PRODUCTS,
  statusFilter: 'all',
  collectionFilter: null,
  searchQuery: '',

  ghostCards: [],
  setGhostCards: (cards) => set({ ghostCards: cards }),
  updateGhostCard: (tempId, updates) =>
    set((state) => ({
      ghostCards: state.ghostCards.map((c) =>
        c.tempId === tempId ? { ...c, ...updates } : c
      ),
    })),
  removeGhostCard: (tempId) =>
    set((state) => ({
      ghostCards: state.ghostCards.filter((c) => c.tempId !== tempId),
    })),
  clearGhostCards: () => set({ ghostCards: [] }),

  setStatusFilter: (status) => set({ statusFilter: status }),
  setCollectionFilter: (collectionId) => set({ collectionFilter: collectionId }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  mintProducts: (cards) => {
    const newProducts: Product[] = cards.map((card) => ({
      id: `product-new-${++ghostCounter}`,
      merchant_id: 'merchant-001',
      name: card.confirmedName,
      price: card.confirmedPrice,
      stock_level: card.quantity,
      collection_id: null,
      tags: card.tags,
      status: 'live' as ProductStatus,
      images: [],
      type: 'standard' as const,
      variants:
        card.variantHints.length > 0
          ? card.variantHints.map((label) => ({ label, stock: 1 }))
          : null,
      claim_mode: false,
      claim_limit: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    set((state) => ({
      products: [...newProducts, ...state.products],
      ghostCards: [],
    }));
  },

  toggleProductStatus: (productId) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === productId
          ? {
              ...p,
              status: p.status === 'live' ? ('hidden' as ProductStatus) : ('live' as ProductStatus),
              updated_at: new Date().toISOString(),
            }
          : p
      ),
    })),

  updateProduct: (productId, updates) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === productId
          ? { ...p, ...updates, updated_at: new Date().toISOString() }
          : p
      ),
    })),

  filteredProducts: () => {
    const { products, statusFilter, collectionFilter, searchQuery } = get();
    return products.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (collectionFilter !== null && p.collection_id !== collectionFilter) return false;
      if (
        searchQuery &&
        !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      ) {
        return false;
      }
      return true;
    });
  },
}));