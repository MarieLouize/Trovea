/**
 * Trove'a — ItemDetailPage (Phase 1E Upgrade)
 * Image lightbox with swipe/keyboard, basket integration, clean render.
 *
 * Motion rule: NEVER use initial={{ opacity: 0 }} on elements visible above the fold.
 * Only AnimatePresence (image crossfade, lightbox overlay) and whileInView (below-fold grid).
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Share2, MessageCircle, X, ShoppingBag,
  ZoomIn, ChevronLeft, ChevronRight, Check,
} from 'lucide-react';
import { FIXTURE_PRODUCTS, FIXTURE_COLLECTIONS, FIXTURE_MERCHANT } from '@/lib/fixtures';
import { formatCurrencyFull } from '@/lib/utils/format';
import { buildChatToBuyLink, buildStoreContactLink } from '@/lib/utils/whatsapp';
import { m, AnimatePresence, staggerContainer, staggerChild, SPRING_UI } from '@/lib/motion';
import { useBasketStore } from '@/lib/store/basket.store';
import type { ProductVariant, CardStyle } from '@/lib/types';
import { usePaletteTheme } from '@/lib/hooks/usePaletteTheme';
import styles from './ItemDetailPage.module.css';
import '@/styles/cards.css';

// ─── Lightbox ─────────────────────────────────────────────────────────────

function Lightbox({
  images,
  current,
  onClose,
  onChange,
}: {
  images: string[];
  current: number;
  onClose: () => void;
  onChange: (i: number) => void;
}) {
  const touchStart = useRef<number | null>(null);
  const prev = () => onChange((current - 1 + images.length) % images.length);
  const next = () => onChange((current + 1) % images.length);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const onTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchStart.current = null;
  };

  return (
    /* Backdrop fades in — safe because it's inside AnimatePresence */
    <m.div
      className={styles.lightboxBackdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      onClick={onClose}
    >
      <button className={styles.lightboxClose} onClick={onClose} aria-label="Close">
        <X size={18} />
      </button>

      <m.div
        className={styles.lightboxImg}
        key={current}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1, transition: { duration: 0.22 } }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <img src={images[current]} alt={`Image ${current + 1}`} />
      </m.div>

      {images.length > 1 && (
        <>
          <button
            className={`${styles.lightboxNav} ${styles.lightboxNavPrev}`}
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Previous"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            className={`${styles.lightboxNav} ${styles.lightboxNavNext}`}
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Next"
          >
            <ChevronRight size={22} />
          </button>
          <div className={styles.lightboxDots}>
            {images.map((_, i) => (
              <button
                key={i}
                className={`${styles.lightboxDot} ${i === current ? styles.lightboxDotActive : ''}`}
                onClick={(e) => { e.stopPropagation(); onChange(i); }}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </m.div>
  );
}

// ─── Mini Card (below-fold "More" grid) ───────────────────────────────────

function MiniCard({
  product,
  handle,
  cardStyle,
}: {
  product: { id: string; name: string; price: number; images: string[]; status: string };
  handle: string;
  cardStyle: CardStyle;
}) {
  return (
    /* staggerChild is safe here — its parent grid uses whileInView so it's below the fold */
    <m.div variants={staggerChild}>
      <Link to={`/store/${handle}/item/${product.id}`} className={`sf-card sf-card-${cardStyle}`}>
        <div className="sf-card-image" style={{ aspectRatio: '1/1' }}>
          <img
            src={product.images[0] ?? `https://picsum.photos/seed/${product.id}/300/300`}
            alt={product.name}
            loading="lazy"
          />
          {product.status === 'sold_out' && (
            <span className="sf-card-status sf-card-status-sold">Sold</span>
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

// ─── Main ─────────────────────────────────────────────────────────────────

export default function ItemDetailPage() {
  const { handle, item_id } = useParams<{ handle: string; item_id: string }>();

  const product  = FIXTURE_PRODUCTS.find((p) => p.id === item_id);
  const merchant = FIXTURE_MERCHANT;
  const cfg      = merchant.store_config;
  const { paletteId, isDark } = usePaletteTheme(cfg.palette);

  const [selectedImage,    setSelectedImage]    = useState(0);
  const [lightboxOpen,     setLightboxOpen]      = useState(false);
  const [selectedVariants, setSelectedVariants]  = useState<Record<string, string>>({});

  const { add, remove, has } = useBasketStore();
  const inBasket = product ? has(product.id) : false;

  const touchStart = useRef<number | null>(null);

  const collection = useMemo(
    () => product ? FIXTURE_COLLECTIONS.find((c) => c.id === product.collection_id) : null,
    [product]
  );

  const relatedProducts = useMemo(
    () => FIXTURE_PRODUCTS.filter((p) => p.id !== item_id && p.status !== 'hidden').slice(0, 4),
    [item_id]
  );

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product?.name ?? '', url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
  };

  const selectVariant = (groupName: string, value: string) =>
    setSelectedVariants((prev) => ({ ...prev, [groupName]: value }));

  // Gallery swipe
  const onTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (!product || touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    const len  = images.length;
    if (Math.abs(diff) > 40) {
      setSelectedImage((i) => diff > 0 ? (i + 1) % len : (i - 1 + len) % len);
    }
    touchStart.current = null;
  };

  const handleBasketToggle = useCallback(() => {
    if (!product || isSoldOut) return;
    if (inBasket) {
      remove(product.id);
    } else {
      add({
        id:    product.id,
        name:  product.name,
        price: product.price,
        image: product.images[0] ?? `https://picsum.photos/seed/${product.id}/300/300`,
        variantLabel: Object.entries(selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ') || undefined,
      });
    }
  }, [product, inBasket, selectedVariants]);

  // ── Not found ────────────────────────────────────────────────────────────
  if (!product) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <p className={styles.notFoundTitle}>Item not found</p>
          <p className={styles.notFoundText}>This piece may have been removed or sold.</p>
          <Link to={`/store/${handle}`} className={styles.notFoundLink}>← Back to store</Link>
        </div>
      </div>
    );
  }

  const isSoldOut  = product.status === 'sold_out' || product.stock_level === 0;
  const isLowStock = !isSoldOut && product.stock_level === 1;

  const variantString = Object.entries(selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ');

  const whatsappBuyLink     = buildChatToBuyLink({
    phone: merchant.whatsapp, itemName: product.name, price: product.price,
    variantLabel: variantString || undefined, storeName: merchant.store_name,
  });
  const whatsappContactLink = buildStoreContactLink(merchant.whatsapp, merchant.store_name);

  const variantGroups = useMemo(() => {
    if (!product.variants?.length) return [];
    const map = new Map<string, ProductVariant[]>();
    product.variants.forEach((v) => {
      if (!map.has(v.label)) map.set(v.label, []);
      map.get(v.label)!.push(v);
    });
    return Array.from(map.entries()).map(([name, opts]) => ({ name, opts }));
  }, [product.variants]);

  const images = product.images.length > 0
    ? product.images
    : [`https://picsum.photos/seed/${product.id}/600/600`];

  return (
    <div className={`sf-themed ${styles.page}`} data-palette={paletteId} data-dark={isDark}>

      {/* ── Nav — plain div, always visible ── */}
      <nav className={styles.navBar}>
        <Link to={`/store/${handle ?? merchant.handle}`} className={styles.backBtn} aria-label="Back">
          <ArrowLeft size={16} />
        </Link>
        <Link to={`/store/${handle ?? merchant.handle}`} className={styles.navStoreName}>
          {merchant.store_name}
        </Link>
        <button className={styles.shareBtn} onClick={handleShare} aria-label="Share">
          <Share2 size={15} />
        </button>
      </nav>

      <div className={styles.layout}>

        {/* ── Gallery — plain div, always visible ── */}
        <div className={styles.gallery}>
          <div
            className={styles.mainImageWrap}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onClick={() => !isSoldOut && setLightboxOpen(true)}
          >
            {/* Image crossfade — inside AnimatePresence so opacity:0 initial is safe */}
            <AnimatePresence mode="wait">
              <m.img
                key={selectedImage}
                src={images[selectedImage]}
                alt={product.name}
                className={styles.mainImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.18 } }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
              />
            </AnimatePresence>

            {isSoldOut && (
              <div className={styles.statusOverlay}>
                <span className={styles.soldText}>Sold Out</span>
              </div>
            )}

            {!isSoldOut && (
              <button
                className={styles.zoomBtn}
                onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                aria-label="View full size"
              >
                <ZoomIn size={14} />
              </button>
            )}

            {images.length > 1 && (
              <div className={styles.galleryDots}>
                {images.map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.galleryDot} ${i === selectedImage ? styles.galleryDotActive : ''}`}
                    onClick={(e) => { e.stopPropagation(); setSelectedImage(i); }}
                    aria-label={`Image ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className={styles.thumbRow}>
              {images.map((img, i) => (
                <button
                  key={i}
                  className={`${styles.thumb} ${i === selectedImage ? styles.thumbActive : ''}`}
                  onClick={() => setSelectedImage(i)}
                  aria-label={`Image ${i + 1}`}
                >
                  <img src={img} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Product Info — plain div, always visible ── */}
        <div className={styles.info}>
          {collection && (
            <Link
              to={`/store/${handle ?? merchant.handle}/c/${collection.slug}`}
              className={styles.infoCollectionLink}
            >
              {collection.name}
            </Link>
          )}

          <h1 className={styles.itemName}>{product.name}</h1>

          <div className={styles.priceRow}>
            <span className={styles.price}>{formatCurrencyFull(product.price)}</span>
            {isSoldOut  && <span className={`${styles.stockBadge} ${styles.stockOut}`}>Sold out</span>}
            {isLowStock && <span className={`${styles.stockBadge} ${styles.stockLow}`}>Last one</span>}
            {product.claim_mode && !isSoldOut && (
              <span className={`${styles.stockBadge} ${styles.stockClaim}`}>Claim mode</span>
            )}
          </div>

          {product.description && (
            <p className={styles.description}>{product.description}</p>
          )}

          {/* Variants */}
          {variantGroups.map(({ name, opts }) => (
            <div key={name} className={styles.variantSection}>
              <p className={styles.variantLabel}>{name}</p>
              <div className={styles.variantGroup}>
                {opts.map((opt) => (
                  <button
                    key={opt.id}
                    className={`${styles.variantChip} ${
                      selectedVariants[name] === opt.label ? styles.variantChipActive : ''
                    } ${opt.stock_level === 0 ? styles.variantChipUnavailable : ''}`}
                    onClick={() => opt.stock_level > 0 && selectVariant(name, opt.label)}
                    disabled={opt.stock_level === 0}
                  >
                    {opt.label}
                    {opt.price_modifier !== 0 && <> (+{formatCurrencyFull(opt.price_modifier)})</>}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Actions */}
          <div className={styles.actions}>
            {isSoldOut ? (
              <span className={`${styles.actionBtn} ${styles.actionBtnDisabled}`}>Sold Out</span>
            ) : product.claim_mode ? (
              <a
                href={`/submit-receipt/${product.id}`}
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              >
                Claim This Piece
              </a>
            ) : (
              <a
                href={whatsappBuyLink}
                className={`${styles.actionBtn} ${styles.actionBtnWhatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={16} />
                Buy via WhatsApp
              </a>
            )}

            {!isSoldOut && (
              <button
                className={`${styles.actionBtn} ${inBasket ? styles.actionBtnBasketAdded : styles.actionBtnBasket}`}
                onClick={handleBasketToggle}
              >
                {inBasket
                  ? <><Check size={15} /> In Inquiry Basket</>
                  : <><ShoppingBag size={15} /> Add to Inquiry</>
                }
              </button>
            )}

            <a
              href={whatsappContactLink}
              className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ask a Question
            </a>
          </div>

          <div className={styles.divider} />

          {/* Meta */}
          <div className={styles.metaTable}>
            {product.type && (
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Type</span>
                <span className={styles.metaVal}>
                  {product.type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              </div>
            )}
            {collection && (
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Collection</span>
                <span className={styles.metaVal}>{collection.name}</span>
              </div>
            )}
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>Seller</span>
              <span className={styles.metaVal}>{merchant.store_name}</span>
            </div>
            {product.tags?.length > 0 && (
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Tags</span>
                <span className={styles.metaVal}>{product.tags.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

      </div>{/* end .layout */}

      {/* ── More from Archive — below fold, whileInView stagger is safe ── */}
      {relatedProducts.length > 0 && (
        <div className={`${styles.moreSection} card-${cfg.card_style}`}>
          <p className={styles.moreSectionTitle}>More from the Archive</p>
          <m.div
            className={styles.moreGrid}
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-60px' }}
          >
            {relatedProducts.map((p) => (
              <MiniCard
                key={p.id}
                product={p}
                handle={handle ?? merchant.handle}
                cardStyle={cfg.card_style}
              />
            ))}
          </m.div>
        </div>
      )}

      {/* ── Image Lightbox — AnimatePresence, safe ── */}
      <AnimatePresence>
        {lightboxOpen && (
          <Lightbox
            images={images}
            current={selectedImage}
            onClose={() => setLightboxOpen(false)}
            onChange={setSelectedImage}
          />
        )}
      </AnimatePresence>

    </div>
  );
}