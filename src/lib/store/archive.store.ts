import { create } from 'zustand';
import type { Product, ProductStatus, ProductType } from '../types';
import type { ParsedItem } from '../utils/smart-paste';
import { FIXTURE_PRODUCTS } from '../fixtures';

export interface GhostCard extends ParsedItem {
  tempId: string;
  confirmedName: string;
  confirmedPrice: number;
}

interface ArchiveState {
  products: Product[];
  statusFilter: ProductStatus | 'all' | 'stagnant' | 'in_drop' | 'active_window' | 'sold_out_window';
  collectionFilter: string | null;
  searchQuery: string;

  // Smart paste
  ghostCards: GhostCard[];
  setGhostCards: (cards: GhostCard[]) => void;
  updateGhostCard: (tempId: string, updates: Partial<GhostCard>) => void;
  removeGhostCard: (tempId: string) => void;
  clearGhostCards: () => void;

  // Filters
  setStatusFilter: (status: ProductStatus | 'all' | 'stagnant' | 'in_drop' | 'active_window' | 'sold_out_window') => void;
  setCollectionFilter: (collectionId: string | null) => void;
  setSearchQuery: (query: string) => void;

  // Mutations (Phase 1: operates on local state)
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  mintProducts: (cards: GhostCard[], productType?: ProductType) => void;
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

  setProducts: (products) =>
    set({ products, statusFilter: 'all', collectionFilter: null, searchQuery: '' }),

  addProduct: (product) =>
    set((state) => ({ products: [product, ...state.products] })),

  mintProducts: (cards, productType = 'item') => {
    const newProducts: Product[] = cards.map((card) => {
      const hasVariants = card.variantHints.length > 0;
      return {
        id: `product-new-${++ghostCounter}`,
        merchant_id: 'merchant-001',
        name: card.confirmedName,
        description: null,
        price: card.confirmedPrice,
        product_type: productType,
        stock_level: hasVariants ? null : card.quantity,
        collection_id: null,
        tags: card.tags,
        status: 'live' as ProductStatus,
        images: [],
        has_variants: hasVariants,
        variant_axis: hasVariants ? 'size' : null,
        variants: hasVariants
          ? card.variantHints.map((label, i) => ({
              id: `v-new-${ghostCounter}-${i + 1}`,
              label,
              price_override: null,
              stock_level: 1,
              status: 'live' as ProductStatus,
              display_order: i + 1,
            }))
          : null,
        claim_mode: false,
        claim_limit: null,
        duration: null,
        deposit_amount: null,
        deposit_required: false,
        delivery_url: null,
        is_free: false,
        early_access_price: null,
        early_access_cap: null,
        price_type: null,
        scope_description: null,
        deliverables: null,
        timeline_estimate: null,
        deposit_pct: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

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
    const simpleStatuses: string[] = ['live', 'hidden', 'sold_out'];
    return products.filter((p) => {
      if (simpleStatuses.includes(statusFilter) && p.status !== statusFilter) return false;
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
