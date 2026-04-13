import { m } from '@/lib/motion';
import type { StoreConfig, StoreTheme } from '@/lib/types';
import { STORE_THEMES, getThemesByType, type ThemeDefinition } from '@/lib/constants/themes';
import { useStoreType } from '@/lib/hooks/use-store-type';
import styles from './ThemeLayer.module.css';

interface ThemeLayerProps {
  draftConfig: StoreConfig;
  onUpdate: (patch: Partial<StoreConfig>) => void;
}

function ThemeMinimap({ theme }: { theme: ThemeDefinition }) {
  const { cardStyle, defaultLayout } = theme;

  // Render a tiny CSS-only visual representing this theme's card + layout combo
  // NOTE: cardStyle values are coupled to class names in ThemeLayer.module.css
  return (
    <div className={`${styles.minimap} ${styles[`minimap_${defaultLayout.replace('-', '_')}`]}`} aria-hidden="true">
      {defaultLayout === 'grid-dense' && (
        <div className={styles.minimapGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${styles.minimapCell} ${styles[`card_${cardStyle.replace(/-/g, '_')}`]}`} />
          ))}
        </div>
      )}
      {defaultLayout === 'grid-airy' && (
        <div className={styles.minimapGridAiry}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.minimapCell} ${styles.minimapCellTall} ${styles[`card_${cardStyle.replace(/-/g, '_')}`]}`} />
          ))}
        </div>
      )}
      {defaultLayout === 'editorial' && (
        <div className={styles.minimapEditorial}>
          <div className={`${styles.minimapCell} ${styles.minimapCellHero} ${styles[`card_${cardStyle.replace(/-/g, '_')}`]}`} />
          <div className={styles.minimapEditorialRow}>
            <div className={`${styles.minimapCell} ${styles[`card_${cardStyle.replace(/-/g, '_')}`]}`} />
            <div className={`${styles.minimapCell} ${styles[`card_${cardStyle.replace(/-/g, '_')}`]}`} />
          </div>
        </div>
      )}
      {defaultLayout === 'masonry' && (
        <div className={styles.minimapMasonry}>
          <div className={styles.minimapMasonryCol}>
            <div className={`${styles.minimapCell} ${styles.minimapCellTall} ${styles[`card_${cardStyle.replace(/-/g, '_')}`]}`} />
            <div className={`${styles.minimapCell} ${styles[`card_${cardStyle.replace(/-/g, '_')}`]}`} />
          </div>
          <div className={styles.minimapMasonryCol}>
            <div className={`${styles.minimapCell} ${styles[`card_${cardStyle.replace(/-/g, '_')}`]}`} />
            <div className={`${styles.minimapCell} ${styles.minimapCellTall} ${styles[`card_${cardStyle.replace(/-/g, '_')}`]}`} />
          </div>
        </div>
      )}
      {defaultLayout === 'minimal' && (
        <div className={styles.minimapMinimal}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.minimapListRow}>
              <div className={`${styles.minimapListThumb} ${styles[`card_${cardStyle.replace(/-/g, '_')}`]}`} />
              <div className={styles.minimapListText}>
                <div className={styles.minimapTextLine} />
                <div className={`${styles.minimapTextLine} ${styles.minimapTextLineShort}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ThemeLayer({ draftConfig, onUpdate }: ThemeLayerProps) {
  const { type } = useStoreType();
  const themes = getThemesByType(type);

  const handleSelect = (theme: ThemeDefinition) => {
    onUpdate({
      theme: theme.id,
      card_style: theme.cardStyle,
      layout: theme.defaultLayout,
      palette: theme.defaultPalette,
      typography: theme.defaultTypography,
      section_order: theme.defaultSectionOrder,
    });
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={`${styles.sectionTitle} t-title`}>Theme</h2>
        <p className={`${styles.sectionDesc} t-body`}>
          Choose the visual direction for your store. Sets layout, card style, and palette.
        </p>
      </div>

      <div className={styles.list} role="list" aria-label="Store themes">
        {themes.map((theme) => {
          const isActive = draftConfig.theme === theme.id;
          return (
            <m.button
              key={theme.id}
              role="listitem"
              className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
              onClick={() => handleSelect(theme)}
              aria-label={`Select ${theme.name} theme`}
              aria-pressed={isActive}
              whileTap={{ scale: 0.985 }}
            >
              <span className={styles.noise} aria-hidden="true" />

              <ThemeMinimap theme={theme} />

              <div className={styles.info}>
                <div className={styles.infoTop}>
                  <div className={styles.infoText}>
                    <span className={`${styles.themeName} t-title`}>{theme.name}</span>
                    <p className={`${styles.themeTagline} t-body`}>{theme.tagline}</p>
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
                <span className={`${styles.descriptorChip} t-caps`}>{theme.descriptor}</span>
              </div>
            </m.button>
          );
        })}
      </div>
    </section>
  );
}
