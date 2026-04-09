import { create } from 'zustand';
import type { Product, ProductStatus, ProductType } from '../types';
import type { ParsedItem } from '../utils/smart-paste';
import { FIXTURE_PRODUCTS } from '../fixtures';
import { getProductsByMerchant, createProduct, updateProduct, deleteProduct } from '../db/queries/products';
import { useMerchantStore } from './merchant.store';
import { useUIStore } from './ui.store';

export interface GhostCard extends ParsedItem {
  tempId: string;
  confirmedName: string;
  confirmedPrice: number;
}

interface ArchiveState {
  products: Product[];
  statusFilter: ProductStatus | 'all' | 'stagnant' | 'in_drop' | 'active_window' | 'sold_out_window' | 'no_preview' | 'zero_downloads';
  collectionFilter: string | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  // Sold out ceremony (Phase 3B)
  lastSoldOutProductId: string | null;
  clearLastSoldOutProduct: () => void;

  // Smart paste
  ghostCards: GhostCard[];
  setGhostCards: (cards: GhostCard[]) => void;
  updateGhostCard: (tempId: string, updates: Partial<GhostCard>) => void;
  removeGhostCard: (tempId: string) => void;
  clearGhostCards: () => void;

  // Filters
  setStatusFilter: (status: ProductStatus | 'all' | 'stagnant' | 'in_drop' | 'active_window' | 'sold_out_window' | 'no_preview' | 'zero_downloads') => void;
  setCollectionFilter: (collectionId: string | null) => void;
  setSearchQuery: (query: string) => void;

