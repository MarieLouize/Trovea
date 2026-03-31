export type MerchantRole = 'curator' | 'buyer';

export type StoreType = 'collector' | 'vendor' | 'host' | 'digital_creator' | 'studio';

export interface SocialLinks {
  instagram: string | null;
  twitter: string | null;
  tiktok: string | null;
}

export type StorePalette   = 'maroon' | 'velvet' | 'parchment' | 'slate' | 'onyx';
export type StoreLayout    = 'grid-dense' | 'grid-airy' | 'editorial' | 'masonry' | 'minimal';
export type StoreTypography = 'editorial' | 'modern' | 'mono' | 'warm' | 'bold';
export type CardStyle      = 'clean-square' | 'rounded-float' | 'polaroid' | 'film-strip' | 'minimal-line';
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

export interface StoreTypeConfig {
  // Collector
  drop_banner_text: string | null;
  sold_out_overlay_style: 'dim' | 'strikethrough' | 'badge';
  // Vendor
  window_banner_text: string | null;
  preorder_cta_text: string;
  // Host
  booking_cta_text: string;
  calendar_format: 'week' | 'month';
  portfolio_density: 'compact' | 'medium' | 'airy';
  // Digital Creator
  catalogue_display: 'grid' | 'list';
  free_badge_style: 'pill' | 'corner' | 'none';
  // Studio
  portfolio_layout: 'masonry' | 'grid' | 'editorial';
  enquiry_form_fields: string[];
  package_card_style: 'full' | 'minimal';
}

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
  store_type_config: StoreTypeConfig;
}

export interface Merchant {
  id: string;
  owner_id: string;
  display_name: string;
  store_name: string;
  handle: string;
  store_type: StoreType;
  whatsapp: string;
  bio: string;
  avatar_url: string | null;
  social_links: SocialLinks;
  initialized_at: string;
  last_active_at: string;
  store_open: boolean;
  whatsapp_template: string | null;
  store_config: StoreConfig;
  verification_tier: 'unverified' | 'verified' | 'trusted';
  is_paused: boolean;
  pause_message: string | null;
  pause_return_date: string | null;
  checkout_enabled: boolean;
  holds_enabled: boolean;
  hold_duration_hours: 2 | 6 | 12 | 24;
  bank_account: {
    account_number: string;
    bank_name: string;
    account_name: string;
  } | null;
}

// ─── Admin types ────────────────────────────────────────────────────────────

export type ReportCategory =
  | 'counterfeit'
  | 'misleading'
  | 'suspicious_payment'
  | 'unresponsive'
  | 'inappropriate'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';
export type ReportPriority = 'critical' | 'high' | 'medium' | 'low';

export interface StoreReport {
  id: string;
  reported_merchant_id: string;
  reported_store_name: string;
  category: ReportCategory;
  detail: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  created_at: string;
  reviewed_at: string | null;
}

export interface AdminLogEntry {
  id: string;
  action: string;
  target_merchant_id: string | null;
  actor: 'admin';
  timestamp: string;
  note: string | null;
}

// ─── Availability / Booking ─────────────────────────────────────────────────

export interface AvailabilityWindow {
  id: string;
  merchant_id: string;
  label: string;
  opens_at: string;
  closes_at: string;
  status: 'upcoming' | 'open' | 'closed';
  total_orders: number;
  notes: string | null;
}

export interface Booking {
  id: string;
  merchant_id: string;
  service_id: string;
  service_name: string;
  buyer_name: string;
  buyer_phone: string;
  scheduled_at: string;
  duration_minutes: number;
  deposit_paid: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
}
