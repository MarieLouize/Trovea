import { m, AnimatePresence } from '@/lib/motion';
import type { StoreConfig, StorePalette, StoreFontColor } from '@/lib/types';
import { PALETTES } from '@/lib/constants/palettes';
import { PALETTE_THEMES, FONT_COLOR_VALUES } from '@/lib/palette-theme';
import styles from './ColorLayer.module.css';

interface ColorLayerProps {
  draftConfig: StoreConfig;
  onUpdate: (patch: Partial<StoreConfig>) => void;
}

export default function ColorLayer({ draftConfig, onUpdate }: ColorLayerProps) {
  const activePalette = draftConfig.palette;
  const activeFontColor = draftConfig.font_color;
  const paletteTheme = PALETTE_THEMES[activePalette];

  const handleSelectPalette = (id: StorePalette) => {
    const theme = PALETTE_THEMES[id];
    onUpdate({
      palette: id,
      font_color: theme?.defaultFontColor ?? 'ink',
    });
  };

  const handleSelectFontColor = (id: StoreFontColor) => {
    onUpdate({ font_color: id });
  };

  return (
    <section className={styles.section}>
      {/* ── Part A: Palette ── */}
      <div className={styles.subSection}>
        <div className={styles.header}>
          <h2 className={`${styles.sectionTitle} t-title`}>Color</h2>
          <p className={`${styles.sectionDesc} t-body`}>
            Choose the background palette for your storefront.
          </p>
        </div>

        <div className={styles.paletteGrid} role="list" aria-label="Color palettes">
          {PALETTES.map((palette) => {
            const isActive = activePalette === palette.id;
            return (
              <m.button
                key={palette.id}
                role="listitem"
                className={`${styles.paletteCard} ${isActive ? styles.paletteCardActive : ''}`}
                onClick={() => handleSelectPalette(palette.id as StorePalette)}
                aria-label={`Select ${palette.name} palette`}
                aria-pressed={isActive}
                whileTap={{ scale: 0.95 }}
              >
                {/* Swatch: bg left 60% + surface right 40% */}
                <div className={styles.swatch} style={{ background: palette.bg }}>
                  <div
                    className={styles.swatchSurface}
                    style={{ background: palette.surface }}
                  />
                  {/* Accent dot */}
                  <div
                    className={styles.accentDot}
                    style={{ background: palette.accent }}
                  />
                </div>
                <span className={`${styles.paletteName} t-caps`}>{palette.name}</span>
                {isActive && (
                  <m.span
                    className={`${styles.activeDot}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  />
                )}
              </m.button>
            );
          })}
        </div>
      </div>

      {/* ── Part B: Font Color ── */}
      <AnimatePresence>
        {paletteTheme && (
          <m.div
            className={styles.subSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.header}>
              <h3 className={`${styles.subSectionTitle} t-caps`}>Text Color</h3>
              <p className={`${styles.sectionDesc} t-body`}>
                Choose how text reads against this palette.
              </p>
            </div>

            <div className={styles.fontColorList} role="list" aria-label="Text color options">
              {paletteTheme.fontColorOptions.map((colorId) => {
                const isActive = activeFontColor === colorId;
                const hex = FONT_COLOR_VALUES[colorId];
                return (
                  <m.button
                    key={colorId}
                    role="listitem"
                    className={`${styles.fontColorCard} ${isActive ? styles.fontColorCardActive : ''}`}
                    onClick={() => handleSelectFontColor(colorId)}
                    aria-label={`Select ${colorId} text color`}
                    aria-pressed={isActive}
                    whileTap={{ scale: 0.97 }}
                    style={{ background: PALETTES.find(p => p.id === activePalette)?.bg ?? '#000' }}
                  >
                    <span
                      className={styles.fontColorSample}
                      style={{ color: hex }}
                    >
                      Aa
                    </span>
                    <span
                      className={`${styles.fontColorName} t-caps`}
                      style={{ color: hex }}
                    >
                      {colorId}
                    </span>
                    {isActive && (
                      <m.span
                        className={`${styles.activeBadge} t-caps`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ color: hex }}
                      >
                        Active
                      </m.span>
                    )}
                  </m.button>
                );
              })}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}
