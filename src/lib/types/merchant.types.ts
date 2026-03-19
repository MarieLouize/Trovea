export type MerchantRole = 'curator' | 'buyer';

export interface SocialLinks {
  instagram: string | null;
  twitter: string | null;
  tiktok: string | null;
}

export type StorePalette = 'maroon' | 'velvet' | 'parchment' | 'slate' | 'onyx';
export type StoreLayout = 'grid-dense' | 'grid-airy' | 'editorial' | 'masonry' | 'minimal';
export type StoreTypography = 'editorial' | 'modern' | 'mono' | 'warm' | 'bold';
export type CardStyle = 'clean-square' | 'rounded-float' | 'polaroid' | 'film-strip' | 'minimal-line';
export type StoreSignature = 'the-bale' | 'the-vault' | 'the-atelier' | 'the-archive' | 'the-gallery';

export interface SectionStates {
  'section-hero': boolean;
  'section-about': boolean;
  'section-slots': boolean;
  'section-featured': boolean;
}

export type SectionKey =
  | 'section-header'
  | 'section-featured'
  | 'section-grid'
  | 'section-contact'
  | 'section-hero'
  | 'section-about'
  | 'section-slots';

export interface StoreConfig {
  signature: StoreSignature;
  layout: StoreLayout;
  palette: StorePalette;
  typography: StoreTypography;
  card_style: CardStyle;
  section_order: SectionKey[];
  section_states: SectionStates;
  hero_image_url: string | null;
  featured_item_ids: string[];
  about_text: string;
  item_display_order: string[] | null;
}

export interface Merchant {
  id: string;
  owner_id: string;
  display_name: string;
  store_name: string;
  handle: string;
  whatsapp: string;
  bio: string;
  avatar_url: string | null;
  social_links: SocialLinks;
  initialized_at: string;
  last_active_at: string;
  store_open: boolean;
  whatsapp_template: string | null;
  store_config: StoreConfig;
}