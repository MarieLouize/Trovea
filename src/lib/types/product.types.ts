export type ProductStatus = 'live' | 'hidden' | 'sold_out';
export type ProductType = 'standard' | 'bundle';

export interface ProductVariant {
  label: string;
  stock: number;
  sku?: string;
}

export interface Product {
  id: string;
  merchant_id: string;
  name: string;
  price: number;
  stock_level: number;
  collection_id: string | null;
  tags: string[];
  status: ProductStatus;
  images: string[];
  type: ProductType;
  variants: ProductVariant[] | null;
  claim_mode: boolean;
  claim_limit: number | null;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  merchant_id: string;
  name: string;
  color_accent: string;
  display_order: number;
}