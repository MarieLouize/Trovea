/* architect.types.ts
   Shared types for The Architect (/store/:handle/customize).
   Extracted here to avoid circular imports between
   ArchitectShell (imports LayerNav) and LayerNav (needs LayerId). */

export type LayerId = 'palette' | 'layout' | 'typography' | 'card' | 'signature';

export const LAYER_ORDER: LayerId[] = [
  'palette',
  'layout',
  'typography',
  'card',
  'signature',
];