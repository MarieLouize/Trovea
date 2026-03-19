/**
 * Trove'a — CollectionPage (Phase 1E Upgrade)
 * Collection hero with atmospheric color gradient, staggered product grid.
 */

import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { FIXTURE_PRODUCTS, FIXTURE_COLLECTIONS, FIXTURE_MERCHANT } from '@/lib/fixtures';
import { formatCurrencyFull } from '@/lib/utils/format';
import { m, staggerContainer, staggerChild } from '@/lib/motion';
import type { CardStyle } from '@/lib/types';
import { usePaletteTheme } from '@/lib/hooks/usePaletteTheme';
import styles from './CollectionPage.module.css';
import '@/styles/cards.css';

function CollectionCard({
  product,
  handle,
  cardStyle,
}: {
  product: { id: string; name: string; price: number; images: string[]; status: string; claim_mode: boolean };
  handle: string;
  cardStyle: CardStyle;
}) {
  const isSoldOut = product.status === 'sold_out';
  return (
    <m.div variants={staggerChild}>
      <Link to={`/store/${handle}/item/${product.id}`} className={`sf-card sf-card-${cardStyle}`}>
        <div className="sf-card-image" style={{ aspectRatio: '1 / 1' }}>
          <img
            src={product.images[0] ?? `https://picsum.photos/seed/${product.id}/400/400`}
            alt={product.name}
            loading="lazy"
          />
          {isSoldOut && <span className="sf-card-status sf-card-status-sold">Sold</span>}
          {product.claim_mode && !isSoldOut && (
            <span className="sf-card-status sf-card-status-claim">Claim</span>
          )}
        </div>
        <div className="sf-card-body">
          <p className="sf-card-name">{product.name}</p>
          <p className="sf-card-price">{formatCurrencyFull(product.price)}</p>
        </div>
      </Link>
    </m.div>
  );
}

export default function CollectionPage() {
  const { handle, collection_slug } = useParams<{ handle: string; collection_slug: string }>();
  const merchant = FIXTURE_MERCHANT;
  const cfg      = merchant.store_config;
  const { paletteId, isDark } = usePaletteTheme(cfg.palette);

  const collection = useMemo(
    () => FIXTURE_COLLECTIONS.find((c) => c.slug === collection_slug),
    [collection_slug]
  );

  const collectionProducts = useMemo(() => {
    if (!collection) return [];
    return FIXTURE_PRODUCTS.filter((p) => p.collection_id === collection.id && p.status !== 'hidden');
  }, [collection]);

  const otherCollections = useMemo(
    () => FIXTURE_COLLECTIONS.filter((c) => c.id !== collection?.id),
    [collection]
  );

  if (!collection) {
    return (
      <div className={`sf-themed ${styles.page}`} data-palette={paletteId} data-dark={isDark}>
        <nav className={styles.navBar}>
          <Link to={`/store/${handle ?? merchant.handle}`} className={styles.backBtn}>
            <ArrowLeft size={16} />
          </Link>
          <span className={styles.navCrumb}>Collection not found</span>
        </nav>
        <div className={styles.notFound}>
          <p className={styles.notFoundTitle}>Collection not found</p>
        </div>
      </div>
    );
  }

  const liveCount = collectionProducts.filter((p) => p.status === 'live').length;

  return (
    <div className={`sf-themed ${styles.page}`} data-palette={paletteId} data-dark={isDark}>
      {/* Nav */}
      <m.nav
        className={styles.navBar}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
      >
        <Link to={`/store/${handle ?? merchant.handle}`} className={styles.backBtn} aria-label="Back">
          <ArrowLeft size={16} />
        </Link>
        <span className={styles.navCrumb}>
          <Link to={`/store/${handle ?? merchant.handle}`} className={styles.navCrumbLink}>
            {merchant.store_name}
          </Link>
          {' / '}
          {collection.name}
        </span>
      </m.nav>

      {/* ── Hero ── */}
      <m.header
        className={styles.hero}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.5 } }}
      >
        {/* Atmospheric color overlay */}
        <div
          className={styles.heroBg}
          style={{
            background: `
              radial-gradient(ellipse 70% 80% at 15% 50%, ${collection.color_accent ?? 'transparent'}55 0%, transparent 65%),
              radial-gradient(ellipse 50% 60% at 85% 30%, ${collection.color_accent ?? 'transparent'}22 0%, transparent 60%)
            `,
          }}
        />

        <m.div
          className={styles.heroContent}
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          <m.p variants={staggerChild} className={styles.heroEyebrow}>
            <span
              className={styles.heroAccentDot}
              style={{
                background: collection.color_accent,
                color: collection.color_accent,
              }}
            />
            Collection
          </m.p>

          <m.h1 variants={staggerChild} className={styles.heroTitle}>
            {collection.name}
          </m.h1>

          {collection.description && (
            <m.p variants={staggerChild} className={styles.heroDesc}>
              {collection.description}
            </m.p>
          )}

          <m.div variants={staggerChild} className={styles.heroMeta}>
            <span className={styles.heroMetaItem}>
              {collectionProducts.length} piece{collectionProducts.length !== 1 ? 's' : ''}
            </span>
            {liveCount < collectionProducts.length && (
              <span className={styles.heroMetaItem}>
                · {collectionProducts.length - liveCount} sold
              </span>
            )}
          </m.div>
        </m.div>
      </m.header>

      {/* ── Products ── */}
      <section className={styles.productsSection}>
        <div className={styles.productsHeader}>
          <h2 className={styles.productsTitle}>Items</h2>
          <span className={styles.productCount}>
            {collectionProducts.length} piece{collectionProducts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {collectionProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Empty collection</p>
            <p className={styles.emptyText}>Items are being added soon.</p>
          </div>
        ) : (
          <m.div
            className={`${styles.productGrid} card-${cfg.card_style}`}
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {collectionProducts.map((p) => (
              <CollectionCard
                key={p.id}
                product={{
                  id:         p.id,
                  name:       p.name,
                  price:      p.price,
                  images:     p.images,
                  status:     p.status,
                  claim_mode: p.claim_mode,
                }}
                handle={handle ?? merchant.handle}
                cardStyle={cfg.card_style}
              />
            ))}
          </m.div>
        )}
      </section>

      {/* ── Other collections ── */}
      {otherCollections.length > 0 && (
        <m.section
          className={styles.othersSection}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className={styles.othersTitle}>Browse Other Collections</p>
          <div className={styles.othersGrid}>
            {otherCollections.map((col) => {
              const count = FIXTURE_PRODUCTS.filter(
                (p) => p.collection_id === col.id && p.status !== 'hidden'
              ).length;
              return (
                <Link
                  key={col.id}
                  to={`/store/${handle ?? merchant.handle}/c/${col.slug}`}
                  className={styles.otherCard}
                >
                  <div className={styles.otherCardDot} style={{ background: col.color_accent }} />
                  <p className={styles.otherCardName}>{col.name}</p>
                  <p className={styles.otherCardCount}>{count} item{count !== 1 ? 's' : ''}</p>
                </Link>
              );
            })}
          </div>
        </m.section>
      )}
    </div>
  );
}