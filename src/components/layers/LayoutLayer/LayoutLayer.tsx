import { m } from '@/lib/motion';
import type { StoreConfig, StoreLayout } from '@/lib/types/store-config.types';
import { LAYOUTS } from '@/lib/constants/layouts';
import styles from './LayoutLayer.module.css';

interface LayoutLayerProps {
  draftConfig: StoreConfig;
  onUpdate: (patch: Partial<StoreConfig>) => void;
}

/* Mini visual layout representations using CSS */
function LayoutMinimap({ id }: { id: StoreLayout }) {
  switch (id) {
    case 'grid-dense':
      return (
        <div className={styles.minimapGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.minimapCell} />
          ))}
        </div>
      );
    case 'grid-airy':
      return (
        <div className={styles.minimapGridAiry}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.minimapCell} ${styles.minimapCellTall}`} />
          ))}
        </div>
      );
    case 'editorial':
      return (
        <div className={styles.minimapEditorial}>
          <div className={`${styles.minimapCell} ${styles.minimapCellHero}`} />
          <div className={styles.minimapEditorialRow}>
            <div className={styles.minimapCell} />
            <div className={styles.minimapCell} />
          </div>
          <div className={`${styles.minimapCell} ${styles.minimapCellWide}`} />
        </div>
      );
    case 'masonry':
      return (
        <div className={styles.minimapMasonry}>
          <div className={styles.minimapMasonryCol}>
            <div className={`${styles.minimapCell} ${styles.minimapCellTall}`} />
            <div className={styles.minimapCell} />
          </div>
          <div className={styles.minimapMasonryCol}>
            <div className={styles.minimapCell} />
            <div className={`${styles.minimapCell} ${styles.minimapCellTall}`} />
          </div>
        </div>
      );
    case 'minimal':
      return (
        <div className={styles.minimapMinimal}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.minimapListRow}>
              <div className={styles.minimapListThumb} />
              <div className={styles.minimapListText}>
                <div className={styles.minimapTextLine} />
                <div className={`${styles.minimapTextLine} ${styles.minimapTextLineShort}`} />
              </div>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

export default function LayoutLayer({ draftConfig, onUpdate }: LayoutLayerProps) {
  const handleSelect = (id: StoreLayout) => {
    onUpdate({ layout: id });
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={`${styles.sectionTitle} t-title`}>Layout</h2>
        <p className={`${styles.sectionDesc} t-body`}>
          Control how products are displayed on your store.
        </p>
      </div>

      <div className={styles.list} role="list" aria-label="Store layouts">
        {LAYOUTS.map((layout) => {
          const isActive = draftConfig.layout === layout.id;
          return (
            <m.button
              key={layout.id}
              role="listitem"
              className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
              onClick={() => handleSelect(layout.id)}
              aria-label={`Select ${layout.label} layout`}
              aria-pressed={isActive}
              whileTap={{ scale: 0.985 }}
            >
              <span className={styles.noise} aria-hidden="true" />

              {/* Minimap visual */}
              <div className={styles.minimap} aria-hidden="true">
                <LayoutMinimap id={layout.id} />
              </div>

              {/* Info */}
              <div className={styles.info}>
                <div className={styles.infoTop}>
                  <span className={`${styles.layoutName} t-title`}>{layout.label}</span>
                  {isActive && (
                    <m.span
                      className={`${styles.activeBadge} t-caps`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      Active
                    </m.span>
                  )}
                </div>
                <p className={`${styles.layoutDesc} t-body`}>{layout.description}</p>
              </div>
            </m.button>
          );
        })}
      </div>
    </section>
  );
}