  // Mutations (Phase 3C wired)
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => Promise<void>;
  mintProducts: (cards: GhostCard[], productType?: ProductType) => Promise<void>;
  toggleProductStatus: (productId: string) => Promise<void>;
  updateProduct: (productId: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;

  // Initialization
  initFromDB: (merchantId: string) => Promise<void>;

  // Derived
  filteredProducts: () => Product[];
}

let ghostCounter = 0;

export const useArchiveStore = create<ArchiveState>((set, get) => ({
  products: FIXTURE_PRODUCTS,
  statusFilter: 'all',
  collectionFilter: null,
  searchQuery: '',
  isLoading: false,
  error: null,
  lastSoldOutProductId: null,
  clearLastSoldOutProduct: () => set({ lastSoldOutProductId: null }),

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

  addProduct: async (product) => {
    // Optimistic UI
    set((state) => ({ products: [product, ...state.products] }));
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, updated_at, ...dbPayload } = product;
    const result = await createProduct(dbPayload);
    
    if (result) {
      set((state) => ({
        products: state.products.map(p => p.id === product.id ? result : p)
      }));
    } else {
      set((state) => ({
        products: state.products.filter(p => p.id !== product.id)
      }));
      useUIStore.getState().addToast('Failed to add product', 'error');
    }
  },

  mintProducts: async (cards, productType = 'item') => {
    const merchantId = useMerchantStore.getState().merchant.id;
    
    // Create optimistic skeletons for the UI
    const tempProducts: Product[] = cards.map((card, idx) => {
      const hasVariants = card.variantHints.length > 0;
      return {
        id: `temp-${Date.now()}-${idx}`,
        merchant_id: merchantId,
        name: card.confirmedName,
        description: null,
        price: card.confirmedPrice,
        product_type: productType,
        stock_level: hasVariants ? null : card.quantity,
        collection_id: null,
        category: null,
        tags: card.tags,
        status: 'live' as ProductStatus,
        images: [],
        has_variants: hasVariants,
        variant_axis: hasVariants ? 'size' : null,
        variants: hasVariants
          ? card.variantHints.map((label, i) => ({
              id: `temp-v-${Date.now()}-${idx}-${i}`,
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

    // Optimistically update UI
    set((state) => ({
      products: [...tempProducts, ...state.products],
      ghostCards: [],
    }));

    try {
      // Create products in DB in parallel
      const results = await Promise.all(
        tempProducts.map(async (p) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, created_at, updated_at, ...dbPayload } = p;
          return await createProduct(dbPayload);
        })
      );

      // Reconcile temp IDs with DB IDs
      set((state) => {
        const reconciled = state.products.map(p => {
          if (p.id.startsWith('temp-')) {
            // Find the DB result that matches by name/price
            const dbMatch = results.find(r => r && r.name === p.name && r.price === p.price);
            if (dbMatch) return { ...p, id: dbMatch.id };
            return null; // Failed to create
          }
          return p;
        }).filter((p): p is Product => p !== null);

        return { products: reconciled };
      });
      
      useUIStore.getState().addToast(`${results.filter(Boolean).length} products created`, 'success');
      
    } catch (err) {
      console.error('Failed to mint products:', err);
      useUIStore.getState().addToast('Failed to save some products. Please try again.', 'error');
      // In a real app we'd roll back the failed ones specifically, 
      // but for Phase 3C we'll rely on the next refresh to sync
    }
  },

  toggleProductStatus: async (productId) => {
    const { products } = get();
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newStatus = product.status === 'live' ? 'hidden' : 'live';

    // Optimistic update
    set((state) => ({
      products: state.products.map((p) =>
        p.id === productId
          ? { ...p, status: newStatus, updated_at: new Date().toISOString() }
          : p
      ),
    }));

    // DB call
    const success = await updateProduct(productId, { status: newStatus });
    if (!success) {
      // Revert
      set({ products });
      useUIStore.getState().addToast('Failed to update status', 'error');
    }
  },

  updateProduct: async (productId, updates) => {
    const { products } = get();
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const isSellingOut = 
      product.stock_level !== 0 && 
      (updates.stock_level === 0 || updates.status === 'sold_out');

    // Optimistic update
    set((state) => ({
      products: state.products.map((p) =>
        p.id === productId
          ? { ...p, ...updates, updated_at: new Date().toISOString() }
          : p
      ),
      lastSoldOutProductId: isSellingOut ? productId : state.lastSoldOutProductId,
    }));

    // DB call
    const success = await updateProduct(productId, updates);
    if (!success) {
      // Revert
      set({ products });
      useUIStore.getState().addToast('Failed to update product', 'error');
    }
  },

  deleteProduct: async (productId) => {
    const { products } = get();
    
    // Optimistic remove
    set((state) => ({
      products: state.products.filter(p => p.id !== productId)
    }));

    const success = await deleteProduct(productId);
    if (!success) {
      // Revert
      set({ products });
      useUIStore.getState().addToast('Failed to delete product', 'error');
    } else {
      useUIStore.getState().addToast('Product deleted', 'info');
    }
  },

  initFromDB: async (merchantId) => {
    set({ isLoading: true, error: null });
    try {
      const products = await getProductsByMerchant(merchantId);
      // We don't overwrite if empty to allow fixtures during dev
      if (products.length > 0) {
        set({ products, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  filteredProducts: () => {
    const { products, statusFilter, collectionFilter, searchQuery } = get();
    
    return products.filter((p) => {
      // ── Status Filters ──
      if (statusFilter === 'live' && p.status !== 'live') return false;
      if (statusFilter === 'hidden' && p.status !== 'hidden') return false;
      if (statusFilter === 'sold_out' && p.status !== 'sold_out') return false;

      // Special Refinement Filters
      if (statusFilter === 'stagnant') {
        // Updated > 30 days ago (mock logic)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(p.updated_at) < thirtyDaysAgo;
      }
      if (statusFilter === 'no_preview') {
        return !p.images || p.images.length === 0;
      }
      if (statusFilter === 'in_drop') {
        // TODO: Wire to drop_config once implemented (Phase 3D)
        return false; 
      }
      if (statusFilter === 'active_window') {
        // TODO: Wire to vendor_windows once implemented (Phase 3D)
        return p.status === 'live';
      }
      if (statusFilter === 'zero_downloads') {
        // TODO: Wire to download_stats table (Phase 4A)
        return p.product_type === 'digital';
      }

      // ── Collection Filter ──
      if (collectionFilter !== null && p.collection_id !== collectionFilter) return false;

      // ── Search Query ──
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
