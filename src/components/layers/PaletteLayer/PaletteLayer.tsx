/**
 * PaletteLayer — Phase 2.5-K
 * 1st Architect layer: per-type default ordering.
 */

import { m } from '@/lib/motion';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { PALETTES } from '@/lib/constants/palettes';
import type { StoreConfig, StorePalette, StoreType, PaletteDefinition } from '@/lib/types';
import styles from './PaletteLayer.module.css';

interface PaletteLayerProps {
  draftConfig: StoreConfig;
  onUpdate: (patch: Partial<StoreConfig>) => void;
}

const PALETTE_ORDER_BY_TYPE: Record<StoreType, StorePalette[]> = {
  collector:       ['parchment', 'maroon', 'onyx', 'velvet', 'slate'],  // "Warm Neutral" first
  vendor:          ['parchment', 'maroon', 'velvet', 'slate', 'onyx'],  // "Earthy/Warm" first
  host:            ['velvet', 'parchment', 'slate', 'onyx', 'maroon'],  // "Soft Blush" first
  digital_creator: ['slate', 'onyx', 'parchment', 'maroon', 'velvet'],  // "Cool Slate" first
  studio:          ['onyx', 'slate', 'parchment', 'maroon', 'velvet'],  // "Deep Obsidian" first
};

export default function PaletteLayer({ draftConfig, onUpdate }: PaletteLayerProps) {
  const { type } = useStoreType();

  const orderedPalettes = (PALETTE_ORDER_BY_TYPE[type] || ['parchment', 'maroon', 'onyx', 'velvet', 'slate'])
    .map(id => PALETTES.find(p => p.id === id))
    .filter((p): p is PaletteDefinition => !!p);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={`${styles.sectionTitle} t-title`}>Colour Palette</h2>
        <p className={`${styles.sectionDesc} t-body`}>
          Set the mood for your store.
        </p>
      </div>

      <div className={styles.grid} role="list" aria-label="Color palettes">
        {orderedPalettes.map((palette) => {
          const isActive = draftConfig.palette === palette.id;
          return (
            <m.button
              key={palette.id}
              role="listitem"
              className={`${styles.paletteBtn} ${isActive ? styles.active : ''}`}
              onClick={() => onUpdate({ palette: palette.id })}
              aria-label={`Select ${palette.name} palette`}
              aria-pressed={isActive}
              whileTap={{ scale: 0.97 }}
            >
              <div className={styles.preview} style={{ background: palette.bg }}>
                <div className={styles.surface} style={{ background: palette.surface }} />
                <div className={styles.accent} style={{ background: palette.accent }} />
              </div>
              <span className={styles.name}>{palette.name}</span>
            </m.button>
          );
        })}
      </div>
    </section>
  );
}
