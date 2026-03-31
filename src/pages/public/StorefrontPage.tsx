/**
 * Trove'a — StorefrontPage (Phase 2N: Trust Layer)
 * Verification badges, pause enforcement, store reporting.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MessageCircle, Instagram, ShoppingBag, X, Trash2, Moon, Send, AlertTriangle } from 'lucide-react';
import {
  FIXTURE_MERCHANT, FIXTURE_PRODUCTS, FIXTURE_COLLECTIONS,
  FIXTURE_WINDOWS, FIXTURE_BOOKINGS, FIXTURE_HOLDS,
} from '@/lib/fixtures';
import { SIGNATURES } from '@/lib/constants/signatures';
import { formatCurrencyFull, formatLastActive, formatDate, truncate } from '@/lib/utils/format';
import { buildStoreContactLink } from '@/lib/utils/whatsapp';
import { m, AnimatePresence, staggerContainer, staggerChild, slideUp, SPRING_UI } from '@/lib/motion';
import { usePaletteTheme } from '@/lib/hooks/usePaletteTheme';
import { useBasketStore, buildBasketWhatsApp } from '@/lib/store/basket.store';
import type { Product, StoreLayout, CardStyle, AvailabilityWindow } from '@/lib/types';
import type { HoldRequest } from '@/lib/types/store-config.types';
import PopupModal from '@/components/primitives/PopupModal/PopupModal';
import sfStyles from './StorefrontPage.module.css';
import '@/styles/cards.css';


// ─── Layout → CSS class map ──────────────────────────────────────────────────

const GRID_CLASS: Record<StoreLayout, string> = {
  'grid-dense': sfStyles.gridDense,
  'grid-airy':  sfStyles.gridAiry,
  'editorial':  sfStyles.gridEditorial,
  'masonry':    sfStyles.gridMasonry,
  'minimal':    sfStyles.gridMinimal,
};

// ─── Report categories ───────────────────────────────────────────────────────

const REPORT_REASONS = [
  'Counterfeit or fake items',
  'Misleading product descriptions',
  'Suspicious payment requests',
  'Store doesn\'t respond',
  'Inappropriate content',
  'Other',
] as const;

// ─── Urgency signal (pure function) ──────────────────────────────────────────

function getUrgencySignal(
  product: Product,
  storeType: string,
  openWindow: AvailabilityWindow | null,
  weekSlotCount: number,
): string | null {
  if (product.status === 'sold_out' || product.stock_level === 0) return null;
  if (product.stock_level !== null && product.stock_level > 1 && product.stock_level <= 3) {
    return `Only ${product.stock_level} left`;
  }
  if (product.stock_level !== null && product.stock_level > 3 && product.stock_level <= 8) {
    return 'Selling fast';
  }
  if (storeType === 'vendor' && openWindow) {
    const hoursLeft = Math.ceil(
      (new Date(openWindow.closes_at).getTime() - Date.now()) / 3_600_000,
    );
    if (hoursLeft > 0 && hoursLeft <= 48) return `Closes in ${hoursLeft}h`;
  }
  if (storeType === 'host' && weekSlotCount > 0) {
    return `${weekSlotCount} slots this week`;
  }
  return null;
}

// ─── Product Card ─────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
  handle: string;
  cardStyle: CardStyle;
  bagEligible: boolean;
  urgencySignal: string | null;
  isOnHold: boolean;
  isPaused: boolean;
}

function ProductCard({
  product, handle, cardStyle, bagEligible, urgencySignal, isOnHold, isPaused,
}: ProductCardProps) {
  const { add, remove, has } = useBasketStore();
  const inBasket = has(product.id);
  const isSoldOut = product.status === 'sold_out' || product.stock_level === 0;
  const isLowStock = !isSoldOut && product.stock_level === 1;
  const isClaim    = product.claim_mode;

  const handleBasket = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSoldOut || isPaused) return;
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
          {isOnHold && !isSoldOut && (
            <span className={sfStyles.onHoldBadge}>On Hold</span>
          )}

          {bagEligible && urgencySignal && !isSoldOut && !isLowStock && !isOnHold && (
            <div className={`${sfStyles.urgencyBadge} ${sfStyles.urgencyBadgeAmber}`}>
              {urgencySignal}
            </div>
          )}

          {/* Bag button — hidden when store is paused */}
          {!isSoldOut && bagEligible && !isPaused && (
            <button
              className={`${sfStyles.addToBagBtn} ${inBasket ? sfStyles.addToBagAdded : ''}`}
              onClick={handleBasket}
              aria-label={inBasket ? 'Remove from bag' : 'Add to bag'}
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

// ─── Inquiry Basket Drawer ────────────────────────────────────────────────────

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
              <p className={sfStyles.basketTitle}>Your Bag</p>
              <button className={sfStyles.basketClose} onClick={close} aria-label="Close basket">
                <X size={16} />
              </button>
            </div>

            {items.length === 0 ? (
              <div className={sfStyles.basketEmpty}>
                <ShoppingBag size={32} className={sfStyles.basketEmptyIcon} />
                <p className={sfStyles.basketEmptyTitle}>Nothing added yet</p>
                <p className={sfStyles.basketEmptyText}>
                  Tap the bag icon on any item to add it.
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

// ─── Sticky Bag Bar ───────────────────────────────────────────────────────────

function StickyBag({ isPaused }: { isPaused: boolean }) {
  const { items, toggle } = useBasketStore();
  const count = items.length;
  const total = items.reduce((s, i) => s + i.price, 0);

  if (count === 0 || isPaused) return null;

  return (
    <div className={sfStyles.stickyBag}>
      <div className={sfStyles.stickyBagLeft}>
        <span className={sfStyles.stickyBagCount}>
          {count} item{count !== 1 ? 's' : ''}
        </span>
        <span className={sfStyles.stickyBagTotal}>{formatCurrencyFull(total)}</span>
      </div>
      <button className={sfStyles.stickyBagCta} onClick={toggle}>
        View Bag
      </button>
    </div>
  );
}

// ─── Closed Store Interstitial ────────────────────────────────────────────────

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

// ─── Cinematic Hero ───────────────────────────────────────────────────────────

function StoreHero({
  merchant,
  signature,
}: {
  merchant: typeof FIXTURE_MERCHANT;
  signature: { id: string; tagline: string } | undefined;
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

  const tier = merchant.verification_tier;
  const showBadge = tier !== 'unverified';

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
          {showBadge && (
            <>
              <span className={sfStyles.heroTrustSep}>·</span>
              <span className={`badge-verified ${tier === 'trusted' ? 'badge-trusted' : ''}`}>
                {tier === 'trusted' ? '★ Trusted' : '✓ Verified'}
              </span>
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

// ─── Report Modal ─────────────────────────────────────────────────────────────

function ReportModal({
  open,
  onClose,
  storeName,
}: {
  open: boolean;
  onClose: () => void;
  storeName: string;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setReason(null);
      setDetails('');
      setError('');
      setSubmitted(false);
    }, 300);
  }, [onClose]);

  const handleSubmit = () => {
    if (!reason) {
      setError('Please select a reason.');
      return;
    }
    setSubmitted(true);
  };

  return (
    <PopupModal
      open={open}
      onClose={handleClose}
      title={submitted ? undefined : `Report this store`}
    >
      {submitted ? (
        <div className={sfStyles.reportConfirm}>
          <div className={sfStyles.reportConfirmIcon}>✓</div>
          <p className={sfStyles.reportConfirmTitle}>Report submitted</p>
          <p className={sfStyles.reportConfirmBody}>
            Thank you. Our team will review this store.
          </p>
          <button className={sfStyles.reportSubmitBtn} onClick={handleClose}>
            Close
          </button>
        </div>
      ) : (
        <div className={sfStyles.reportBody}>
          <p className={sfStyles.reportSubtitle}>
            Why are you reporting {storeName}?
          </p>

          <div className={sfStyles.reportReasons} role="radiogroup" aria-label="Report reason">
            {REPORT_REASONS.map((r) => (
              <label key={r} className={sfStyles.reportReasonLabel}>
                <input
                  type="radio"
                  name="report-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => { setReason(r); setError(''); }}
                  className={sfStyles.reportRadio}
                />
                <span className={sfStyles.reportReasonText}>{r}</span>
              </label>
            ))}
          </div>

          {error && <p className={sfStyles.reportError}>{error}</p>}

          <div className={sfStyles.reportDetailsField}>
            <label className={sfStyles.reportDetailsLabel} htmlFor="report-details">
              Additional details <span className={sfStyles.reportOptional}>(optional)</span>
            </label>
            <textarea
              id="report-details"
              className={sfStyles.reportTextarea}
              placeholder="Please describe what you experienced"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
            />
          </div>

          <div className={sfStyles.reportActions}>
            <button className={sfStyles.reportCancelBtn} onClick={handleClose}>
              Cancel
            </button>
            <m.button
              className={sfStyles.reportSubmitBtn}
              onClick={handleSubmit}
              whileTap={{ scale: 0.97 }}
            >
              Submit Report
            </m.button>
          </div>
        </div>
      )}
    </PopupModal>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function StorefrontPage() {
  const { handle } = useParams<{ handle: string }>();
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [holds] = useState<HoldRequest[]>(FIXTURE_HOLDS);
  const [reportOpen, setReportOpen] = useState(false);
  const [devPaused, setDevPaused] = useState(false);

  const merchant   = FIXTURE_MERCHANT;
  const { store_config: cfg } = merchant;
  const layout     = cfg.layout;
  const cardStyle  = cfg.card_style;
  const { paletteId, isDark } = usePaletteTheme(cfg.palette);
  const signature  = SIGNATURES.find((s) => s.id === cfg.signature);

  const storeType   = merchant.store_type;
  const bagEligible = ['collector', 'vendor', 'digital_creator'].includes(storeType);
  const isPaused    = devPaused || merchant.is_paused;

  const openWindow = useMemo<AvailabilityWindow | null>(() => {
    if (storeType !== 'vendor') return null;
    return FIXTURE_WINDOWS.find(
      (w) => w.merchant_id === merchant.id && w.status === 'open',
    ) ?? null;
  }, [storeType, merchant.id]);

  const weekSlotCount = useMemo(() => {
    if (storeType !== 'host') return 0;
    const now     = Date.now();
    const weekEnd = now + 7 * 24 * 3_600_000;
    return FIXTURE_BOOKINGS.filter(
      (b) =>
        b.merchant_id === merchant.id &&
        new Date(b.scheduled_at).getTime() > now &&
        new Date(b.scheduled_at).getTime() <= weekEnd &&
        b.status !== 'cancelled',
    ).length;
  }, [storeType, merchant.id]);

  const isOnHold = useCallback(
    (productId: string) =>
      holds.some((h) => h.product_id === productId && h.status === 'active'),
    [holds],
  );

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

      {/* ── Pause Banner ── */}
      {isPaused && (
        <div className={sfStyles.pauseBanner}>
          <AlertTriangle size={14} className={sfStyles.pauseBannerIcon} />
          <span>
            {merchant.pause_message ?? 'This store is currently paused — browsing only, ordering is unavailable.'}
            {merchant.pause_return_date && ` Back ${formatDate(merchant.pause_return_date, 'short')}.`}
          </span>
        </div>
      )}

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
              <ProductCard
                key={p.id}
                product={p}
                handle={handle ?? merchant.handle}
                cardStyle={cardStyle}
                bagEligible={bagEligible}
                urgencySignal={getUrgencySignal(p, storeType, openWindow, weekSlotCount)}
                isOnHold={isOnHold(p.id)}
                isPaused={isPaused}
              />
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
              <ProductCard
                key={p.id}
                product={p}
                handle={handle ?? merchant.handle}
                cardStyle={cardStyle}
                bagEligible={bagEligible}
                urgencySignal={getUrgencySignal(p, storeType, openWindow, weekSlotCount)}
                isOnHold={isOnHold(p.id)}
                isPaused={isPaused}
              />
            ))}
          </m.div>
        )}
      </section>

      {/* ── Contact CTA — WhatsApp always active, even during pause ── */}
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
        <button
          className={sfStyles.reportLink}
          onClick={() => setReportOpen(true)}
        >
          Report this store
        </button>
      </footer>

      {/* ── Sticky Bag Bar (bag-eligible, not paused) ── */}
      {bagEligible && <StickyBag isPaused={isPaused} />}

      {/* ── Inquiry Basket Drawer ── */}
      <InquiryBasket merchant={merchant} />

      {/* ── Report Modal ── */}
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        storeName={merchant.store_name}
      />

      {/* ── Dev Pause Toggle (DEV only) ── */}
      {import.meta.env.DEV && (
        <div className={sfStyles.devPauseToggle}>
          <button
            onClick={() => setDevPaused((p) => !p)}
            className={sfStyles.devPauseBtn}
          >
            DEV: {devPaused ? 'Store PAUSED' : 'Store ACTIVE'}
          </button>
        </div>
      )}
    </div>
  );
}
