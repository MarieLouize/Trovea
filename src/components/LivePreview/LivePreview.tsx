import { useRef, useEffect } from 'react';
import { m, useAnimation } from '@/lib/motion';
import type { StoreConfig, SignatureDefinition, Product } from '@/lib/types';
import { PALETTES } from '@/lib/constants/palettes';
import { TYPOGRAPHY_STACKS } from '@/lib/constants/typography';
import { SIGNATURES } from '@/lib/constants/signatures';
import { FONT_COLOR_VALUES } from '@/lib/palette-theme';
import { getThemeById } from '@/lib/constants/themes';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { FIXTURE_PRODUCTS } from '@/lib/fixtures';
import { formatCurrencyFull } from '@/lib/utils/format';
import styles from './LivePreview.module.css';
import '@/styles/storefront-shapes.css';
import '@/styles/storefront-motion.css';

interface LivePreviewProps {
  draftConfig: StoreConfig;
}

// ── Constant lookups ────────────────────────────────────────────────────────

function getPaletteColors(paletteId: string) {
  const match = PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0];
  return { bg: match.bg, surface: match.surface, accent: match.accent };
}

function getTypoFonts(typographyId: string) {
  const match = TYPOGRAPHY_STACKS.find((t) => t.id === typographyId) ?? TYPOGRAPHY_STACKS[0];
  return { heading: match.heading, body: match.body };
}

// ── Products ────────────────────────────────────────────────────────────────
const liveProducts = (FIXTURE_PRODUCTS as Product[])
  .filter((p) => p.status === 'live')
  .slice(0, 6);

// ── Section state helpers ───────────────────────────────────────────────────
function sectionOn(ss: StoreConfig['section_states'], key: keyof StoreConfig['section_states']): boolean {
  return !!ss?.[key];
}

// ── Sub-components ──────────────────────────────────────────────────────────

function PreviewMiniBrand({ storeName, tagline }: { storeName: string; tagline: string }) {
  return (
    <div className={styles.previewMiniBrand}>
      <span className={styles.previewMiniBrandName}>{storeName}</span>
      {tagline && (
        <span className={styles.previewMiniBrandTagline}>{tagline}</span>
      )}
    </div>
  );
}

function PreviewHero({ storeName, handle }: { storeName: string; handle: string }) {
  return (
    <div className={styles.previewHero}>
      <div className={styles.previewHeroInner}>
        <div className={styles.previewStoreName}>{storeName}</div>
        <div className={styles.previewStoreHandle}>@{handle}</div>
        <div className={styles.previewHeroBtns}>
          <div className={styles.previewHeroBtn}>Chat</div>
          <div className={`${styles.previewHeroBtn} ${styles.previewHeroBtnAccent}`}>Visit</div>
        </div>
      </div>
    </div>
  );
}

function PreviewCard({ product, cardStyle }: { product: Product; cardStyle: string }) {
  const price = formatCurrencyFull(product.price ?? 0);
  const name: string = product.name ?? 'Item';

  switch (cardStyle) {
    case 'polaroid':
      return (
        <div className={styles.previewCardStamp}>
          <div className={styles.previewCardImg} />
          <div className={styles.previewCardNameItalic}>{name}</div>
          <div className={styles.previewCardPriceSm}>{price}</div>
        </div>
      );
    case 'film-strip':
      return (
        <div className={styles.previewCardReceipt}>
          <div className={styles.previewCardImg} />
          <div className={styles.previewCardNameMono}>{name.slice(0, 10).toUpperCase()}</div>
          <div className={styles.previewCardPriceGold}>{price}</div>
        </div>
      );
    case 'minimal-line':
      return (
        <div className={styles.previewCardMinimal}>
          <div className={styles.previewCardImgSm} />
          <div className={styles.previewCardName}>{name}</div>
          <div className={styles.previewCardPrice}>{price}</div>
        </div>
      );
    default:
      return (
        <div className={styles.previewCard}>
          <div className={styles.previewCardImg} />
          <div className={styles.previewCardName}>{name}</div>
          <div className={styles.previewCardPrice}>{price}</div>
        </div>
      );
  }
}

