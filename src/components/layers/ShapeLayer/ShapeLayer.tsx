import { m } from '@/lib/motion';
import type { StoreConfig, StoreShape } from '@/lib/types';
import { SHAPE_OPTIONS } from '@/lib/constants/shapes';
import styles from './ShapeLayer.module.css';

interface ShapeLayerProps {
  draftConfig: StoreConfig;
  onUpdate: (patch: Partial<StoreConfig>) => void;
}

function ShapePreview({ shape }: { shape: StoreShape }) {
  return (
    <div className={`${styles.preview} ${styles[`preview_${shape}`]}`} aria-hidden="true">
      {/* Card shape */}
      <div className={`${styles.previewCard} ${styles[`card_${shape}`]}`}>
        <div className={styles.previewCardImg} />
        <div className={styles.previewCardLines}>
          <div className={styles.previewLine} />
          <div className={`${styles.previewLine} ${styles.previewLineShort}`} />
        </div>
      </div>
      {/* Button shape */}
      <div className={`${styles.previewBtn} ${styles[`btn_${shape}`]}`} />
      {/* Badge */}
      <div className={`${styles.previewBadge} ${styles[`badge_${shape}`]}`} />
    </div>
  );
}

export default function ShapeLayer({ draftConfig, onUpdate }: ShapeLayerProps) {
  const handleSelect = (id: StoreShape) => {
    onUpdate({ shape: id });
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={`${styles.sectionTitle} t-title`}>Shape</h2>
        <p className={`${styles.sectionDesc} t-body`}>
          Controls the sharpness of cards, buttons, and badges across your storefront.
        </p>
      </div>

      <div className={styles.list} role="list" aria-label="Shape options">
        {SHAPE_OPTIONS.map((option) => {
          const isActive = draftConfig.shape === option.id;
          return (
            <m.button
              key={option.id}
              role="listitem"
              className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
              onClick={() => handleSelect(option.id)}
              aria-label={`Select ${option.name} shape`}
              aria-pressed={isActive}
              whileTap={{ scale: 0.985 }}
            >
              <span className={styles.noise} aria-hidden="true" />

              <ShapePreview shape={option.id} />

              <div className={styles.info}>
                <div className={styles.infoLeft}>
                  <span className={`${styles.optionName} t-title`}>{option.name}</span>
                  <span className={`${styles.optionDesc} t-body`}>{option.descriptor}</span>
                </div>
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
            </m.button>
          );
        })}
      </div>
    </section>
  );
}
