/* architect.types.ts
   Shared types for The Architect (/store/:handle/customize).
   Extracted here to avoid circular imports between
   ArchitectShell (imports LayerNav) and LayerNav (needs LayerId). */

export type LayerId = 'theme' | 'color' | 'typography' | 'shape' | 'motion' | 'layout' | 'store';

export const LAYER_ORDER: LayerId[] = [
  'theme',
  'color',
  'typography',
  'shape',
  'motion',
  'layout',
  'store',
];
