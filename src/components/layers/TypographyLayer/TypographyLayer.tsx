import { m } from '@/lib/motion';
import type { StoreConfig, StoreTypography } from '@/lib/types';
import { TYPOGRAPHY_STACKS } from '@/lib/constants/typography';
import { useMerchantStore } from '@/lib/store/merchant.store';
import styles from './TypographyLayer.module.css';

interface TypographyLayerProps {
  draftConfig: StoreConfig;
  onUpdate: (patch: Partial<StoreConfig>) => void;
}

export default function TypographyLayer({ draftConfig, onUpdate }: TypographyLayerProps) {
  const storeName = useMerchantStore((s) => s.merchant.store_name);

  const handleSelect = (id: StoreTypography) => {
    onUpdate({ typography: id });
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={`${styles.sectionTitle} t-title`}>Typography</h2>
        <p className={`${styles.sectionDesc} t-body`}>
          Set the font personality of your storefront.
        </p>
      </div>

      <div className={styles.list} role="list" aria-label="Typography stacks">
        {TYPOGRAPHY_STACKS.map((stack) => {
          const isActive = draftConfig.typography === stack.id;
          // TYPOGRAPHY_STACKS shape: { id, name, heading, body, cssVars }
          // cssVars: { '--font-heading': '...', '--font-body': '...' }
          return (
            <m.button
              key={stack.id}
              role="listitem"
              className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
              onClick={() => handleSelect(stack.id)}
              aria-label={`Select ${stack.name} typography`}
              aria-pressed={isActive}
              style={stack.cssVars as React.CSSProperties}
              whileTap={{ scale: 0.985 }}
            >
              <span className={styles.noise} aria-hidden="true" />

              <div className={styles.preview}>
                <p className={styles.previewHeading} style={{ fontFamily: stack.heading }}>
                  {storeName}
                </p>
                <p className={styles.previewBody} style={{ fontFamily: stack.body }}>
                  Ivory Silk Wrap Dress
                </p>
                <p className={styles.previewMeta}>
                  <span style={{ fontFamily: stack.heading, fontStyle: 'italic', fontSize: '11px' }}>
                    {stack.heading}
                  </span>
                  {' · '}
                  <span style={{ fontFamily: stack.body, fontSize: '10px' }}>
                    {stack.body}
                  </span>
                </p>
              </div>

              <div className={styles.info}>
                <span className={`${styles.stackName} t-caps`}>{stack.name}</span>
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
