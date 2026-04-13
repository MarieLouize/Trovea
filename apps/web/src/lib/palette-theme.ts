/**
 * Trovéa — Palette Theme Injector
 * Maps each palette to dramatic per-surface CSS overrides so every
 * storefront feels genuinely different. Applied via data-palette=""
 * on the .sf-themed root; overrides are injected into a <style> tag.
 *
 * All hex values are provisional — final values locked in after visual review.
 */

import type { StorePalette, StoreFontColor, StoreShape, StoreMotion } from './types/merchant.types';

export type PaletteId = StorePalette;

interface PaletteTheme {
  /** CSS vars injected onto .sf-themed[data-palette="…"] */
  vars: Record<string, string>;
  /** Descriptive label */
  label: string;
  isDark: boolean;
  /** Font color options available for this palette */
  fontColorOptions: StoreFontColor[];
  /** Default font color for this palette */
  defaultFontColor: StoreFontColor;
}

export const PALETTE_THEMES: Record<PaletteId, PaletteTheme> = {
  velvet: {
    label: 'Velvet',
    isDark: true,
    fontColorOptions: ['cream', 'gold', 'white'],
    defaultFontColor: 'cream',
    vars: {
      '--sf-bg':              '#390007',
      '--sf-bg-warm':         '#420008',
      '--sf-bg-cool':         '#260004',
      '--sf-surface':         '#390007',
      '--sf-surface-raised':  '#420008',
      '--sf-surface-inset':   '#2E0005',
      '--sf-fg':              '#F0EDE8',
      '--sf-fg-secondary':    'rgba(240, 237, 232, 0.8)',
      '--sf-fg-muted':        'rgba(240, 237, 232, 0.52)',
      '--sf-fg-ghost':        'rgba(240, 237, 232, 0.28)',
      '--sf-accent':          '#C9A84C',
      '--sf-accent-mid':      '#E2C97E',
      '--sf-accent-glow':     'rgba(201, 168, 76, 0.35)',
      '--sf-hero-overlay':    'linear-gradient(to top, rgba(57, 0, 7, 0.9) 0%, rgba(57, 0, 7, 0.3) 55%, transparent 100%)',
      '--sf-divider':         'rgba(201, 168, 76, 0.12)',
      '--sf-card-bg':         '#420008',
      '--sf-card-shadow':     'var(--shadow-raise-sm)',
    },
  },
  slate: {
    label: 'Slate',
    isDark: true,
    fontColorOptions: ['fog', 'gold', 'white'],
    defaultFontColor: 'fog',
    vars: {
      '--sf-bg':              '#1C2536',
      '--sf-bg-warm':         '#1F2840',
      '--sf-bg-cool':         '#161D2C',
      '--sf-surface':         '#1C2536',
      '--sf-surface-raised':  '#232D44',
      '--sf-surface-inset':   '#141C2C',
      '--sf-fg':              '#E4E8EF',
      '--sf-fg-secondary':    'rgba(228, 232, 239, 0.8)',
      '--sf-fg-muted':        'rgba(228, 232, 239, 0.48)',
      '--sf-fg-ghost':        'rgba(228, 232, 239, 0.24)',
      '--sf-accent':          '#C9A84C',
      '--sf-accent-mid':      '#E2C97E',
      '--sf-accent-glow':     'rgba(201, 168, 76, 0.2)',
      '--sf-hero-overlay':    'linear-gradient(to top, rgba(28, 37, 54, 0.92) 0%, rgba(28, 37, 54, 0.4) 60%, transparent 100%)',
      '--sf-divider':         'rgba(228, 232, 239, 0.08)',
      '--sf-card-bg':         '#232D44',
      '--sf-card-shadow':     'var(--shadow-raise-sm)',
    },
  },
  bloom: {
    label: 'Bloom',
    isDark: false,
    fontColorOptions: ['ink', 'charcoal', 'wine'],
    defaultFontColor: 'ink',
    vars: {
      '--sf-bg':              '#D4B0C4',
      '--sf-bg-warm':         '#DCBCCE',
      '--sf-bg-cool':         '#C8A4B8',
      '--sf-surface':         '#D4B0C4',
      '--sf-surface-raised':  '#DFC0CE',
      '--sf-surface-inset':   '#C8A4B8',
      '--sf-fg':              '#1A0812',
      '--sf-fg-secondary':    'rgba(26, 8, 18, 0.8)',
      '--sf-fg-muted':        'rgba(26, 8, 18, 0.5)',
      '--sf-fg-ghost':        'rgba(26, 8, 18, 0.25)',
      '--sf-accent':          '#390007',
      '--sf-accent-mid':      '#5C0010',
      '--sf-accent-glow':     'rgba(57, 0, 7, 0.15)',
      '--sf-hero-overlay':    'linear-gradient(to top, rgba(212, 176, 196, 0.88) 0%, rgba(212, 176, 196, 0.3) 65%, transparent 100%)',
      '--sf-divider':         'rgba(26, 8, 18, 0.1)',
      '--sf-card-bg':         '#DFC0CE',
      '--sf-card-shadow':     'var(--shadow-raise-sm)',
    },
  },
  obsidian: {
    label: 'Obsidian',
    isDark: true,
    fontColorOptions: ['cream', 'gold', 'silver'],
    defaultFontColor: 'cream',
    vars: {
      '--sf-bg':              '#111114',
      '--sf-bg-warm':         '#18181C',
      '--sf-bg-cool':         '#0A0A0D',
      '--sf-surface':         '#111114',
      '--sf-surface-raised':  '#1A1A1E',
      '--sf-surface-inset':   '#08080A',
      '--sf-fg':              '#F0EDE8',
      '--sf-fg-secondary':    'rgba(240, 237, 232, 0.8)',
      '--sf-fg-muted':        'rgba(240, 237, 232, 0.48)',
      '--sf-fg-ghost':        'rgba(240, 237, 232, 0.24)',
      '--sf-accent':          '#C9A84C',
      '--sf-accent-mid':      '#E2C97E',
      '--sf-accent-glow':     'rgba(201, 168, 76, 0.2)',
      '--sf-hero-overlay':    'linear-gradient(to top, rgba(17, 17, 20, 0.95) 0%, rgba(17, 17, 20, 0.4) 60%, transparent 100%)',
      '--sf-divider':         'rgba(240, 237, 232, 0.08)',
      '--sf-card-bg':         '#1A1A1E',
      '--sf-card-shadow':     'var(--shadow-raise-sm)',
    },
  },
  chalk: {
    label: 'Chalk',
    isDark: false,
    fontColorOptions: ['ink', 'charcoal', 'maroon'],
    defaultFontColor: 'ink',
    vars: {
      '--sf-bg':              '#F5F0EA',
      '--sf-bg-warm':         '#FAF6F0',
      '--sf-bg-cool':         '#EDE8E2',
      '--sf-surface':         '#F5F0EA',
      '--sf-surface-raised':  '#FAF7F2',
      '--sf-surface-inset':   '#EDE8E2',
      '--sf-fg':              '#1A1208',
      '--sf-fg-secondary':    'rgba(26, 18, 8, 0.8)',
      '--sf-fg-muted':        'rgba(26, 18, 8, 0.5)',
      '--sf-fg-ghost':        'rgba(26, 18, 8, 0.25)',
      '--sf-accent':          '#390007',
      '--sf-accent-mid':      '#5C0010',
      '--sf-accent-glow':     'rgba(57, 0, 7, 0.1)',
      '--sf-hero-overlay':    'linear-gradient(to top, rgba(245, 240, 234, 0.88) 0%, rgba(245, 240, 234, 0.3) 65%, transparent 100%)',
      '--sf-divider':         'rgba(26, 18, 8, 0.08)',
      '--sf-card-bg':         '#FAF7F2',
      '--sf-card-shadow':     'var(--shadow-raise-sm)',
    },
  },
};

