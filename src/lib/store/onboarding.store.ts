import { create } from 'zustand';
import type { StoreType, Merchant, StoreTypeConfig, StoreConfig } from '@/lib/types';
import { db } from '@/lib/db';
import { useAuthStore } from './auth.store';
import { useMerchantStore } from './merchant.store';

interface OnboardingState {
  // Collected across steps
  role: 'curator' | 'buyer' | null;
  displayName: string;
  whatsapp: string;
  storeType: StoreType | null;
  storeName: string;
  handle: string;
  bio: string;

  // Setters
  setRole: (role: 'curator' | 'buyer') => void;
  setIdentity: (displayName: string, whatsapp: string) => void;
  setStoreType: (type: StoreType) => void;
  setStoreDetails: (storeName: string, handle: string, bio: string) => void;

  // Submit — creates merchant in Supabase
  submitOnboarding: () => Promise<{ success: boolean; error: string | null }>;

  // Reset
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  role: null,
  displayName: '',
  whatsapp: '',
  storeType: null,
  storeName: '',
  handle: '',
  bio: '',

  setRole: (role) => set({ role }),
  setIdentity: (displayName, whatsapp) => set({ displayName, whatsapp }),
  setStoreType: (storeType) => set({ storeType }),
  setStoreDetails: (storeName, handle, bio) => set({ storeName, handle, bio }),

  submitOnboarding: async () => {
    const state = get();
    const userId = useAuthStore.getState().user?.id;

    if (!userId || !state.storeType || !state.storeName || !state.handle) {
      return { success: false, error: 'Missing required fields' };
    }

    // 1. Create/update profile
    const { error: profileError } = await db
      .from('profiles')
      .upsert({
        id: userId,
        display_name: state.displayName,
        whatsapp: state.whatsapp,
        role: state.role ?? 'curator',
      });

    if (profileError) return { success: false, error: profileError.message };

    // 2. Create merchant with sensible defaults
    const defaultStoreTypeConfig = buildDefaultStoreTypeConfig(state.storeType);
    const defaultStoreConfig = buildDefaultStoreConfig(state.storeType, defaultStoreTypeConfig);

    const newMerchant: Omit<Merchant, 'id' | 'created_at' | 'updated_at'> = {
      owner_id: userId,
      display_name: state.displayName,
      store_name: state.storeName,
      handle: state.handle,
      store_type: state.storeType,
      whatsapp: state.whatsapp,
      bio: state.bio,
      avatar_url: null,
      social_links: { instagram: null, twitter: null, tiktok: null },
      initialized_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      store_open: true,
      whatsapp_template: null,
      store_config: defaultStoreConfig,
      verification_tier: 'unverified',
      is_paused: false,
      is_suspended: false,
      pause_message: null,
      pause_return_date: null,
      checkout_enabled: false,
      holds_enabled: state.storeType === 'collector',
      hold_duration_hours: 24,
      bank_account: null,
      arrival_notes: null,
      response_time_hours: 24,
      portfolio_images: [],
    };

    const { data: merchant, error: merchantError } = await db
      .from('merchants')
      .insert(newMerchant)
      .select()
      .single();

    if (merchantError || !merchant) {
      return { success: false, error: merchantError?.message ?? 'Failed to create store' };
    }

    // 3. Hydrate merchant store
    useMerchantStore.getState().setMerchant(merchant as Merchant);

    return { success: true, error: null };
  },

  reset: () => set({
    role: null,
    displayName: '',
    whatsapp: '',
    storeType: null,
    storeName: '',
    handle: '',
    bio: '',
  }),
}));

const buildDefaultStoreTypeConfig = (type: StoreType): StoreTypeConfig => ({
  drop_banner_text: null,
  sold_out_overlay_style: 'dim',
  window_banner_text: null,
  preorder_cta_text: 'Pre-order',
  booking_cta_text: 'Book a Slot',
  calendar_format: 'week',
  portfolio_density: 'medium',
  catalogue_display: 'grid',
  free_badge_style: 'pill',
  portfolio_layout: 'masonry',
  enquiry_form_fields: ['project_type', 'budget_range', 'timeline', 'message'],
  package_card_style: 'full',
  preview_state: 'static',
  dormant_message: null,
  dormant_image_url: null,
  price_prominence: type === 'studio' ? 'subdued' : 'prominent',
  currency_display: 'ngn',
  portfolio_order: 'curated',
  client_logos_enabled: type === 'studio',
});

const buildDefaultStoreConfig = (
  type: StoreType,
  store_type_config: StoreTypeConfig
): StoreConfig => {
  const defaults: Record<StoreType, Partial<StoreConfig>> = {
    collector:       { palette: 'maroon', layout: 'grid-dense', typography: 'editorial', card_style: 'clean-square', signature: 'the-bale' },
    vendor:          { palette: 'parchment', layout: 'minimal', typography: 'warm', card_style: 'minimal-line', signature: 'the-atelier' },
    host:            { palette: 'velvet', layout: 'editorial', typography: 'editorial', card_style: 'polaroid', signature: 'the-vault' },
    digital_creator: { palette: 'onyx', layout: 'grid-airy', typography: 'modern', card_style: 'rounded-float', signature: 'the-gallery' },
    studio:          { palette: 'slate', layout: 'masonry', typography: 'editorial', card_style: 'film-strip', signature: 'the-archive' },
  };

  return {
    ...defaults[type],
    section_order: ['section-header', 'section-grid', 'section-contact'],
    section_states: { 'section-hero': false, 'section-about': false, 'section-slots': false, 'section-featured': false },
    hero_image_url: null,
    featured_item_ids: [],
    about_text: '',
    item_display_order: null,
    store_type_config,
  } as StoreConfig;
};
