export type ProductStatus = 'live' | 'hidden' | 'sold_out';
export type ProductType = 'item' | 'service' | 'digital' | 'package' | 'menu_item';

export interface ProductVariant {
  id: string;
  label: string;
  price_override: number | null;
  stock_level: number;
  status: ProductStatus;
  display_order: number;
}

export interface Product {
  id: string;
  merchant_id: string;
  name: string;
  description: string | null;
  price: number;
  product_type: ProductType;
  stock_level: number | null;
  status: ProductStatus;
  collection_id: string | null;
  category: string | null;
  tags: string[];
  images: string[];
  has_variants: boolean;
  variant_axis: string | null;
  variants: ProductVariant[] | null;
  claim_mode: boolean;
  claim_limit: number | null;
  // Host / Studio fields
  duration: number | null;
  deposit_amount: number | null;
  deposit_required: boolean;
  // Digital Creator fields
  delivery_url: string | null;
  is_free: boolean;
  early_access_price: number | null;
  early_access_cap: number | null;
  // Studio fields
  price_type: 'fixed' | 'custom' | null;
  scope_description: string | null;
  deliverables: string | null;
  timeline_estimate: string | null;
  deposit_pct: number | null;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  merchant_id: string;
  name: string;
  color_accent: string;
  display_order: number;
  slug: string;
  description: string | null;
}

export interface BagItem {
  productId: string;
  name: string;
  price: number;
  variantLabel: string | null;
  quantity: number;
  images: string[];
}
