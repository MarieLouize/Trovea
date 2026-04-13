export type MerchantRole = 'curator' | 'buyer';

export type StoreType = 'collector' | 'vendor' | 'host' | 'digital_creator' | 'studio';

export interface SocialLinks {
  instagram: string | null;
  twitter: string | null;
  tiktok: string | null;
}

// Five feel-first palettes (replaces old 6-palette set)
export type StorePalette   = 'velvet' | 'slate' | 'bloom' | 'obsidian' | 'chalk';
export type StoreLayout    = 'grid-dense' | 'grid-airy' | 'editorial' | 'masonry' | 'minimal';
export type StoreTypography = 'editorial' | 'modern' | 'mono' | 'warm' | 'bold';
export type CardStyle      = 'clean-square' | 'rounded-float' | 'polaroid' | 'film-strip' | 'minimal-line';
// Kept for backward compat with call sites — no longer surfaced in Architect UI
export type StoreSignature = 'the-bale' | 'the-vault' | 'the-atelier' | 'the-archive' | 'the-gallery';

// ─── New feel-first types ────────────────────────────────────────────────────

export type StoreTheme =
  // Collector
  | 'the-bale' | 'the-vault' | 'the-drop'
  // Vendor
  | 'the-package' | 'the-window' | 'the-counter'
  // Host
  | 'the-studio' | 'the-clinic' | 'the-space'
  // Digital Creator
  | 'the-lab' | 'the-feed' | 'the-archive-d'
  // Studio
  | 'the-portfolio' | 'the-agency' | 'the-practice';

export type StoreShape  = 'edge' | 'form' | 'float' | 'bubble';
export type StoreMotion = 'still' | 'precise' | 'fluid' | 'cinematic';

// Per-palette font colour variants
export type StoreFontColor =
  | 'cream' | 'gold' | 'white'   // dark palettes: velvet, slate, obsidian
  | 'fog' | 'silver'              // slate / obsidian variants
  | 'ink' | 'charcoal'            // light palettes: bloom, chalk
  | 'wine' | 'maroon';            // light palette accent-tinted options

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
  preview_state: 'static' | 'pre_drop' | 'live_drop' | 'all_sold';
  // Vendor
  window_banner_text: string | null;
  preorder_cta_text: string;
  dormant_message: string | null;
  dormant_image_url: string | null;
  // Host
  booking_cta_text: string;
  calendar_format: 'week' | 'month';
  portfolio_density: 'compact' | 'medium' | 'airy';
  price_prominence: 'prominent' | 'subdued';
  // Digital Creator
  catalogue_display: 'grid' | 'list';
  free_badge_style: 'pill' | 'corner' | 'none';
  currency_display: 'ngn' | 'ngn_usd' | 'usd';
  // Studio
  portfolio_layout: 'masonry' | 'grid' | 'editorial';
  enquiry_form_fields: string[];
  package_card_style: 'full' | 'minimal';
  portfolio_order: 'curated' | 'recent';
  client_logos_enabled: boolean;
}

export interface StoreConfig {
  // Feel-first fields (new)
  theme: StoreTheme;
  shape: StoreShape;
  motion: StoreMotion;
  font_color: StoreFontColor;
  // Kept for backward compat — signature is derived from theme, card_style auto-set by theme
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
  has_gone_live: boolean;
  first_seal_issued: boolean;
  whatsapp_template: string | null;
  store_config: StoreConfig;
  verification_tier: 'unverified' | 'verified' | 'trusted';
  is_paused: boolean;
  is_suspended: boolean;
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
  arrival_notes: string | null;
  response_time_hours: number | null;
  cancellation_policy: string | null;
  studio_location: string | null;
  not_taking_clients: boolean;
  // Host schedule config
  working_hours: {
    start: number;       // 24h hour, e.g. 9
    end: number;         // 24h hour, e.g. 18
    days: number[];      // 0=Sun … 6=Sat
  } | null;
  blocked_dates: string[];   // ISO date strings 'YYYY-MM-DD'
  buffer_time_minutes: number;   // gap between appointments (0/15/30/45)
  portfolio_images: string[];
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
  admin_id: string;
  created_at: string;
  note: string | null;
}

// ─── Drop ────────────────────────────────────────────────────────────────────

export interface Drop {
  id: string;
  merchant_id: string;
  label: string;
  scheduled_at: string;
  status: 'draft' | 'scheduled' | 'live' | 'completed';
  product_ids: string[];
  notify_emails: string[];
  created_at: string;
}

// ─── Enquiry ─────────────────────────────────────────────────────────────────

export interface Enquiry {
  id: string;
  merchant_id: string;
  client_name: string;
  client_phone: string | null;
  company: string | null;
  project_type: string;
  budget_range: string;
  timeline: string;
  message: string;
  notes: string | null;
  decline_reason: string | null;
  package_id: string | null;
  status: 'new' | 'in_discussion' | 'active_project' | 'completed' | 'declined';
  response_time_hours: number | null;
  package_value: number | null;
  deposit_paid: number | null;
  created_at: string;
  updated_at: string;
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
  no_show: boolean;          // added in 012_security_and_integrity_fixes
  created_at: string;
  updated_at: string;        // added in 012_security_and_integrity_fixes
}
