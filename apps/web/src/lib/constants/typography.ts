import type { TypographyDefinition } from '../types';

export const TYPOGRAPHY_STACKS: TypographyDefinition[] = [
  {
    id: 'editorial',
    name: 'Editorial',
    heading: 'Playfair Display',
    body: 'Inter',
    cssVars: {
      '--font-heading': "'Playfair Display', Georgia, serif",
      '--font-body': "'Inter', -apple-system, sans-serif",
    },
  },
  {
    id: 'modern',
    name: 'Modern Sans',
    heading: 'Inter',
    body: 'Inter',
    cssVars: {
      '--font-heading': "'Inter', -apple-system, sans-serif",
      '--font-body': "'Inter', -apple-system, sans-serif",
    },
  },
  {
    id: 'mono',
    name: 'Monospaced',
    heading: 'DM Mono',
    body: 'DM Mono',
    cssVars: {
      '--font-heading': "'DM Mono', 'Courier New', monospace",
      '--font-body': "'DM Mono', 'Courier New', monospace",
    },
  },
  {
    id: 'warm',
    name: 'Warm Serif',
    heading: 'Cormorant Garamond',
    body: 'Inter',
    cssVars: {
      '--font-heading': "'Cormorant Garamond', Georgia, serif",
      '--font-body': "'Inter', -apple-system, sans-serif",
    },
  },
  {
    id: 'bold',
    name: 'Bold Display',
    heading: 'Playfair Display',
    body: 'Inter',
    cssVars: {
      '--font-heading': "'Playfair Display', Georgia, serif",
      '--font-body': "'Inter', -apple-system, sans-serif",
    },
  },
];