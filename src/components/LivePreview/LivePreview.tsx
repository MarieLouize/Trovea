import { useRef } from 'react';
import { m, useAnimation } from '@/lib/motion';
import type { StoreConfig } from '@/lib/types/store-config.types';
import { PALETTES } from '@/lib/constants/palettes';
import { TYPOGRAPHY_STACKS } from '@/lib/constants/typography';
import { FIXTURE_MERCHANT, FIXTURE_PRODUCTS, FIXTURE_COLLECTIONS } from '@/lib/fixtures';
import { formatCurrencyFull } from '@/lib/utils/format';
import styles from './LivePreview.module.css';

interface LivePreviewProps {
  draftConfig: StoreConfig;
}

// ── Constant lookups ────────────────────────────────────────────────────────
// PALETTES shape: { id, name, bg, surface, accent, fg } — flat, no .preview
// TYPOGRAPHY_STACKS shape: { id, name, heading, body, cssVars }

function getPaletteColors(paletteId: string) {
  const match = PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0];
  return { bg: match.bg, surface: match.surface, accent: match.accent };
}

function getTypoFonts(typographyId: string) {
  const match = TYPOGRAPHY_STACKS.find((t) => t.id === typographyId) ?? TYPOGRAPHY_STACKS[0];
  // Field names are heading/body (not headingFont/bodyFont)
  return { heading: match.heading, body: match.body };
}

// ── Merchant constants ──────────────────────────────────────────────────────
const merchantName   = FIXTURE_MERCHANT.store_name;
const merchantHandle = FIXTURE_MERCHANT.handle;
const merchantBio    = FIXTURE_MERCHANT.bio ?? FIXTURE_MERCHANT.store_config.about_text;

// ── Products ────────────────────────────────────────────────────────────────
const liveProducts = (FIXTURE_PRODUCTS as any[])
  .filter((p) => p.status === 'live')
  .slice(0, 6);

// ── Section state helpers ───────────────────────────────────────────────────
// Actual section_states keys: 'section-hero' | 'section-about' | 'section-slots' | 'section-featured'
function sectionOn(ss: StoreConfig['section_states'], key: keyof StoreConfig['section_states']): boolean {
  return !!ss?.[key];
}

// ── Sub-components ──────────────────────────────────────────────────────────

function PreviewHero() {
  return (
    <div className={styles.previewHero}>
      <div className={styles.previewHeroInner}>
        <div className={`${styles.previewStoreName} ${styles.previewHeading}`}>{merchantName}</div>
        <div className={styles.previewStoreHandle}>@{merchantHandle}</div>
        <div className={styles.previewHeroBtns}>
          <div className={styles.previewHeroBtn}>Chat</div>
          <div className={`${styles.previewHeroBtn} ${styles.previewHeroBtnAccent}`}>Visit</div>
        </div>
      </div>
    </div>
  );
}

function PreviewCollections() {
  return (
    <div className={styles.previewSection}>
      <div className={styles.previewSectionLabel}>Collections</div>
      <div className={styles.previewCollectionRow}>
        {(FIXTURE_COLLECTIONS as any[]).slice(0, 3).map((c) => (
          <div key={c.id} className={styles.previewCollectionPill}>{c.name}</div>
        ))}
      </div>
    </div>
  );
}

function PreviewCard({ product, cardStyle }: { product: any; cardStyle: string }) {
  const price = formatCurrencyFull(product.price ?? 0);
  const name: string = product.name ?? 'Item';

  // CardStyle actual values: clean-square | rounded-float | polaroid | film-strip | minimal-line
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
    default: // clean-square, rounded-float
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

function PreviewAbout() {
  return (
    <div className={styles.previewSection}>
      <div className={styles.previewSectionLabel}>About</div>
      <div className={styles.previewAboutCard}>
        <div className={styles.previewAboutText}>{merchantBio}</div>
      </div>
    </div>
  );
}

function PreviewFeatured({ cardStyle }: { cardStyle: string }) {
  const featuredIds = FIXTURE_MERCHANT.store_config.featured_item_ids;
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

// ── Main component ──────────────────────────────────────────────────────────

export default function LivePreview({ draftConfig }: LivePreviewProps) {
  const controls = useAnimation();
  const prevConfigRef = useRef(draftConfig);

  if (prevConfigRef.current !== draftConfig) {
    prevConfigRef.current = draftConfig;
    controls.start({
      scale: [1, 1.015, 1],
      transition: { duration: 0.3, ease: 'easeInOut' },
    });
  }

  const colors = getPaletteColors(draftConfig.palette);
  const fonts  = getTypoFonts(draftConfig.typography);
  const ss     = draftConfig.section_states;

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
          style={{
            '--preview-bg':           colors.bg,
            '--preview-surface':      colors.surface,
            '--preview-accent':       colors.accent,
            '--preview-font-heading': fonts.heading,
            '--preview-font-body':    fonts.body,
          } as React.CSSProperties}
          data-preview-palette={draftConfig.palette}
        >
          {sectionOn(ss, 'section-hero')     && <PreviewHero />}
          {sectionOn(ss, 'section-featured') && <PreviewFeatured cardStyle={draftConfig.card_style} />}
          {/* Always show product grid as main content */}
          <PreviewProductGrid cardStyle={draftConfig.card_style} layout={draftConfig.layout} />
          {sectionOn(ss, 'section-about')    && <PreviewAbout />}

          <div style={{ height: '60px' }} />
        </m.div>

        <div className={styles.homeIndicator} />
      </div>

      <p className={styles.previewCaption}>
        {merchantHandle} · {draftConfig.palette} · {draftConfig.layout}
      </p>
    </div>
  );
}