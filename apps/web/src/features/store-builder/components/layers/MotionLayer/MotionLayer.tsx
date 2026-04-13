import { m } from '@/lib/motion';
import type { StoreConfig, StoreMotion } from '@/lib/types';
import { MOTION_OPTIONS } from '@/lib/constants/motions';
import styles from './MotionLayer.module.css';

interface MotionLayerProps {
  draftConfig: StoreConfig;
  onUpdate: (patch: Partial<StoreConfig>) => void;
}

function MotionPreviewCard({ motion }: { motion: StoreMotion }) {
  const isStill = motion === 'still';

  if (isStill) {
    return (
      <div className={styles.previewCard}>
        <div className={styles.previewCardImg} />
        <div className={styles.previewCardInfo}>
          <div className={styles.previewLine} />
          <div className={`${styles.previewLine} ${styles.previewLineShort}`} />
        </div>
        <span className={styles.stillLabel}>No animation</span>
      </div>
    );
  }

  const hoverConfig =
    motion === 'precise'   ? { y: -6, scale: 1.01 }  :
    motion === 'fluid'     ? { y: -12, scale: 1.02 } :
    motion === 'cinematic' ? { y: -16, scale: 1.03 } :
    {};

  const springConfig =
    motion === 'precise'   ? { stiffness: 380, damping: 30 } :
    motion === 'fluid'     ? { stiffness: 260, damping: 26 } :
    motion === 'cinematic' ? { stiffness: 200, damping: 28, mass: 1.2 } :
    { stiffness: 600, damping: 40 };

  return (
    <m.div
      className={styles.previewCard}
      whileHover={hoverConfig}
      transition={{ type: 'spring', ...springConfig }}
    >
      <div className={styles.previewCardImg} />
      <div className={styles.previewCardInfo}>
        <div className={styles.previewLine} />
        <div className={`${styles.previewLine} ${styles.previewLineShort}`} />
      </div>
    </m.div>
  );
}

export default function MotionLayer({ draftConfig, onUpdate }: MotionLayerProps) {
  const handleSelect = (id: StoreMotion) => {
    onUpdate({ motion: id });
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={`${styles.sectionTitle} t-title`}>Motion</h2>
        <p className={`${styles.sectionDesc} t-body`}>
          Controls animation speed and card hover energy. Hover the preview to feel it.
        </p>
      </div>

      <div className={styles.list} role="list" aria-label="Motion options">
        {MOTION_OPTIONS.map((option) => {
          const isActive = draftConfig.motion === option.id;
          return (
            <m.button
              key={option.id}
              role="listitem"
              className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
              onClick={() => handleSelect(option.id)}
              aria-label={`Select ${option.name} motion`}
              aria-pressed={isActive}
              whileTap={{ scale: 0.985 }}
            >
              <span className={styles.noise} aria-hidden="true" />

              <div className={styles.previewArea} aria-hidden="true">
                <MotionPreviewCard motion={option.id} />
              </div>

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
