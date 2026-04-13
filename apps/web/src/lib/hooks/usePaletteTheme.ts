/**
 * Trovéa — usePaletteTheme
 * Shared hook for all public surfaces (StorefrontPage, ItemDetailPage,
 * CollectionPage, ReceiptPage, SubmitReceiptPage).
 *
 * 1. Injects a single <style id="trovea-palette-style"> tag into <head>
 *    with CSS vars for all five palettes (idempotent — only written once).
 * 2. Returns { paletteId, isDark } so the caller can set data-palette and
 *    the sf-themed class on its root element.
 *
 * Usage:
 *   const { paletteId, isDark } = usePaletteTheme(cfg.palette);
 *   <div className={`sf-themed ${styles.root}`} data-palette={paletteId} data-dark={isDark}>
 */

import { useEffect } from 'react';
import { buildPaletteStyle, isPaletteDark, type PaletteId } from '@/lib/palette-theme';

const ALL_PALETTES: PaletteId[] = ['velvet', 'slate', 'bloom', 'obsidian', 'chalk'];

export function usePaletteTheme(rawPalette?: string): {
  paletteId: PaletteId;
  isDark: boolean;
} {
  const paletteId = (ALL_PALETTES.includes(rawPalette as PaletteId)
    ? rawPalette
    : 'chalk') as PaletteId;

  const isDark = isPaletteDark(paletteId);

  useEffect(() => {
    const STYLE_ID = 'trovea-palette-style';
    let tag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement('style');
      tag.id = STYLE_ID;
      document.head.appendChild(tag);
    }
    // Only write once — all palettes live in the same tag so navigation
    // between public pages never loses the vars.
    if (!tag.textContent) {
      tag.textContent = ALL_PALETTES.map(buildPaletteStyle).join('\n\n');
    }
  }, []);

  return { paletteId, isDark };
}