import type { LayoutDefinition } from '../types';

export const LAYOUTS: LayoutDefinition[] = [
  {
    id: 'grid-dense',
    name: 'Dense Grid',
    description: 'Tight 2-column grid. Maximum items above the fold.',
    cssClass: 'layout-grid-dense',
  },
  {
    id: 'grid-airy',
    name: 'Airy Grid',
    description: 'Spacious 2-column grid with generous breathing room.',
    cssClass: 'layout-grid-airy',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Mixed columns. Hero items stretch full-width.',
    cssClass: 'layout-editorial',
  },
  {
    id: 'masonry',
    name: 'Masonry',
    description: 'Pinterest-style staggered flow.',
    cssClass: 'layout-masonry',
  },
  {
    id: 'minimal',
    name: 'Minimal List',
    description: 'Single column. One item at a time. Maximum focus.',
    cssClass: 'layout-minimal',
  },
];