function PreviewProductGrid({ cardStyle, layout }: { cardStyle: string; layout: string }) {
  const isMinimal = layout === 'minimal';
  const isDense   = layout === 'grid-dense';

  if (isMinimal) {
    return (
      <div className={styles.previewSection}>
        <div className={styles.previewSectionLabel}>All Items</div>
        <div className={styles.previewListGrid}>
          {liveProducts.slice(0, 4).map((p) => (
            <div key={p.id} className={styles.previewListRow}>
              <div className={styles.previewListThumb} />
              <div className={styles.previewListInfo}>
                <div className={styles.previewListName}>{p.name ?? 'Item'}</div>
                <div className={styles.previewListPrice}>{formatCurrencyFull(p.price ?? 0)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.previewSection}>
      <div className={styles.previewSectionLabel}>All Items</div>
      <div className={`${styles.previewGrid} ${isDense ? styles.previewGridDense : ''}`}>
        {liveProducts.map((p) => (
          <PreviewCard key={p.id} product={p} cardStyle={cardStyle} />
        ))}
      </div>
    </div>
  );
}

function PreviewAbout({ bio }: { bio: string }) {
  return (
    <div className={styles.previewSection}>
      <div className={styles.previewSectionLabel}>About</div>
      <div className={styles.previewAboutCard}>
        <div className={styles.previewAboutText}>{bio}</div>
      </div>
    </div>
  );
}

function PreviewFeatured({ cardStyle, featuredIds }: { cardStyle: string; featuredIds: string[] }) {
  const featured = liveProducts
    .filter((p) => featuredIds.includes(p.id))
    .slice(0, 3);
  const items = featured.length > 0 ? featured : liveProducts.slice(0, 3);

  return (
    <div className={styles.previewSection}>
      <div className={styles.previewSectionLabel}>Featured</div>
      <div className={styles.previewGrid}>
        {items.map((p) => (
          <PreviewCard key={p.id} product={p} cardStyle={cardStyle} />
        ))}
      </div>
    </div>
  );
}

// ── Collector Preview States ────────────────────────────────────────────────

function PreviewCollectorState({ state }: { state: string }) {
  if (state === 'pre_drop') {
    return (
      <div className={styles.previewDropCountdown}>
        <p className={styles.previewDropLabel}>Drop 04 — Summer Haul</p>
        <div className={styles.previewCountdown}>
          <div className={styles.previewCountdownUnit}><span>02d</span></div>
          <div className={styles.previewCountdownUnit}><span>14h</span></div>
          <div className={styles.previewCountdownUnit}><span>33m</span></div>
        </div>
        <p className={styles.previewNotify}>Notify Me</p>
      </div>
    );
  }

  if (state === 'live_drop') {
    return (
      <div className={styles.previewDropLive}>
        <m.span 
          className={styles.previewLiveDot}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >●</m.span>
        <p>DROP LIVE</p>
      </div>
    );
  }

  if (state === 'all_sold') {
    return (
      <div className={styles.previewAllSold}>
        <p className={styles.previewAllSoldTitle}>Drop 03 — All sold out</p>
        <p className={styles.previewAllSoldNext}>Next drop: Coming soon</p>
      </div>
    );
  }

  return null;
}

// ── Main component ──────────────────────────────────────────────────────────

export default function LivePreview({ draftConfig }: LivePreviewProps) {
  const controls = useAnimation();
  const prevConfigRef = useRef(draftConfig);
  const { merchant } = useMerchantStore();
  const st = useStoreType();

  // Pulse animation on config change
  useEffect(() => {
    if (prevConfigRef.current !== draftConfig) {
      controls.start({
        scale: [1, 1.015, 1],
        transition: { duration: 0.3, ease: 'easeInOut' },
      });
    }
    prevConfigRef.current = draftConfig;
  }, [draftConfig, controls]);

  const colors = getPaletteColors(draftConfig.palette);
  const fonts  = getTypoFonts(draftConfig.typography);
  const ss     = draftConfig.section_states;
  const tc     = draftConfig.store_type_config;

  const storeName   = merchant.store_name;
  const storeHandle = merchant.handle;
  const bio         = merchant.bio ?? draftConfig.about_text;

  const signature: SignatureDefinition | undefined = SIGNATURES.find((s) => s.id === draftConfig.signature);
  const theme = getThemeById(draftConfig.theme);
  const tagline = theme?.tagline ?? signature?.tagline ?? '';

  const showStandardContent = !st.isCollector || tc.preview_state === 'static' || tc.preview_state === 'live_drop';

  return (
    <div className={styles.wrapper}>
      <div className={styles.phoneFrame}>
        <div className={styles.statusBar}>
          <span className={styles.statusTime}>9:41</span>
          <div className={styles.statusIcons}>
            <span className={styles.statusBattery} />
          </div>
        </div>

        <m.div
          className={styles.screen}
          animate={controls}
          data-palette={draftConfig.palette}
          data-shape={draftConfig.shape ?? 'form'}
          data-motion={draftConfig.motion ?? 'precise'}
          style={{
            '--preview-bg':           colors.bg,
            '--preview-surface':      colors.surface,
            '--preview-accent':       colors.accent,
            '--preview-font-heading': fonts.heading,
            '--preview-font-body':    fonts.body,
            '--preview-fg':           FONT_COLOR_VALUES[draftConfig.font_color] ?? colors.accent,
          } as React.CSSProperties}
        >
          <PreviewMiniBrand storeName={storeName} tagline={tagline} />

          {st.isCollector && tc.preview_state !== 'static' && (
            <PreviewCollectorState state={tc.preview_state} />
          )}

          {showStandardContent && (
            <>
              {sectionOn(ss, 'section-hero')     && <PreviewHero storeName={storeName} handle={storeHandle} />}
              {sectionOn(ss, 'section-featured') && (
                <PreviewFeatured
                  cardStyle={draftConfig.card_style}
                  featuredIds={draftConfig.featured_item_ids}
                />
              )}
              <PreviewProductGrid cardStyle={draftConfig.card_style} layout={draftConfig.layout} />
              {sectionOn(ss, 'section-about')    && <PreviewAbout bio={bio} />}
            </>
          )}

          <div style={{ height: '60px' }} />
        </m.div>

        <div className={styles.homeIndicator} />
      </div>

      <p className={styles.previewCaption}>
        {theme?.name ?? draftConfig.theme} · {draftConfig.palette} · {draftConfig.shape}
      </p>
    </div>
  );
}
