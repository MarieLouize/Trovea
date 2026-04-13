import type { StoreTheme, StoreType, CardStyle, StoreLayout, StorePalette, StoreTypography, SectionKey } from '../types/merchant.types';

export interface ThemeDefinition {
  id: StoreTheme;
  name: string;
  tagline: string;
  storeType: StoreType;
  cardStyle: CardStyle;
  defaultLayout: StoreLayout;
  defaultPalette: StorePalette;
  defaultTypography: StoreTypography;
  defaultSectionOrder: SectionKey[];
  descriptor: string; // 2-word aesthetic label
}

export const STORE_THEMES: ThemeDefinition[] = [
  // ─── Collector ────────────────────────────────────────────────────────────
  {
    id: 'the-bale',
    name: 'The Bale',
    tagline: 'Vintage market curation',
    storeType: 'collector',
    cardStyle: 'polaroid',
    defaultLayout: 'masonry',
    defaultPalette: 'chalk',
    defaultTypography: 'editorial',
    defaultSectionOrder: ['section-header', 'section-hero', 'section-featured', 'section-grid', 'section-about', 'section-contact'],
    descriptor: 'Vintage market',
  },
  {
    id: 'the-vault',
    name: 'The Vault',
    tagline: 'Luxury archive, curated pieces',
    storeType: 'collector',
    cardStyle: 'clean-square',
    defaultLayout: 'editorial',
    defaultPalette: 'velvet',
    defaultTypography: 'editorial',
    defaultSectionOrder: ['section-header', 'section-hero', 'section-featured', 'section-grid', 'section-about', 'section-contact'],
    descriptor: 'Luxury archive',
  },
  {
    id: 'the-drop',
    name: 'The Drop',
    tagline: 'Release-day energy, limited pieces',
    storeType: 'collector',
    cardStyle: 'film-strip',
    defaultLayout: 'grid-dense',
    defaultPalette: 'obsidian',
    defaultTypography: 'mono',
    defaultSectionOrder: ['section-header', 'section-featured', 'section-grid', 'section-contact'],
    descriptor: 'Streetwear release',
  },

  // ─── Vendor ───────────────────────────────────────────────────────────────
  {
    id: 'the-package',
    name: 'The Package',
    tagline: 'Bold food packaging energy',
    storeType: 'vendor',
    cardStyle: 'rounded-float',
    defaultLayout: 'grid-dense',
    defaultPalette: 'chalk',
    defaultTypography: 'bold',
    defaultSectionOrder: ['section-header', 'section-featured', 'section-grid', 'section-contact'],
    descriptor: 'Food packaging',
  },
  {
    id: 'the-window',
    name: 'The Window',
    tagline: 'Night market stall, after dark',
    storeType: 'vendor',
    cardStyle: 'film-strip',
    defaultLayout: 'minimal',
    defaultPalette: 'obsidian',
    defaultTypography: 'mono',
    defaultSectionOrder: ['section-header', 'section-grid', 'section-about', 'section-contact'],
    descriptor: 'Night market',
  },
  {
    id: 'the-counter',
    name: 'The Counter',
    tagline: 'Clean menu board, no frills',
    storeType: 'vendor',
    cardStyle: 'minimal-line',
    defaultLayout: 'minimal',
    defaultPalette: 'slate',
    defaultTypography: 'modern',
    defaultSectionOrder: ['section-header', 'section-grid', 'section-contact'],
    descriptor: 'Clean menu',
  },

  // ─── Host ─────────────────────────────────────────────────────────────────
  {
    id: 'the-studio',
    name: 'The Studio',
    tagline: 'Warm beauty studio feel',
    storeType: 'host',
    cardStyle: 'polaroid',
    defaultLayout: 'editorial',
    defaultPalette: 'bloom',
    defaultTypography: 'warm',
    defaultSectionOrder: ['section-header', 'section-hero', 'section-featured', 'section-grid', 'section-about', 'section-contact'],
    descriptor: 'Beauty studio',
  },
  {
    id: 'the-clinic',
    name: 'The Clinic',
    tagline: 'Clinical precision, trusted results',
    storeType: 'host',
    cardStyle: 'minimal-line',
    defaultLayout: 'minimal',
    defaultPalette: 'chalk',
    defaultTypography: 'modern',
    defaultSectionOrder: ['section-header', 'section-grid', 'section-slots', 'section-about', 'section-contact'],
    descriptor: 'Clinical precision',
  },
  {
    id: 'the-space',
    name: 'The Space',
    tagline: 'Industrial venue, bold atmosphere',
    storeType: 'host',
    cardStyle: 'clean-square',
    defaultLayout: 'grid-airy',
    defaultPalette: 'obsidian',
    defaultTypography: 'mono',
    defaultSectionOrder: ['section-header', 'section-hero', 'section-grid', 'section-slots', 'section-contact'],
    descriptor: 'Industrial venue',
  },

  // ─── Digital Creator ──────────────────────────────────────────────────────
  {
    id: 'the-lab',
    name: 'The Lab',
    tagline: 'Dark tech craft, tools that ship',
    storeType: 'digital_creator',
    cardStyle: 'film-strip',
    defaultLayout: 'grid-dense',
    defaultPalette: 'obsidian',
    defaultTypography: 'mono',
    defaultSectionOrder: ['section-header', 'section-featured', 'section-grid', 'section-about', 'section-contact'],
    descriptor: 'Dark tech',
  },
  {
    id: 'the-feed',
    name: 'The Feed',
    tagline: 'Content creator, always shipping',
    storeType: 'digital_creator',
    cardStyle: 'rounded-float',
    defaultLayout: 'grid-airy',
    defaultPalette: 'chalk',
    defaultTypography: 'modern',
    defaultSectionOrder: ['section-header', 'section-featured', 'section-grid', 'section-about', 'section-contact'],
    descriptor: 'Content creator',
  },
  {
    id: 'the-archive-d',
    name: 'The Archive',
    tagline: 'Premium files, editorial feel',
    storeType: 'digital_creator',
    cardStyle: 'polaroid',
    defaultLayout: 'editorial',
    defaultPalette: 'velvet',
    defaultTypography: 'editorial',
    defaultSectionOrder: ['section-header', 'section-hero', 'section-featured', 'section-grid', 'section-contact'],
    descriptor: 'Premium files',
  },

  // ─── Studio ───────────────────────────────────────────────────────────────
  {
    id: 'the-portfolio',
    name: 'The Portfolio',
    tagline: 'Photography studio, work speaks',
    storeType: 'studio',
    cardStyle: 'minimal-line',
    defaultLayout: 'masonry',
    defaultPalette: 'velvet',
    defaultTypography: 'editorial',
    defaultSectionOrder: ['section-header', 'section-hero', 'section-featured', 'section-grid', 'section-about', 'section-contact'],
    descriptor: 'Photography',
  },
  {
    id: 'the-agency',
    name: 'The Agency',
    tagline: 'Design agency, systems thinker',
    storeType: 'studio',
    cardStyle: 'clean-square',
    defaultLayout: 'grid-airy',
    defaultPalette: 'slate',
    defaultTypography: 'modern',
    defaultSectionOrder: ['section-header', 'section-featured', 'section-grid', 'section-about', 'section-contact'],
    descriptor: 'Design agency',
  },
  {
    id: 'the-practice',
    name: 'The Practice',
    tagline: 'Creative consultancy, craft & care',
    storeType: 'studio',
    cardStyle: 'minimal-line',
    defaultLayout: 'minimal',
    defaultPalette: 'chalk',
    defaultTypography: 'warm',
    defaultSectionOrder: ['section-header', 'section-featured', 'section-grid', 'section-about', 'section-contact'],
    descriptor: 'Consultancy',
  },
];

export function getThemesByType(storeType: StoreType): ThemeDefinition[] {
  return STORE_THEMES.filter(t => t.storeType === storeType);
}

export function getThemeById(id: StoreTheme): ThemeDefinition | undefined {
  return STORE_THEMES.find(t => t.id === id);
}
