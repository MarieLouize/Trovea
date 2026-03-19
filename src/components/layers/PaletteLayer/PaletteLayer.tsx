import { m } from '@/lib/motion';
import type { StoreConfig, StorePalette } from '@/lib/types/store-config.types';
import { PALETTES } from '@/lib/constants/palettes';
import styles from './PaletteLayer.module.css';

interface PaletteLayerProps {
  draftConfig: StoreConfig;
  onUpdate: (patch: Partial<StoreConfig>) => void;
}

export default function PaletteLayer({ draftConfig, onUpdate }: PaletteLayerProps) {
  const handleSelect = (id: StorePalette) => {
    onUpdate({ palette: id });
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={`${styles.sectionTitle} t-title`}>Palette</h2>
        <p className={`${styles.sectionDesc} t-body`}>
          Choose a color mood for your storefront.
        </p>
      </div>

      <div className={styles.grid} role="list" aria-label="Color palettes">
        {PALETTES.map((palette) => {
          const isActive = draftConfig.palette === palette.id;
          return (
            <m.button
              key={palette.id}
              role="listitem"
              className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
              onClick={() => handleSelect(palette.id)}
              aria-label={`Select ${palette.name} palette`}
              aria-pressed={isActive}
              whileTap={{ scale: 0.97 }}
            >
              <span className={styles.noise} aria-hidden="true" />

              {/* Color swatches — PALETTES shape is flat: { bg, surface, accent } */}
              <div className={styles.swatches} aria-hidden="true">
                <span className={styles.swatch} style={{ background: palette.bg }} />
                <span className={styles.swatch} style={{ background: palette.surface }} />
                <span className={styles.swatch} style={{ background: palette.accent }} />
              </div>

              <span className={`${styles.paletteName} t-title`}>{palette.name}</span>

              {isActive && (
                <m.span
                  className={`${styles.activeBadge} t-caps`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15 }}
                >
                  Active
                </m.span>
              )}
            </m.button>
          );
        })}
      </div>
    </section>
  );
}