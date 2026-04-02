/**
 * Trove'a — StorefrontPage (Phase 2N: Trust Layer)
 * Verification badges, pause enforcement, store reporting.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MessageCircle, Instagram, ShoppingBag, X, Trash2, Moon, Send, AlertTriangle,
  ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle
} from 'lucide-react';
import {
  FIXTURE_MERCHANT, FIXTURE_PRODUCTS, FIXTURE_COLLECTIONS,
  FIXTURE_WINDOWS, FIXTURE_BOOKINGS, FIXTURE_HOLDS, FIXTURE_DROPS,
  FIXTURE_HOST_MERCHANT, FIXTURE_HOST_PRODUCTS,
  FIXTURE_DIGITAL_MERCHANT, FIXTURE_DIGITAL_PRODUCTS,
  FIXTURE_STUDIO_MERCHANT, FIXTURE_STUDIO_PRODUCTS,
} from '@/lib/fixtures';
import { SIGNATURES } from '@/lib/constants/signatures';
import { formatCurrencyFull, formatLastActive, formatDate, truncate } from '@/lib/utils/format';
import { buildStoreContactLink } from '@/lib/utils/whatsapp';
import { m, AnimatePresence, staggerContainer, staggerChild, slideUp, SPRING_UI } from '@/lib/motion';
import { usePaletteTheme } from '@/lib/hooks/usePaletteTheme';
import { useBasketStore, buildBasketWhatsApp } from '@/lib/store/basket.store';
import { useUIStore } from '@/lib/store/ui.store';
import type { Product, StoreLayout, CardStyle, AvailabilityWindow, Merchant, Drop } from '@/lib/types';
import type { HoldRequest } from '@/lib/types/store-config.types';
import PopupModal from '@/components/primitives/PopupModal/PopupModal';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
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

// ─── Urgency & Stock Badges (pure functions) ──────────────────────────────

const getStockBadge = (product: Product): { text: string; type: 'sold_out' | 'low' | 'last' | null } => {
  if (product.status === 'sold_out' || product.stock_level === 0)
    return { text: 'Sold Out', type: 'sold_out' };
  if (product.stock_level === 1)
    return { text: 'Last one', type: 'last' };
  if (product.stock_level !== null && product.stock_level <= 3)
    return { text: `${product.stock_level} left`, type: 'low' };
  return { text: '', type: null };
};

function getUrgencySignal(
  product: Product,
  storeType: string,
  openWindow: AvailabilityWindow | null,
  weekSlotCount: number,
): string | null {
  if (product.status === 'sold_out' || product.stock_level === 0) return null;
  const badge = getStockBadge(product);
  if (badge.type === 'low' || badge.type === 'last') return null; // Let the badge handle these

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

// ─── Host Helpers ───────────────────────────────────────────────────────────

const getNextAvailableDate = (merchantId: string): string | null => {
  const workingDays = [2, 3, 4, 5, 6]; // Tue–Sat
  const today = new Date();
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (!workingDays.includes(d.getDay())) continue;
    const dateStr = d.toISOString().split('T')[0];
    const bookedCount = FIXTURE_BOOKINGS.filter(b => {
      const bDate = b.scheduled_at.split('T')[0];
      return b.merchant_id === merchantId && bDate === dateStr && b.status !== 'cancelled';
    }).length;
    if (bookedCount < 4) return d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return null;
};

const getAvailableDays = (merchantId: string): Set<string> => {
  const workingDays = [2, 3, 4, 5, 6];
  const available = new Set<string>();
  const today = new Date();
  for (let i = 1; i <= 42; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (!workingDays.includes(d.getDay())) continue;
    const dateStr = d.toISOString().split('T')[0];
    const bookedCount = FIXTURE_BOOKINGS.filter(b => {
      const bDate = b.scheduled_at.split('T')[0];
      return b.merchant_id === merchantId && bDate === dateStr && b.status !== 'cancelled';
    }).length;
    if (bookedCount < 4) available.add(dateStr);
  }
  return available;
};

// ─── Digital Helpers ────────────────────────────────────────────────────────

const getFileTypeBadge = (product: Product): string | null => {
  if (!product.delivery_url && !product.name) return null;
  const url = product.delivery_url?.toLowerCase() ?? '';
  const name = product.name.toLowerCase();
  if (url.includes('.zip') || name.includes('kit') || name.includes('pack')) return 'ZIP';
  if (url.includes('.pdf') || name.includes('guide') || name.includes('ebook')) return 'PDF';
  if (url.includes('.lrtemplate') || name.includes('lightroom') || name.includes('preset')) return 'LRTEMPLATE';
  if (url.includes('.aep') || name.includes('after effects')) return 'AEP';
  if (name.includes('notion') || name.includes('template')) return 'NOTION';
  return 'DIGITAL';
};

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
  const badge = getStockBadge(product);
  const isSoldOut = badge.type === 'sold_out';
  const isClaim    = product.claim_mode;

  const handleBasket = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSoldOut || isPaused) return;
    if (inBasket) {
      remove(product.id);
    } else {
      add({
        id:    product.id,
        name:  product.name,
        price: product.price,
        image: product.images[0] ?? `https://picsum.photos/seed/${product.id}/300/300`,
      });
    }
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
          {badge.type === 'sold_out' && <span className="sf-card-status sf-card-status-sold">Sold out</span>}
          {isClaim && !isSoldOut && <span className="sf-card-status sf-card-status-claim">Claim</span>}
          {badge.type === 'last' && !isClaim && <span className="sf-card-status sf-card-status-last">Last one</span>}
          {badge.type === 'low' && !isClaim && <span className="sf-card-status sf-card-status-low">{badge.text}</span>}
          {isOnHold && !isSoldOut && (
            <span className={sfStyles.onHoldBadge}>On Hold</span>
          )}

          {bagEligible && urgencySignal && !isSoldOut && badge.type === null && !isOnHold && (
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
            exit={{ y: '100%', transition: { duration: 0.25, ease: [0.4, 0, 1, 1] } }}
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
  products,
}: {
  merchant: typeof FIXTURE_MERCHANT;
  signature: { id: string; tagline: string } | undefined;
  products: Product[];
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

  const liveCount = products.filter((p) => p.status !== 'hidden').length;

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

// ─── Drop Countdown (Collector) ─────────────────────────────────────────────

interface DropCountdownProps {
  drop: Drop;
  onLive: () => void;
}

function DropCountdown({ drop, onLive }: DropCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  const [email, setEmail] = useState('');
  const [onList, setOnList] = useState(false);
  const { addToast } = useUIStore();

  useEffect(() => {
    const target = new Date(drop.scheduled_at).getTime();

    const update = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(null);
        onLive();
        return;
      }

      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [drop.scheduled_at, onLive]);

  if (!timeLeft) return null;

  return (
    <section className={sfStyles.dropSection}>
      <h2 className={sfStyles.dropLabel}>{drop.label}</h2>
      <div className={sfStyles.countdown}>
        <div className={sfStyles.countdownBlock}>
          <span className={sfStyles.countdownNum}>{String(timeLeft.d).padStart(2, '0')}</span>
          <span className={sfStyles.countdownUnit}>days</span>
        </div>
        <div className={sfStyles.countdownBlock}>
          <span className={sfStyles.countdownNum}>{String(timeLeft.h).padStart(2, '0')}</span>
          <span className={sfStyles.countdownUnit}>hrs</span>
        </div>
        <div className={sfStyles.countdownBlock}>
          <span className={sfStyles.countdownNum}>{String(timeLeft.m).padStart(2, '0')}</span>
          <span className={sfStyles.countdownUnit}>min</span>
        </div>
        <div className={sfStyles.countdownBlock}>
          <span className={sfStyles.countdownNum}>{String(timeLeft.s).padStart(2, '0')}</span>
          <span className={sfStyles.countdownUnit}>sec</span>
        </div>
      </div>

      <div className={sfStyles.notifyForm}>
        {onList ? (
          <p className={sfStyles.onListMessage}>✓ You're on the list</p>
        ) : (
          <>
            <input
              type="email"
              placeholder="Email address"
              className={sfStyles.notifyInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              className={sfStyles.notifyBtn}
              onClick={() => {
                if (email) {
                  setOnList(true);
                  addToast("You're on the list");
                }
              }}
            >
              Notify me
            </button>
          </>
        )}
      </div>
    </section>
  );
}

// ─── Window Status & Menu (Vendor) ───────────────────────────────────────────

function WindowStatusBanner({
  activeWindow,
  nextWindow,
  dormantMessage,
}: {
  activeWindow: AvailabilityWindow | null;
  nextWindow: AvailabilityWindow | null;
  dormantMessage?: string | null;
}) {
  const state: 'open' | 'closed' | 'dormant' =
    activeWindow ? 'open' : nextWindow ? 'closed' : 'dormant';

  const statusClass =
    state === 'open' ? sfStyles.windowOpen :
    state === 'closed' ? sfStyles.windowClosed :
    sfStyles.windowDormant;

  return (
    <div className={`${sfStyles.windowBanner} ${statusClass}`}>
      <span className={sfStyles.windowStatus}>
        ● {state.toUpperCase()}
      </span>
      {state === 'open' && activeWindow && (
        <p className={sfStyles.windowSub}>
          Closes {formatDate(activeWindow.closes_at, 'relative')}
        </p>
      )}
      {state === 'closed' && nextWindow && (
        <>
          <p className={sfStyles.windowSub}>
            Next window: {formatDate(nextWindow.opens_at, 'long')}
          </p>
          <p className={sfStyles.windowMessage}>Place your pre-order when we open</p>
        </>
      )}
      {state === 'dormant' && (
        <>
          <p className={sfStyles.windowMessage}>
            {dormantMessage ?? 'No window scheduled'}
          </p>
          <p className={sfStyles.windowSub}>Follow us for updates</p>
        </>
      )}
    </div>
  );
}

function MenuDisplay({
  products,
  merchant,
}: {
  products: Product[];
  merchant: Merchant;
}) {
  const categories = useMemo(() => {
    const map: Record<string, Product[]> = {};
    products.forEach((p) => {
      const cat = p.category || 'General';
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return map;
  }, [products]);

  const whatsappLink = buildStoreContactLink(merchant.whatsapp, merchant.store_name);

  return (
    <div className={sfStyles.menuDisplay}>
      {Object.entries(categories).map(([cat, items]) => (
        <div key={cat} className={sfStyles.menuCategory}>
          <h3 className={sfStyles.menuCategoryLabel}>
            {cat} ({items.length})
          </h3>
          <div className={sfStyles.menuItems}>
            {items.map((item) => (
              <div key={item.id} className={sfStyles.menuItem}>
                <div className={sfStyles.menuItemMain}>
                  <p className={sfStyles.menuItemName}>{item.name}</p>
                  {item.description && (
                    <p className={sfStyles.menuItemDesc}>
                      {truncate(item.description, 60)}
                    </p>
                  )}
                  <p className={sfStyles.menuItemPrice}>
                    {formatCurrencyFull(item.price)}
                  </p>
                </div>
                <div className={sfStyles.menuItemActions}>
                  {item.stock_level !== null && (
                    <span className={sfStyles.menuItemCap}>
                      [{item.stock_level} left]
                    </span>
                  )}
                  <a
                    href={whatsappLink}
                    className={sfStyles.menuItemCta}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Pre-order
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Lightbox Component ─────────────────────────────────────────────────────

function Lightbox({ 
  images, 
  index, 
  onClose, 
  onPrev, 
  onNext,
  captions
}: { 
  images: string[]; 
  index: number; 
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  captions?: string[];
}) {
  return (
    <m.div 
      className={sfStyles.lightbox}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <button className={sfStyles.lightboxClose} onClick={onClose}><X size={24} /></button>
      <div className={sfStyles.lightboxContent} onClick={e => e.stopPropagation()}>
        <m.img 
          key={index}
          src={images[index]} 
          className={sfStyles.lightboxImage} 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        />
        {captions?.[index] && <p className={sfStyles.lightboxCaption}>{captions[index]}</p>}
      </div>
      {images.length > 1 && (
        <div className={sfStyles.lightboxNav}>
          <button onClick={onPrev}><ChevronLeft size={32} /></button>
          <button onClick={onNext}><ChevronRight size={32} /></button>
        </div>
      )}
    </m.div>
  );
}

// ─── Portfolio Gallery ───────────────────────────────────────────────────────

function PortfolioGallery({ 
  images, 
  captions,
  groups 
}: { 
  images: string[]; 
  captions?: string[];
  groups?: { label: string; range: [number, number] }[];
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (idx: number) => setLightboxIndex(idx);
  const closeLightbox = () => setLightboxIndex(null);
  const next = () => setLightboxIndex(i => (i! + 1) % images.length);
  const prev = () => setLightboxIndex(i => (i! - 1 + images.length) % images.length);

  return (
    <section className={sfStyles.portfolioSection}>
      <h2 className={sfStyles.sectionTitle}>Portfolio</h2>
      
      {groups ? (
        <div className={sfStyles.portfolioGroups}>
          {groups.map((group) => (
            <div key={group.label} className={sfStyles.portfolioGroup}>
              <h3 className={sfStyles.portfolioGroupLabel}>{group.label}</h3>
              <div className={sfStyles.portfolioGrid}>
                {images.slice(group.range[0], group.range[1]).map((img, i) => {
                  const actualIdx = group.range[0] + i;
                  return (
                    <div 
                      key={actualIdx} 
                      className={sfStyles.portfolioImageWrap}
                      onClick={() => openLightbox(actualIdx)}
                    >
                      <img src={img} alt="" loading="lazy" className={sfStyles.portfolioImage} />
                      {captions?.[actualIdx] && <p className={sfStyles.portfolioCaption}>{captions[actualIdx]}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={sfStyles.portfolioGrid}>
          {images.map((img, i) => (
            <div 
              key={i} 
              className={sfStyles.portfolioImageWrap}
              onClick={() => openLightbox(i)}
            >
              <img src={img} alt="" loading="lazy" className={sfStyles.portfolioImage} />
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox 
            images={images} 
            index={lightboxIndex} 
            onClose={closeLightbox} 
            onNext={next} 
            onPrev={prev}
            captions={captions}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

// ─── Calendar Preview (Host) ────────────────────────────────────────────────

function CalendarPreview({ merchantId, handle }: { merchantId: string, handle: string }) {
  const availableDays = useMemo(() => getAvailableDays(merchantId), [merchantId]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const todayStr = new Date().toISOString().split('T')[0];

  const days = useMemo(() => {
    const arr = [];
    const start = new Date();
    for (let i = 1; i <= 35; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  const bookedSlots = useMemo(() => {
    if (!selectedDay) return [];
    return FIXTURE_BOOKINGS
      .filter(b => b.merchant_id === merchantId && b.scheduled_at.startsWith(selectedDay) && b.status !== 'cancelled')
      .map(b => new Date(b.scheduled_at).getHours());
  }, [selectedDay, merchantId]);

  const timeSlots = [9, 11, 13, 15];

  return (
    <section className={sfStyles.calendarSection}>
      <h2 className={sfStyles.sectionTitle}>Availability</h2>
      <div className={sfStyles.calendar}>
        <div className={sfStyles.calendarHeader}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <span key={d}>{d}</span>)}
        </div>
        <div className={sfStyles.calendarGrid}>
          {days.map(d => {
            const dateStr = d.toISOString().split('T')[0];
            const isAvailable = availableDays.has(dateStr);
            const isToday = dateStr === todayStr;
            return (
              <div 
                key={dateStr} 
                className={`${sfStyles.calendarDay} ${isAvailable ? sfStyles.calendarDayAvailable : ''} ${isToday ? sfStyles.calendarToday : ''}`}
                onClick={() => isAvailable && setSelectedDay(dateStr)}
              >
                <span className={sfStyles.calendarDayNum}>{d.getDate()}</span>
                {isAvailable && <span className={sfStyles.calendarDot} />}
              </div>
            );
          })}
        </div>
      </div>

      <BaseDrawer open={!!selectedDay} onClose={() => setSelectedDay(null)} title={selectedDay ? formatDate(selectedDay, 'long') : ''}>
        <div className={sfStyles.slotDrawer}>
          <p className={sfStyles.slotDrawerInfo}>Select a time to proceed with booking.</p>
          <div className={sfStyles.slotList}>
            {timeSlots.map(h => {
              const isBooked = bookedSlots.includes(h);
              return (
                <div key={h} className={sfStyles.slotItem}>
                  <span className={sfStyles.slotTime}>{h > 12 ? `${h-12}pm` : `${h}am`}</span>
                  {isBooked ? (
                    <span className={sfStyles.slotStatusBooked}>● Booked</span>
                  ) : (
                    <Link to={`/store/${handle}/book`} className={sfStyles.slotBookBtn}>Book →</Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </BaseDrawer>
    </section>
  );
}

// ─── Enquiry Form (Studio) ──────────────────────────────────────────────────

function EnquiryForm({ storeName, responseTime }: { storeName: string, responseTime: number }) {
  const [form, setForm] = useState({ client_name: '', company: '', project_type: '', budget_range: '', timeline: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.client_name) newErrors.client_name = 'Required';
    if (!form.project_type) newErrors.project_type = 'Required';
    if (!form.budget_range) newErrors.budget_range = 'Required';
    if (!form.message) newErrors.message = 'Required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section className={sfStyles.enquiryConfirmation}>
        <div className={sfStyles.enquiryConfirmContent}>
          <CheckCircle size={48} className={sfStyles.enquiryConfirmIcon} />
          <h2 className={sfStyles.enquiryConfirmTitle}>Thank you, {form.client_name}.</h2>
          <p className={sfStyles.enquiryConfirmText}>Your enquiry has been received.</p>
          <p className={sfStyles.enquiryConfirmSub}>{storeName} usually responds within {responseTime} hours.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={sfStyles.enquiryForm} id="enquiry-form">
      <h2 className={sfStyles.enquiryHeading}>Work with {storeName}</h2>
      <form onSubmit={handleSubmit}>
        <div className={sfStyles.enquiryField}>
          <label>Client Name *</label>
          <input type="text" value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} className={errors.client_name ? sfStyles.inputError : ''} />
        </div>
        <div className={sfStyles.enquiryField}>
          <label>Company / Brand (Optional)</label>
          <input type="text" value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
        </div>
        <div className={sfStyles.enquiryField}>
          <label>Project Type *</label>
          <select value={form.project_type} onChange={e => setForm({...form, project_type: e.target.value})} className={errors.project_type ? sfStyles.inputError : ''}>
            <option value="">Select type</option>
            {['Brand Photography', 'Product Photography', 'Event Coverage', 'Headshots', 'Fashion', 'Content Creation', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className={sfStyles.enquiryField}>
          <label>Budget Range *</label>
          <select value={form.budget_range} onChange={e => setForm({...form, budget_range: e.target.value})} className={errors.budget_range ? sfStyles.inputError : ''}>
            <option value="">Select range</option>
            {['Under ₦100k', '₦100k–₦200k', '₦200k–₦500k', '₦500k–₦1m', 'Over ₦1m', 'Open'].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className={sfStyles.enquiryField}>
          <label>Timeline *</label>
          <select value={form.timeline} onChange={e => setForm({...form, timeline: e.target.value})}>
            <option value="">Select timeline</option>
            {['Within 2 weeks', 'Within 1 month', 'Within 3 months', 'Flexible'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className={sfStyles.enquiryField}>
          <label>Message *</label>
          <textarea rows={4} value={form.message} onChange={e => setForm({...form, message: e.target.value})} className={errors.message ? sfStyles.inputError : ''}></textarea>
        </div>
        <button type="submit" className={sfStyles.enquirySubmit}>Send Enquiry</button>
      </form>
    </section>
  );
}

function DigitalProductCard({
  product, handle, cardStyle
}: {
  product: Product; handle: string; cardStyle: CardStyle;
}) {
  const fileType = getFileTypeBadge(product);
  const isFree = product.is_free;
  const [expanded, setExpanded] = useState(false);

  return (
    <m.div variants={staggerChild} layout className={sfStyles.digitalCard}>
      <Link to={`/store/${handle}/item/${product.id}`} className={`sf-card sf-card-${cardStyle}`}>
        <div className="sf-card-image">
          <img src={product.images[0] ?? `https://picsum.photos/seed/${product.id}/400/500`} alt={product.name} loading="lazy" />
          {fileType && <span className={sfStyles.fileTypeBadge}>{fileType}</span>}
          {isFree && <span className={sfStyles.freeBadge}>FREE</span>}
        </div>
        <div className="sf-card-body">
          <p className="sf-card-name">{product.name}</p>
          <p className="sf-card-price">{isFree ? 'Free' : formatCurrencyFull(product.price)}</p>
        </div>
      </Link>
      
      {product.product_type === 'digital' && product.scope_description && (
        <div className={sfStyles.bundleToggle}>
          <button onClick={() => setExpanded(!expanded)} className={sfStyles.bundleBtn}>
            {expanded ? '▼' : '▶'} What's included
          </button>
          <AnimatePresence>
            {expanded && (
              <m.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className={sfStyles.bundleList}
              >
                {product.scope_description.split('\n').map((line, i) => (
                  <p key={i}>• {line}</p>
                ))}
              </m.div>
            )}
          </AnimatePresence>
        </div>
      )}
      
      <div className={sfStyles.digitalActions}>
        <Link 
          to={`/store/${handle}/item/${product.id}`} 
          className={sfStyles.digitalCta}
        >
          {isFree ? 'Get Free' : product.early_access_price ? `Early Access: ${formatCurrencyFull(product.early_access_price)}` : 'Buy Now'}
        </Link>
      </div>
    </m.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function StorefrontPage() {
  const { handle } = useParams<{ handle: string }>();
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [holds] = useState<HoldRequest[]>(FIXTURE_HOLDS);
  const [reportOpen, setReportOpen] = useState(false);
  const [devPaused, setDevPaused] = useState(false);

  // Derive merchant and products based on handle
  const { merchant, products } = useMemo(() => {
    if (handle === 'chisombeauty') return { merchant: FIXTURE_HOST_MERCHANT, products: FIXTURE_HOST_PRODUCTS };
    if (handle === 'femicreates') return { merchant: FIXTURE_DIGITAL_MERCHANT, products: FIXTURE_DIGITAL_PRODUCTS };
    if (handle === 'ngozistudio') return { merchant: FIXTURE_STUDIO_MERCHANT, products: FIXTURE_STUDIO_PRODUCTS };
    return { merchant: FIXTURE_MERCHANT, products: FIXTURE_PRODUCTS };
  }, [handle]);

  const { store_config: cfg } = merchant;
  const layout     = cfg.layout;
  const cardStyle  = cfg.card_style;
  const { paletteId, isDark } = usePaletteTheme(cfg.palette);
  const signature  = SIGNATURES.find((s) => s.id === cfg.signature);

  const storeType   = merchant.store_type;
  const bagEligible = ['collector', 'vendor', 'digital_creator'].includes(storeType);
  const isPaused    = devPaused || merchant.is_paused;

  // ─── Collector: Drop Logic ───
  const activeDrop = useMemo(() => {
    if (storeType !== 'collector') return null;
    return FIXTURE_DROPS.find(
      d => d.merchant_id === merchant.id &&
      (d.status === 'scheduled' || d.status === 'live')
    ) ?? null;
  }, [storeType, merchant.id]);

  const [dropState, setDropState] = useState<'pre' | 'live' | 'post' | 'none'>('none');

  useEffect(() => {
    if (!activeDrop) {
      setDropState('none');
      return;
    }
    if (activeDrop.status === 'completed') {
      setDropState('post');
      return;
    }
    const isLive = Date.now() >= new Date(activeDrop.scheduled_at).getTime();
    setDropState(isLive ? 'live' : 'pre');
  }, [activeDrop]);

  // ─── Vendor: Window Logic ───
  const activeWindow = useMemo<AvailabilityWindow | null>(() => {
    if (storeType !== 'vendor') return null;
    return FIXTURE_WINDOWS.find(
      (w) => w.merchant_id === merchant.id && w.status === 'open',
    ) ?? null;
  }, [storeType, merchant.id]);

  const nextWindow = useMemo(() => {
    if (storeType !== 'vendor') return null;
    return FIXTURE_WINDOWS
      .filter(w => w.merchant_id === merchant.id && w.status === 'upcoming')
      .sort((a, b) => new Date(a.opens_at).getTime() - new Date(b.opens_at).getTime())[0] ?? null;
  }, [storeType, merchant.id]);

  const windowState = useMemo(() => {
    if (activeWindow) return 'open';
    if (nextWindow) return 'closed';
    return 'dormant';
  }, [activeWindow, nextWindow]);

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

  const nextAvailableDate = useMemo(() => {
    if (storeType !== 'host') return null;
    return getNextAvailableDate(merchant.id);
  }, [storeType, merchant.id]);

  const isOnHold = useCallback(
    (productId: string) =>
      holds.some((h) => h.product_id === productId && h.status === 'active'),
    [holds],
  );

  const liveProducts = useMemo(
    () => products.filter((p) => p.status !== 'hidden'),
    [products]
  );

  const displayProducts = useMemo(() => {
    if (!activeCollection) return liveProducts;
    return liveProducts.filter((p) => p.collection_id === activeCollection);
  }, [liveProducts, activeCollection]);

  const featuredProducts = useMemo(
    () =>
      cfg.featured_item_ids
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => !!p),
    [cfg.featured_item_ids, products]
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
      {/* ── 1. Store Header (Hero) ── */}
      <StoreHero merchant={merchant} signature={signature} products={products} />

      {/* ── Specialized Header Signals (Host / Studio) ── */}
      {(storeType === 'host' || storeType === 'studio') && (
        <div className={sfStyles.headerSignalRow}>
          {storeType === 'host' && (
            <div className={sfStyles.availabilitySignal}>
              <Calendar size={12} />
              {nextAvailableDate ? `Next available: ${nextAvailableDate}` : 'Fully booked — check back soon'}
            </div>
          )}
          {storeType === 'studio' && merchant.response_time_hours && (
            <div className={sfStyles.responseTimeSignal}>
              <Clock size={12} />
              Usually responds within {merchant.response_time_hours} hours
            </div>
          )}
        </div>
      )}

      {/* ── 2. Hero Banner (Optional - handled by StoreHero if image exists) ── */}

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

      {/* ── Host: Sticky Book Now CTA ── */}
      {storeType === 'host' && (
        <div className={sfStyles.bookNowSticky}>
          <button 
            onClick={() => document.getElementById('service-menu')?.scrollIntoView({ behavior: 'smooth' })}
            className={sfStyles.bookNowBtn}
          >
            Book Now
          </button>
        </div>
      )}

      {/* ── TYPE-SPECIFIC SECTIONS ── */}

      {/* ── COLLECTOR FLOW ── */}
      {storeType === 'collector' && (
        <>
          {/* Drop Countdown */}
          {dropState === 'pre' && activeDrop && (
            <DropCountdown drop={activeDrop} onLive={() => setDropState('live')} />
          )}
          {dropState === 'live' && activeDrop && (
            <div className={sfStyles.dropLiveBanner}>
              <span className={sfStyles.pulseDot} />
              <span>Drop {activeDrop.id.split('-').pop()} — {activeDrop.label} is live</span>
            </div>
          )}

          {/* Collection Nav */}
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

          {/* Featured Items */}
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
                    urgencySignal={getUrgencySignal(p, storeType, activeWindow, weekSlotCount)}
                    isOnHold={isOnHold(p.id)}
                    isPaused={isPaused}
                  />
                ))}
              </m.div>
            </section>
          )}

          {/* Product Grid */}
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
                    urgencySignal={getUrgencySignal(p, storeType, activeWindow, weekSlotCount)}
                    isOnHold={isOnHold(p.id)}
                    isPaused={isPaused}
                  />
                ))}
              </m.div>
            )}
          </section>
        </>
      )}

      {/* ── VENDOR FLOW ── */}
      {storeType === 'vendor' && (
        <>
          <WindowStatusBanner
            activeWindow={activeWindow}
            nextWindow={nextWindow}
            dormantMessage={merchant.store_config.store_type_config.dormant_message}
          />
          {windowState === 'open' && (
            <MenuDisplay products={liveProducts} merchant={merchant} />
          )}
        </>
      )}

      {/* ── HOST FLOW ── */}
      {storeType === 'host' && (
        <>
          {/* Service Menu */}
          <section className={sfStyles.serviceMenu} id="service-menu">
            <h2 className={sfStyles.sectionTitle}>Services</h2>
            <div className={sfStyles.serviceGrid}>
              {liveProducts.map(p => (
                <div key={p.id} className={sfStyles.serviceCard}>
                  <h3 className={sfStyles.serviceName}>{p.name}</h3>
                  <div className={sfStyles.serviceMeta}>
                    {p.duration && <span>{p.duration} min</span>}
                    {p.duration && <span> · </span>}
                    <span>{formatCurrencyFull(p.price)}</span>
                    {p.deposit_required && <span> · </span>}
                    {p.deposit_required && <span>{formatCurrencyFull(p.deposit_amount || 0)} deposit required</span>}
                  </div>
                  <Link to={`/store/${handle}/book`} className={sfStyles.serviceBookBtn}>
                    Book a Slot →
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* Calendar Preview */}
          <CalendarPreview merchantId={merchant.id} handle={handle || merchant.handle} />

          {/* Portfolio Gallery */}
          {merchant.portfolio_images.length > 0 && (
            <PortfolioGallery images={merchant.portfolio_images} />
          )}
        </>
      )}

      {/* ── DIGITAL CREATOR FLOW ── */}
      {storeType === 'digital_creator' && (
        <>
          {/* Featured Items */}
          {featuredProducts.length > 0 && (
            <section className={sfStyles.featuredSection}>
              <p className={sfStyles.sectionTitle}>Featured Tools</p>
              <div className={sfStyles.digitalCatalogue}>
                {featuredProducts.map(p => (
                  <DigitalProductCard key={p.id} product={p} handle={handle || merchant.handle} cardStyle={cardStyle} />
                ))}
              </div>
            </section>
          )}

          {/* Digital Catalogue */}
          <section className={sfStyles.gridSection}>
            <h2 className={sfStyles.gridSectionTitle}>Digital Catalogue</h2>
            <div className={sfStyles.digitalCatalogue}>
              {liveProducts.map(p => (
                <DigitalProductCard key={p.id} product={p} handle={handle || merchant.handle} cardStyle={cardStyle} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* ── STUDIO FLOW ── */}
      {storeType === 'studio' && (
        <>
          {/* Portfolio Gallery */}
          {merchant.portfolio_images.length > 0 && (
            <PortfolioGallery 
              images={merchant.portfolio_images} 
              captions={[
                'Editorial shoot for Vogue NG', 'Street style in Lagos Island', 'Product minimalism for skincare',
                'Brand identity for tech startup', 'Fashion lookbook: Summer 24', 'Lakeside serenity',
                'Architecture of Yaba', 'Portrait of a creator'
              ]}
              groups={[
                { label: 'Fashion & Lookbook', range: [0, 3] },
                { label: 'Brand Photography', range: [3, 6] },
                { label: 'Product Photography', range: [6, 8] }
              ]}
            />
          )}

          {/* Service Packages */}
          <section className={sfStyles.packageSection}>
            <h2 className={sfStyles.sectionTitle}>Service Packages</h2>
            <div className={sfStyles.packageGrid}>
              {liveProducts.filter(p => p.product_type === 'package').map(p => (
                <div key={p.id} className={sfStyles.packageCard}>
                  <h3 className={sfStyles.packageName}>{p.name}</h3>
                  <div className={sfStyles.packageMeta}>
                    {p.price_type === 'custom' ? 'Custom Quote' : `From ${formatCurrencyFull(p.price)}`}
                    {p.deposit_pct && ` · ${p.deposit_pct}% deposit`}
                    {p.timeline_estimate && ` · ${p.timeline_estimate}`}
                  </div>
                  {p.scope_description && <p className={sfStyles.packageScope}>{p.scope_description}</p>}
                  {p.deliverables && (
                    <div className={sfStyles.packageDeliverables}>
                      <strong>Deliverables:</strong>
                      <p>{p.deliverables}</p>
                    </div>
                  )}
                  <div className={sfStyles.packageCta}>
                    <button 
                      onClick={() => document.getElementById('enquiry-form')?.scrollIntoView({ behavior: 'smooth' })}
                      className={sfStyles.enquireBtn}
                    >
                      Enquire →
                    </button>
                    <Link to={`/store/${handle}/book`} className={sfStyles.bookCallBtn}>
                      Book a Call →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Enquiry Form */}
          <EnquiryForm storeName={merchant.store_name} responseTime={merchant.response_time_hours} />
        </>
      )}

      {/* ── COMMON SECTIONS (About & Contact) ── */}

      {/* About */}
      {cfg.section_states['section-about'] && cfg.about_text && !activeCollection && (
        <m.section
          className={sfStyles.aboutSection}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6 }}
        >
          {storeType === 'studio' && cfg.store_type_config.client_logos_enabled && (
            <div className={sfStyles.clientLogosStrip}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={sfStyles.clientLogoTile}>Client Logo</div>
              ))}
            </div>
          )}
          <div className={sfStyles.aboutDivider} />
          <p className={sfStyles.aboutText}>
            {truncate(cfg.about_text, storeType === 'studio' ? 300 : 200)}
          </p>
        </m.section>
      )}

      {/* Contact Strip */}
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
