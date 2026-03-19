/**
 * Trove'a — Palette Theme Injector
 * Maps each palette to dramatic per-surface CSS overrides so every
 * storefront feels genuinely different.  Applied via data-palette=""
 * on the .storefront root; overrides are injected into a <style> tag.
 */

export type PaletteId = 'maroon' | 'velvet' | 'parchment' | 'slate' | 'onyx';

interface PaletteTheme {
  /** CSS vars injected onto [data-palette="…"] { … } */
  vars: Record<string, string>;
  /** Tailwind-style descriptors for the palette */
  label: string;
  isDark: boolean;
}

export const PALETTE_THEMES: Record<PaletteId, PaletteTheme> = {
  maroon: {
    label: 'Maroon',
    isDark: false,
    vars: {
      '--sf-bg':           '#F5F1EC',
      '--sf-bg-warm':      '#EDE7DE',
      '--sf-surface':      '#EDE7DE',
      '--sf-surface-raised':'#F5F1EC',
      '--sf-surface-inset':'#E5DDD3',
      '--sf-fg':           '#1A0A08',
      '--sf-fg-muted':     '#4A2E28',
      '--sf-fg-ghost':     '#9A7A72',
      '--sf-accent':       '#390007',
      '--sf-accent-mid':   '#5A000B',
      '--sf-accent-glow':  'rgba(57,0,7,0.25)',
      '--sf-hero-overlay': 'linear-gradient(to top, rgba(26,10,8,0.72) 0%, rgba(26,10,8,0.2) 55%, transparent 100%)',
      '--sf-divider':      'rgba(26,10,8,0.08)',
      '--sf-card-bg':      '#F5F1EC',
      '--sf-card-shadow':  '6px 6px 18px rgba(26,10,8,0.13), -4px -4px 12px rgba(255,255,255,0.85)',
    },
  },
  velvet: {
    label: 'Velvet',
    isDark: true,
    vars: {
      '--sf-bg':           '#1C0209',
      '--sf-bg-warm':      '#250310',
      '--sf-surface':      '#260308',
      '--sf-surface-raised':'#2E0510',
      '--sf-surface-inset':'#180104',
      '--sf-fg':           '#F5ECD8',
      '--sf-fg-muted':     '#C9B090',
      '--sf-fg-ghost':     '#7A5540',
      '--sf-accent':       '#C9A84C',
      '--sf-accent-mid':   '#E8C96A',
      '--sf-accent-glow':  'rgba(201,168,76,0.35)',
      '--sf-hero-overlay': 'linear-gradient(to top, rgba(28,2,9,0.9) 0%, rgba(28,2,9,0.3) 55%, transparent 100%)',
      '--sf-divider':      'rgba(201,168,76,0.12)',
      '--sf-card-bg':      '#2E0510',
      '--sf-card-shadow':  '6px 6px 20px rgba(0,0,0,0.55), -3px -3px 10px rgba(255,255,255,0.04)',
    },
  },
  parchment: {
    label: 'Parchment',
    isDark: false,
    vars: {
      '--sf-bg':           '#F7F0E3',
      '--sf-bg-warm':      '#F0E6D0',
      '--sf-surface':      '#F0E6D0',
      '--sf-surface-raised':'#F7F0E3',
      '--sf-surface-inset':'#E8D9C0',
      '--sf-fg':           '#2A1F0D',
      '--sf-fg-muted':     '#5A4830',
      '--sf-fg-ghost':     '#A8906A',
      '--sf-accent':       '#7A5200',
      '--sf-accent-mid':   '#A07010',
      '--sf-accent-glow':  'rgba(122,82,0,0.2)',
      '--sf-hero-overlay': 'linear-gradient(to top, rgba(42,31,13,0.7) 0%, rgba(42,31,13,0.15) 55%, transparent 100%)',
      '--sf-divider':      'rgba(42,31,13,0.08)',
      '--sf-card-bg':      '#F7F0E3',
      '--sf-card-shadow':  '5px 5px 16px rgba(42,31,13,0.14), -4px -4px 12px rgba(255,255,255,0.9)',
    },
  },
  slate: {
    label: 'Slate',
    isDark: false,
    vars: {
      '--sf-bg':           '#ECEFF4',
      '--sf-bg-warm':      '#E3E8F0',
      '--sf-surface':      '#E5E9F0',
      '--sf-surface-raised':'#ECEFF4',
      '--sf-surface-inset':'#D8DDE8',
      '--sf-fg':           '#0F1624',
      '--sf-fg-muted':     '#3A4A62',
      '--sf-fg-ghost':     '#7A8EA8',
      '--sf-accent':       '#1A3A6A',
      '--sf-accent-mid':   '#2A5098',
      '--sf-accent-glow':  'rgba(26,58,106,0.22)',
      '--sf-hero-overlay': 'linear-gradient(to top, rgba(15,22,36,0.72) 0%, rgba(15,22,36,0.2) 55%, transparent 100%)',
      '--sf-divider':      'rgba(15,22,36,0.08)',
      '--sf-card-bg':      '#ECEFF4',
      '--sf-card-shadow':  '6px 6px 18px rgba(15,22,36,0.13), -4px -4px 12px rgba(255,255,255,0.88)',
    },
  },
  onyx: {
    label: 'Onyx',
    isDark: true,
    vars: {
      '--sf-bg':           '#0E0E10',
      '--sf-bg-warm':      '#141416',
      '--sf-surface':      '#161618',
      '--sf-surface-raised':'#1C1C20',
      '--sf-surface-inset':'#0A0A0C',
      '--sf-fg':           '#F0EDE8',
      '--sf-fg-muted':     '#A8A4A0',
      '--sf-fg-ghost':     '#5A5752',
      '--sf-accent':       '#D4C4A8',
      '--sf-accent-mid':   '#EAD8B8',
      '--sf-accent-glow':  'rgba(212,196,168,0.2)',
      '--sf-hero-overlay': 'linear-gradient(to top, rgba(14,14,16,0.92) 0%, rgba(14,14,16,0.3) 55%, transparent 100%)',
      '--sf-divider':      'rgba(240,237,232,0.07)',
      '--sf-card-bg':      '#1C1C20',
      '--sf-card-shadow':  '6px 6px 22px rgba(0,0,0,0.6), -3px -3px 10px rgba(255,255,255,0.03)',
    },
  },
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

/** Returns whether the given palette is dark */
export function isPaletteDark(paletteId: PaletteId): boolean {
  return PALETTE_THEMES[paletteId]?.isDark ?? false;
}