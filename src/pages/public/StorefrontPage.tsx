/**
 * Trove'a — StorefrontPage (Phase 1E Upgrade)
 * The definitive public storefront: cinematic hero, palette-injected theming,
 * inquiry basket, staggered animations, deep card styles, closed interstitial.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MessageCircle, Instagram, ShoppingBag, X, Trash2, Moon, Send } from 'lucide-react';
import { FIXTURE_MERCHANT, FIXTURE_PRODUCTS, FIXTURE_COLLECTIONS } from '@/lib/fixtures';
import { SIGNATURES } from '@/lib/constants/signatures';
import { formatCurrencyFull, formatLastActive, truncate } from '@/lib/utils/format';
import { buildStoreContactLink } from '@/lib/utils/whatsapp';
import { m, AnimatePresence, staggerContainer, staggerChild, slideUp, SPRING_UI } from '@/lib/motion';
import { usePaletteTheme } from '@/lib/hooks/usePaletteTheme';
import { useBasketStore, buildBasketWhatsApp } from '@/lib/store/basket.store';
import type { Product, StoreLayout, CardStyle } from '@/lib/types';
import sfStyles from './StorefrontPage.module.css';
import '@/styles/cards.css';


// ─── Layout → CSS class map ──────────────────────────────────────────────

const GRID_CLASS: Record<StoreLayout, string> = {
  'grid-dense': sfStyles.gridDense,
  'grid-airy':  sfStyles.gridAiry,
  'editorial':  sfStyles.gridEditorial,
  'masonry':    sfStyles.gridMasonry,
  'minimal':    sfStyles.gridMinimal,
};

// ─── Product Card (animated + basket-aware) ───────────────────────────────

interface ProductCardProps {
  product: Product;
  handle: string;
  cardStyle: CardStyle;
}

function ProductCard({ product, handle, cardStyle }: ProductCardProps) {
  const { add, remove, has } = useBasketStore();
  const inBasket = has(product.id);
  const isSoldOut = product.status === 'sold_out' || product.stock_level === 0;
  const isLowStock = !isSoldOut && product.stock_level === 1;
  const isClaim    = product.claim_mode;

  const handleBasket = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSoldOut) return;
    inBasket
      ? remove(product.id)
      : add({
          id:    product.id,
          name:  product.name,
          price: product.price,
          image: product.images[0] ?? `https://picsum.photos/seed/${product.id}/300/300`,
        });
  };

  return (
    <m.div variants={staggerChild} layout>
      <Link
        to={`/store/${handle}/item/${product.id}`}
        className={`sf-card sf-card-${cardStyle}`}
        aria-label={product.name}
      >
        <div className="sf-card-image">
          <img
            src={product.images[0] ?? `https://picsum.photos/seed/${product.id}/400/500`}
            alt={product.name}
            loading="lazy"
          />
          {isSoldOut && <span className="sf-card-status sf-card-status-sold">Sold out</span>}
          {isClaim && !isSoldOut && <span className="sf-card-status sf-card-status-claim">Claim</span>}
          {isLowStock && !isClaim && <span className="sf-card-status sf-card-status-low">Last one</span>}

          {!isSoldOut && (
            <button
              className={`sf-card-basket-btn ${inBasket ? 'sf-card-basket-btn-active' : ''}`}
              onClick={handleBasket}
              aria-label={inBasket ? 'Remove from inquiry' : 'Add to inquiry'}
            >
              <ShoppingBag size={13} />
            </button>
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

// ─── Inquiry Basket Drawer ────────────────────────────────────────────────

function InquiryBasket({ merchant }: { merchant: typeof FIXTURE_MERCHANT }) {
  const { items, isOpen, close, remove, clear } = useBasketStore();

  const whatsappLink = useMemo(
    () => items.length > 0
      ? buildBasketWhatsApp(merchant.whatsapp, items, merchant.store_name)
      : '#',
    [items, merchant]
  );

  const total = items.reduce((s, i) => s + i.price, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <m.div
            className={sfStyles.basketBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <m.div
            className={sfStyles.basketDrawer}
            initial={{ y: '100%' }}
            animate={{ y: 0, transition: SPRING_UI }}
            exit={{ y: '100%', transition: { duration: 0.25, ease: [0.4,0,1,1] as any } }}
            role="dialog"
            aria-label="Inquiry basket"
          >
            <div className={sfStyles.basketHandle} />
            <div className={sfStyles.basketHeader}>
              <p className={sfStyles.basketTitle}>Your Inquiry</p>
              <button className={sfStyles.basketClose} onClick={close} aria-label="Close basket">
                <X size={16} />
              </button>
            </div>

            {items.length === 0 ? (
              <div className={sfStyles.basketEmpty}>
                <ShoppingBag size={32} className={sfStyles.basketEmptyIcon} />
                <p className={sfStyles.basketEmptyTitle}>Nothing added yet</p>
                <p className={sfStyles.basketEmptyText}>
                  Tap the bag icon on any item to add it to your inquiry.
                </p>
              </div>
            ) : (
              <>
                <div className={sfStyles.basketItems}>
                  {items.map((item) => (
                    <m.div
                      key={item.id}
                      className={sfStyles.basketItem}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <img src={item.image} alt={item.name} className={sfStyles.basketItemImg} />
                      <div className={sfStyles.basketItemInfo}>
                        <p className={sfStyles.basketItemName}>{item.name}</p>
                        {item.variantLabel && (
                          <p className={sfStyles.basketItemVariant}>{item.variantLabel}</p>
                        )}
                        <p className={sfStyles.basketItemPrice}>
                          {formatCurrencyFull(item.price)}
                        </p>
                      </div>
                      <button
                        className={sfStyles.basketItemRemove}
                        onClick={() => remove(item.id)}
                        aria-label={`Remove ${item.name}`}
                      >
                        <X size={13} />
                      </button>
                    </m.div>
                  ))}
                </div>

                <div className={sfStyles.basketFooter}>
                  <div className={sfStyles.basketTotal}>
                    <span className={sfStyles.basketTotalLabel}>Total</span>
                    <span className={sfStyles.basketTotalValue}>
                      {formatCurrencyFull(total)}
                    </span>
                  </div>
                  <a
                    href={whatsappLink}
                    className={sfStyles.basketCta}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={close}
                  >
                    <Send size={14} />
                    Send Inquiry on WhatsApp
                  </a>
                  <button className={sfStyles.basketClear} onClick={clear}>
                    <Trash2 size={12} />
                    Clear all
                  </button>
                </div>
              </>
            )}
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Floating Basket FAB ──────────────────────────────────────────────────

function BasketFab({ isDark }: { isDark: boolean }) {
  const { items, toggle } = useBasketStore();
  const count = items.length;

  return (
    <AnimatePresence>
      {count > 0 && (
        <m.button
          className={`${sfStyles.basketFab} ${isDark ? sfStyles.basketFabDark : ''}`}
          onClick={toggle}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, transition: { ...SPRING_UI, delay: 0.1 } }}
          exit={{ scale: 0, opacity: 0 }}
          aria-label={`Open inquiry basket — ${count} item${count > 1 ? 's' : ''}`}
          whileTap={{ scale: 0.94 }}
        >
          <ShoppingBag size={18} />
          <span className={sfStyles.basketFabBadge}>{count}</span>
          <span className={sfStyles.basketFabLabel}>Inquire</span>
        </m.button>
      )}
    </AnimatePresence>
  );
}

// ─── Closed Store Interstitial ────────────────────────────────────────────

function ClosedInterstitial({ merchant }: { merchant: typeof FIXTURE_MERCHANT }) {
  const wLink = buildStoreContactLink(merchant.whatsapp, merchant.store_name);
  return (
    <m.div className={sfStyles.closedInterstitial} {...slideUp}>
      <div className={sfStyles.closedMoon}>
        <Moon size={36} strokeWidth={1.2} />
      </div>
      <h1 className={sfStyles.closedTitle}>{merchant.store_name}</h1>
      <p className={sfStyles.closedSub}>We're currently closed.</p>
      <p className={sfStyles.closedText}>
        New pieces are being curated. Leave a message and we'll reach out when we reopen.
      </p>
      <a href={wLink} className={sfStyles.closedCta} target="_blank" rel="noopener noreferrer">
        <MessageCircle size={14} />
        Notify me on WhatsApp
      </a>
      <p className={sfStyles.closedPowered}>
        Powered by{' '}
        <Link to="/auth" className={sfStyles.closedPoweredLink}>Trove'a</Link>
      </p>
    </m.div>
  );
}

// ─── Cinematic Hero ───────────────────────────────────────────────────────

function StoreHero({
  merchant,
  signature,
}: {
  merchant: typeof FIXTURE_MERCHANT;
  signature: { id: string; tagline: string; label: string } | undefined;
}) {
  const cfg    = merchant.store_config;
  const hasImg = !!cfg.hero_image_url;
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = parallaxRef.current;
    if (!el || !hasImg) return;
    const handleScroll = () => {
      el.style.transform = `translateY(${window.scrollY * 0.28}px)`;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasImg]);

  const liveCount = FIXTURE_PRODUCTS.filter((p) => p.status !== 'hidden').length;

  return (
    <div className={sfStyles.heroSection} data-has-image={hasImg}>
      <div className={sfStyles.heroBgAtmo} />

      {hasImg && (
        <div className={sfStyles.heroImgWrap}>
          <div ref={parallaxRef} className={sfStyles.heroImgInner}>
            <img src={cfg.hero_image_url!} alt="Store hero" className={sfStyles.heroImg} />
          </div>
        </div>
      )}

      <div className={sfStyles.heroOverlay} />

      <m.div
        className={sfStyles.heroContent}
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        <m.p variants={staggerChild} className={sfStyles.heroEyebrow}>
          @{merchant.handle}
        </m.p>
        <m.h1 variants={staggerChild} className={sfStyles.heroName}>
          {merchant.store_name}
        </m.h1>
        {signature && (
          <m.p variants={staggerChild} className={sfStyles.heroTagline}>
            {signature.tagline}
          </m.p>
        )}
        {merchant.bio && (
          <m.p variants={staggerChild} className={sfStyles.heroBio}>
            {truncate(merchant.bio, 110)}
          </m.p>
        )}

        <m.div variants={staggerChild} className={sfStyles.heroTrust}>
          <span className={sfStyles.heroTrustChip}>
            <span className={`${sfStyles.trustDot} ${merchant.store_open ? sfStyles.trustDotOpen : sfStyles.trustDotClosed}`} />
            {merchant.store_open ? 'Open' : 'Closed'}
          </span>
          <span className={sfStyles.heroTrustSep}>·</span>
          <span className={sfStyles.heroTrustChip}>{liveCount} pieces</span>
          {formatLastActive(merchant.last_active_at) && (
            <>
              <span className={sfStyles.heroTrustSep}>·</span>
              <span className={sfStyles.heroTrustChip}>{formatLastActive(merchant.last_active_at)}</span>
            </>
          )}
        </m.div>

        {merchant.social_links.instagram && (
          <m.div variants={staggerChild} className={sfStyles.heroSocials}>
            <a
              href={`https://instagram.com/${merchant.social_links.instagram}`}
              className={sfStyles.heroSocialLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram size={12} />
              @{merchant.social_links.instagram}
            </a>
          </m.div>
        )}
      </m.div>

      <div className={sfStyles.heroScrollCue}>
        <div className={sfStyles.heroScrollLine} />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function StorefrontPage() {
  const { handle } = useParams<{ handle: string }>();
  const [activeCollection, setActiveCollection] = useState<string | null>(null);

  const merchant   = FIXTURE_MERCHANT;
  const { store_config: cfg } = merchant;
  const layout     = cfg.layout;
  const cardStyle  = cfg.card_style;
  const { paletteId, isDark } = usePaletteTheme(cfg.palette);
  const signature  = SIGNATURES.find((s) => s.id === cfg.signature);

  const liveProducts = useMemo(
    () => FIXTURE_PRODUCTS.filter((p) => p.status !== 'hidden'),
    []
  );

  const displayProducts = useMemo(() => {
    if (!activeCollection) return liveProducts;
    return liveProducts.filter((p) => p.collection_id === activeCollection);
  }, [liveProducts, activeCollection]);

  const featuredProducts = useMemo(
    () =>
      cfg.featured_item_ids
        .map((id) => FIXTURE_PRODUCTS.find((p) => p.id === id))
        .filter((p): p is Product => !!p),
    [cfg.featured_item_ids]
  );

  const whatsappLink = buildStoreContactLink(merchant.whatsapp, merchant.store_name);
  const gridClass    = GRID_CLASS[layout];

  // Closed interstitial
  if (!merchant.store_open) {
    return (
      <div
        className={`sf-themed ${sfStyles.storefront}`}
        data-layout={layout}
        data-palette={paletteId}
        data-dark={isDark}
      >
        <ClosedInterstitial merchant={merchant} />
      </div>
    );
  }

  return (
    <div
      className={`sf-themed ${sfStyles.storefront}`}
      data-layout={layout}
      data-palette={paletteId}
      data-dark={isDark}
    >
      {/* ── Cinematic Hero ── */}
      <StoreHero merchant={merchant} signature={signature} />

      {/* ── Collection Nav ── */}
      {FIXTURE_COLLECTIONS.length > 0 && (
        <m.nav
          className={sfStyles.collectionNav}
          aria-label="Collections"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.35, duration: 0.4 } }}
        >
          <button
            className={`${sfStyles.collectionNavItem} ${!activeCollection ? sfStyles.collectionNavItemActive : ''}`}
            onClick={() => setActiveCollection(null)}
          >
            All
          </button>
          {FIXTURE_COLLECTIONS.map((col) => (
            <button
              key={col.id}
              className={`${sfStyles.collectionNavItem} ${activeCollection === col.id ? sfStyles.collectionNavItemActive : ''}`}
              onClick={() => setActiveCollection(col.id)}
            >
              <span className={sfStyles.collectionDot} style={{ background: col.color_accent }} />
              {col.name}
            </button>
          ))}
        </m.nav>
      )}

      {/* ── Featured ── */}
      {cfg.section_states['section-featured'] && featuredProducts.length > 0 && !activeCollection && (
        <section className={sfStyles.featuredSection}>
          <p className={sfStyles.sectionTitle}>Featured</p>
          <m.div
            className={`${sfStyles.featuredGrid} card-${cardStyle}`}
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} handle={handle ?? merchant.handle} cardStyle={cardStyle} />
            ))}
          </m.div>
        </section>
      )}

      {/* ── About ── */}
      {cfg.section_states['section-about'] && cfg.about_text && !activeCollection && (
        <m.section
          className={sfStyles.aboutSection}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6 }}
        >
          <div className={sfStyles.aboutDivider} />
          <p className={sfStyles.aboutText}>{cfg.about_text}</p>
        </m.section>
      )}

      {/* ── Main Product Grid ── */}
      <section className={sfStyles.gridSection}>
        <m.div
          className={sfStyles.gridSectionHeader}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '0px' }}
          transition={{ duration: 0.4 }}
        >
          <h2 className={sfStyles.gridSectionTitle}>
            {activeCollection
              ? FIXTURE_COLLECTIONS.find((c) => c.id === activeCollection)?.name ?? 'Collection'
              : 'All Items'}
          </h2>
          <span className={sfStyles.productCount}>
            {displayProducts.length} item{displayProducts.length !== 1 ? 's' : ''}
          </span>
        </m.div>

        {displayProducts.length === 0 ? (
          <div className={sfStyles.emptyState}>
            <p className={sfStyles.emptyTitle}>Nothing here yet</p>
            <p className={sfStyles.emptyText}>New pieces dropping soon.</p>
          </div>
        ) : (
          <m.div
            className={`${gridClass} card-${cardStyle}`}
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {displayProducts.map((p) => (
              <ProductCard key={p.id} product={p} handle={handle ?? merchant.handle} cardStyle={cardStyle} />
            ))}
          </m.div>
        )}
      </section>

      {/* ── Contact CTA ── */}
      <m.section
        className={sfStyles.contactSection}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.6 }}
      >
        <div className={sfStyles.contactInner}>
          <h2 className={sfStyles.contactTitle}>Questions? Slide in.</h2>
          <p className={sfStyles.contactSubtitle}>
            Every piece is sold with care. DM or message to inquire, hold, or order.
          </p>
          <a
            href={whatsappLink}
            className={sfStyles.whatsappCta}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={16} />
            Chat on WhatsApp
          </a>
        </div>
      </m.section>

      {/* Footer */}
      <footer className={sfStyles.footer}>
        <span className={sfStyles.footerBrand}>@{merchant.handle}</span>
        <span className={sfStyles.footerBrand}>
          Powered by{' '}
          <Link to="/auth" className={sfStyles.footerBrandLink}>Trove'a</Link>
        </span>
      </footer>

      {/* ── Floating Basket FAB ── */}
      <BasketFab isDark={isDark} />

      {/* ── Inquiry Basket Drawer ── */}
      <InquiryBasket merchant={merchant} />
    </div>
  );
}