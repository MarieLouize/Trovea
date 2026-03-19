import type { StoreSignature, StoreLayout, StorePalette, StoreTypography, CardStyle, SectionKey } from './merchant.types';

export interface PaletteDefinition {
  id: StorePalette;
  name: string;
  bg: string;
  surface: string;
  accent: string;
  fg: string;
}

export interface LayoutDefinition {
  id: StoreLayout;
  name: string;
  description: string;
  cssClass: string;
}

export interface TypographyDefinition {
  id: StoreTypography;
  name: string;
  heading: string;
  body: string;
  cssVars: Record<string, string>;
}

export interface CardStyleDefinition {
  id: CardStyle;
  name: string;
  description: string;
  componentName: string;
}

export interface SignatureDefinition {
  id: StoreSignature;
  name: string;
  tagline: string;
  defaultPalette: StorePalette;
  defaultLayout: StoreLayout;
  defaultTypography: StoreTypography;
  defaultCardStyle: CardStyle;
  defaultSectionOrder: SectionKey[];
}

export interface ClaimRequest {
  id: string;
  product_id: string;
  merchant_id: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_note: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
}