/** Font color hex values per StoreFontColor id */
export const FONT_COLOR_VALUES: Record<StoreFontColor, string> = {
  cream:   '#F0EDE8',
  gold:    '#E2C97E',
  white:   '#FFFFFF',
  fog:     '#E4E8EF',
  silver:  '#C8D0DC',
  ink:     '#1A1208',
  charcoal:'#2E2820',
  wine:    '#390007',
  maroon:  '#390007',
};

/** Builds a CSS block injecting palette vars at .sf-themed[data-palette="X"] */
export function buildPaletteStyle(paletteId: PaletteId): string {
  const theme = PALETTE_THEMES[paletteId];
  if (!theme) return '';
  const varsStr = Object.entries(theme.vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  return `.sf-themed[data-palette="${paletteId}"] {\n${varsStr}\n}`;
}

/** Builds CSS var overrides for a font color selection */
export function buildFontColorVars(fontColor: StoreFontColor): Record<string, string> {
  const hex = FONT_COLOR_VALUES[fontColor];
  return {
    '--sf-fg':           hex,
    '--sf-fg-secondary': `${hex}CC`,
    '--sf-fg-muted':     `${hex}7A`,
    '--sf-fg-ghost':     `${hex}40`,
  };
}

/** Injects font color overrides into the palette style block */
export function buildPaletteStyleWithFontColor(paletteId: PaletteId, fontColor?: StoreFontColor): string {
  const theme = PALETTE_THEMES[paletteId];
  if (!theme) return '';
  const effectiveFontColor = fontColor ?? theme.defaultFontColor;
  const fontVars = buildFontColorVars(effectiveFontColor);
  const merged = { ...theme.vars, ...fontVars };
  const varsStr = Object.entries(merged)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  return `.sf-themed[data-palette="${paletteId}"] {\n${varsStr}\n}`;
}

/** Returns whether the given palette is dark */
export function isPaletteDark(paletteId: PaletteId): boolean {
  return PALETTE_THEMES[paletteId]?.isDark ?? false;
}

/** Returns the default font color for a palette */
export function getDefaultFontColor(paletteId: PaletteId): StoreFontColor {
  return PALETTE_THEMES[paletteId]?.defaultFontColor ?? 'ink';
}

/** Builds a style attribute object for shape CSS vars (used inline on root) */
export function buildShapeAttr(shape: StoreShape): { 'data-shape': StoreShape } {
  return { 'data-shape': shape };
}

/** Builds a style attribute object for motion (used inline on root) */
export function buildMotionAttr(motion: StoreMotion): { 'data-motion': StoreMotion } {
  return { 'data-motion': motion };
}
