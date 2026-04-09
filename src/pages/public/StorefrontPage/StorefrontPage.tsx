/**
 * Trove'a — StorefrontPage (Phase 3 Revision)
 * Refined buyer flows for all store types.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  MessageCircle, Instagram, ShoppingBag, X, Trash2, Moon, Send, AlertTriangle,
  Clock, CheckCircle, Plus, Check, Mail, Calendar
} from 'lucide-react';
import {
  FIXTURE_MERCHANT, FIXTURE_PRODUCTS, FIXTURE_COLLECTIONS,
  FIXTURE_WINDOWS, FIXTURE_BOOKINGS, FIXTURE_DROPS,
  FIXTURE_HOST_MERCHANT, FIXTURE_HOST_PRODUCTS,
  FIXTURE_DIGITAL_MERCHANT, FIXTURE_DIGITAL_PRODUCTS,
  FIXTURE_STUDIO_MERCHANT, FIXTURE_STUDIO_PRODUCTS,
  FIXTURE_VENDOR_MERCHANT, FIXTURE_VENDOR_PRODUCTS,
} from '@/lib/fixtures';
import { SIGNATURES } from '@/lib/constants/signatures';
import { formatCurrencyFull, formatLastActive, formatDate, truncate } from '@/lib/utils/format';
import { 
  buildStoreContactLink, 
  buildVendorNotifyLink 
} from '@/lib/utils/whatsapp';
import { getNextAvailableDate, getAvailableDays, isSlotAvailable, WORKING_HOURS } from '@/lib/utils/host';
import {
  m, AnimatePresence, staggerContainer, staggerChild, slideUp, SPRING_UI,
  useScroll, useTransform
} from '@/lib/motion';
import { usePaletteTheme } from '@/lib/hooks/usePaletteTheme';
import { 
  useBasketStore, buildBasketWhatsApp, buildVendorPreOrderWhatsApp 
} from '@/lib/store/basket.store';
import { useHoldStore } from '@/lib/store/hold.store';
import { useUIStore } from '@/lib/store/ui.store';
import type { Product, StoreLayout, CardStyle, AvailabilityWindow, Merchant, Drop, HoldRequest } from '@/lib/types';
import PopupModal from '@/components/primitives/PopupModal/PopupModal';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import BookingRequestSheet from '@/components/public/BookingRequestSheet';
import MiniCard from '@/components/public/MiniCard/MiniCard';
import DigitalCartCheckoutDrawer from '@/components/public/DigitalCartCheckoutDrawer/DigitalCartCheckoutDrawer';
import { StorefrontSkeleton } from '@/components/public/Skeletons';
import { getMerchantByHandle } from '@/lib/api/merchants.api';
import { getProductsByMerchant, getCollectionsByMerchant } from '@/lib/api/products.api';
import sfStyles from './StorefrontPage.module.css';
import '@/styles/cards.css';
import '@/styles/storefront-shapes.css';
import '@/styles/storefront-motion.css';


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

// ─── Host Helpers (moved to lib/utils/host.ts) ──────────────────────────────

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
  merchantId: string;
  cardStyle: CardStyle;
  bagEligible: boolean;
  urgencySignal: string | null;
  isOnHold: boolean;
  isClaimed: boolean;
  isPaused: boolean;
  dropState?: 'none' | 'pre' | 'live' | 'post';
}

function ProductCard({
  product, handle, merchantId, cardStyle, bagEligible, urgencySignal, isOnHold, isClaimed, isPaused, dropState,
}: ProductCardProps) {
  const { add, has } = useBasketStore();
  const inBasket = has(product.id);
  const badge = getStockBadge(product);
  const isSoldOut = badge.type === 'sold_out';
  const isClaim    = product.claim_mode;
  const isLocked   = dropState === 'pre';

  const handleBasket = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSoldOut || isPaused || isLocked || isOnHold || isClaimed) return;
    add({
      id:    product.id,
      name:  product.name,
      price: product.price,
      image: product.images[0] ?? `https://picsum.photos/seed/${product.id}/300/300`,
    }, merchantId);
  };

  return (
    <m.div variants={staggerChild}>
      <Link
        to={`/store/${handle}/item/${product.id}`}
        className={`sf-card sf-card-${cardStyle} ${isLocked ? sfStyles.cardLocked : ''}`}
        aria-label={product.name}
      >
        <div className="sf-card-image">
          <img
            src={product.images[0] ?? `https://picsum.photos/seed/${product.id}/400/500`}
            alt={product.name}
            loading="lazy"
          />
          {badge.type === 'sold_out' && <span className="sf-card-status sf-card-status-sold">Sold out</span>}
          {isClaim && !isSoldOut && !isClaimed && <span className="sf-card-status sf-card-status-claim">Claim</span>}
          {isClaimed && !isSoldOut && <span className="sf-card-status sf-card-status-sold">Reserved</span>}
          {badge.type === 'last' && !isClaim && !isClaimed && <span className="sf-card-status sf-card-status-last">Last one</span>}
          {badge.type === 'low' && !isClaim && !isClaimed && <span className="sf-card-status sf-card-status-low">{badge.text}</span>}
          {isOnHold && !isSoldOut && !isClaimed && (
            <span className={sfStyles.onHoldBadge}>On Hold</span>
          )}

          {bagEligible && urgencySignal && !isSoldOut && !isClaimed && badge.type === null && !isOnHold && (
            <div className={`${sfStyles.urgencyBadge} ${sfStyles.urgencyBadgeAmber}`}>
              {urgencySignal}
            </div>
          )}

          {/* Bag button — hidden when store is paused */}
          {!isSoldOut && !isClaimed && !isOnHold && bagEligible && !isPaused && (
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
          <h3 className="sf-card-name">{product.name}</h3>
          <p className="sf-card-price">{formatCurrencyFull(product.price)}</p>
        </div>
      </Link>
    </m.div>
  );
}

// ─── Inquiry Basket Drawer ────────────────────────────────────────────────────

function InquiryBasket({ 
  merchant, 
  onOpenDigitalCheckout 
}: { 
  merchant: Merchant;
  onOpenDigitalCheckout: () => void;
}) {
  const { 
    items, isOpen, close, remove, clear,
    fulfillmentType, deliveryAddress 
  } = useBasketStore();

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const isAllFree = total === 0 && items.length > 0;

  const whatsappLink = useMemo(() => {
    if (items.length === 0) return '#';
    // Use bundled pre-order link if it's a vendor
    if (merchant.store_type === 'vendor') {
      return buildVendorPreOrderWhatsApp(merchant.whatsapp, items, merchant.store_name, fulfillmentType, deliveryAddress);
    }
    return buildBasketWhatsApp(merchant.whatsapp, items, merchant.store_name, fulfillmentType, deliveryAddress);
  }, [items, merchant, fulfillmentType, deliveryAddress]);

  const isDigital = merchant.store_type === 'digital_creator';

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
                          {item.price === 0 ? 'FREE' : formatCurrencyFull(item.price)}
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

                  {isDigital ? (
                    <button
                      className={sfStyles.basketCta}
                      onClick={() => {
                        close();
                        onOpenDigitalCheckout();
                      }}
                    >
                      <Mail size={14} />
                      {isAllFree ? 'Get Free Files →' : 'Buy All →'}
                    </button>
                  ) : (
                    <a
                      href={whatsappLink}
                      className={sfStyles.basketCta}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={close}
                    >
                      <Send size={14} />
                      {merchant.store_type === 'vendor' ? 'Send Pre-order' : 'Send Inquiry on WhatsApp'}
                    </a>
                  )}

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
  const { items, toggle, total } = useBasketStore();
  const count = items.length;
  const totalVal = total();

  if (count === 0 || isPaused) return null;

  return (
    <div className={sfStyles.stickyBag}>
      <div className={sfStyles.stickyBagLeft}>
        <span className={sfStyles.stickyBagCount}>
          {count} item{count !== 1 ? 's' : ''}
        </span>
        <span className={sfStyles.stickyBagTotal}>{formatCurrencyFull(totalVal)}</span>
      </div>
      <button className={sfStyles.stickyBagCta} onClick={toggle}>
        View Bag
      </button>
    </div>
  );
}

// ─── Closed Store Interstitial ────────────────────────────────────────────────

function ClosedInterstitial({ merchant }: { merchant: Merchant }) {
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
  merchant: Merchant;
  signature: { id: string; tagline: string } | undefined;
  products: Product[];
}) {
  const cfg    = merchant.store_config;
  const hasImg = !!cfg.hero_image_url;
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 160]);

  const liveCount = products.filter((p) => p.status !== 'hidden').length;

  const tier = merchant.verification_tier;
  const showBadge = tier !== 'unverified';

  return (
    <div className={sfStyles.heroSection} data-has-image={hasImg}>
      <div className={sfStyles.heroBgAtmo} />

      {hasImg && (
        <div className={sfStyles.heroImgWrap}>
          <m.div style={{ y }} className={sfStyles.heroImgInner}>
            <img src={cfg.hero_image_url!} alt="Store hero" className={sfStyles.heroImg} />
          </m.div>
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
              <Instagram size={14} />
              <span>@{merchant.social_links.instagram}</span>
            </a>
          </m.div>
        )}
      </m.div>
    </div>
  );
}

function NotifyMeForm({ 
  merchant, 
  context = 'drop',
  label = 'Be the first to know when we open.'
}: { 
  merchant: Merchant; 
  context?: 'drop' | 'window' | 'waitlist';
  label?: string;
}) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { addToast } = useUIStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setSubmitted(true);
    addToast("You're on the list.", 'success');

    const msgs = {
      drop: `Hi ${merchant.store_name}! Please notify me about your next drop. My email is ${email} 🔔`,
      window: `Hi ${merchant.store_name}! Please add me to your notification list for new windows. My email is ${email} 🙏`,
      waitlist: `Hi ${merchant.store_name}! I'd like to join the waitlist for your next available opening. My email is ${email} 📅`,
    };

    const msg = msgs[context];
    const clean = merchant.whatsapp.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (submitted) {
    return (
      <div className={sfStyles.notifySuccess}>
        <Check size={16} />
        <span>You're on the list. We'll reach out!</span>
      </div>
    );
  }

  return (
    <div className={sfStyles.notifyMeWrap}>
      <p className={sfStyles.notifyLabel}>{label}</p>
      <form className={sfStyles.notifyForm} onSubmit={handleSubmit}>
        <input 
          type="email" 
          placeholder="Email address" 
          className={sfStyles.notifyInput} 
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <button type="submit" className={sfStyles.notifyBtn}>Notify Me</button>
      </form>
    </div>
  );
}

// ─── Drop Countdown ───────────────────────────────────────────────────────────

function DropCountdown({ drop, merchant, onLive }: { drop: Drop; merchant: Merchant; onLive: () => void }) {
  const [timeLeft, setTimeLeft] = useState<{ d:number, h:number, m:number, s:number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(drop.scheduled_at).getTime() - Date.now();
      if (diff <= 0) {
        clearInterval(timer);
        onLive();
        return;
      }
      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / 1000 / 60) % 60),
        s: Math.floor((diff / 1000) % 60),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [drop.scheduled_at, onLive]);

  if (!timeLeft) return null;

  return (
    <div className={sfStyles.dropCountdownSection}>
      <p className={sfStyles.dropLabel}>Next Drop Arrives In</p>
      <div className={sfStyles.countdownGrid}>
        <div className={sfStyles.countItem}><span className={sfStyles.countNum}>{timeLeft.d}</span><span className={sfStyles.countUnit}>Days</span></div>
        <div className={sfStyles.countItem}><span className={sfStyles.countNum}>{timeLeft.h}</span><span className={sfStyles.countUnit}>Hrs</span></div>
        <div className={sfStyles.countItem}><span className={sfStyles.countNum}>{timeLeft.m}</span><span className={sfStyles.countUnit}>Min</span></div>
        <div className={sfStyles.countItem}><span className={sfStyles.countNum}>{timeLeft.s}</span><span className={sfStyles.countUnit}>Sec</span></div>
      </div>
      
      <NotifyMeForm merchant={merchant} context="drop" label="Email for drop alert" />
    </div>
  );
}

// ─── Window Status Banner (Vendor) ──────────────────────────────────────────

function WindowStatusBanner({ 
  activeWindow, 
  nextWindow, 
  dormantMessage,
  merchant
}: { 
  activeWindow: AvailabilityWindow | null;
  nextWindow: AvailabilityWindow | null;
  dormantMessage: string | null;
  merchant: Merchant;
}) {
  if (activeWindow) {
    return (
      <div className={`${sfStyles.windowBanner} ${sfStyles.windowOpen}`}>
        <div className={sfStyles.windowStatus}>
          <span className={sfStyles.pulseDot} />
          ORDERING OPEN
        </div>
        <p className={sfStyles.windowSub}>Window closes {formatDate(activeWindow.closes_at, 'relative')}</p>
      </div>
    );
  }

  if (nextWindow) {
    return (
      <div className={`${sfStyles.windowBanner} ${sfStyles.windowClosed}`}>
        <div className={sfStyles.windowStatus}>WINDOW CLOSED</div>
        <p className={sfStyles.windowSub}>Next window opens {formatDate(nextWindow.opens_at, 'long')}</p>
        <div className={sfStyles.windowNotify}>
          <NotifyMeForm merchant={merchant} context="window" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${sfStyles.windowBanner} ${sfStyles.windowDormant}`}>
      <div className={sfStyles.windowStatus}>DORMANT</div>
      <p className={sfStyles.windowMessage}>{dormantMessage ?? 'We are not currently accepting orders.'}</p>
      <div className={sfStyles.windowNotify}>
        <NotifyMeForm merchant={merchant} context="window" />
      </div>
    </div>
  );
}

// ─── Menu Display (Vendor) ──────────────────────────────────────────────────

function MenuDisplay({
  products,
  merchant,
  windowState,
}: {
  products: Product[];
  merchant: Merchant;
  windowState: 'open' | 'closed' | 'dormant';
}) {
  const { add, has } = useBasketStore();
  const categories = useMemo(() => {
    const map: Record<string, Product[]> = {};
    products.forEach((p) => {
      const cat = p.category || 'General';
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return map;
  }, [products]);

  const handleBag = (e: React.MouseEvent, item: Product) => {
    e.preventDefault();
    e.stopPropagation();
    add({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.images[0] ?? `https://picsum.photos/seed/${item.id}/100/100`,
    }, merchant.id);
  };

  return (
    <div className={sfStyles.menuDisplay}>
      {Object.entries(categories).map(([cat, items]) => (
        <div key={cat} className={sfStyles.menuCategory}>
          <h3 className={sfStyles.menuCategoryLabel}>
            {cat} ({items.length})
          </h3>
          <div className={sfStyles.menuItems}>
            {items.map((item) => {
              const inBag = has(item.id);
              const isAvailable = windowState === 'open';

              return (
                <Link 
                  key={item.id} 
                  to={`/store/${merchant.handle}/item/${item.id}`} 
                  className={sfStyles.menuItem}
                >
                  <img 
                    src={item.images[0] ?? `https://picsum.photos/seed/${item.id}/100/100`} 
                    alt="" 
                    className={sfStyles.menuItemThumb} 
                  />
                  <div className={sfStyles.menuItemMain}>
                    <p className={sfStyles.menuItemName}>{item.name}</p>
                    {item.description && (
                      <p className={sfStyles.menuItemDesc}>
                        {truncate(item.description, 60)}
                      </p>
                    )}
                    {item.stock_level !== null && (
                      <span className={sfStyles.menuItemCap}>
                        [{item.stock_level} left]
                      </span>
                    )}
                  </div>
                  <div className={sfStyles.menuItemRight}>
                    <p className={sfStyles.menuItemPrice}>
                      {formatCurrencyFull(item.price)}
                    </p>
                    <div className={sfStyles.menuItemActions}>
                      {isAvailable ? (
                        <button
                          className={`${sfStyles.menuBagBtn} ${inBag ? sfStyles.menuBagBtnAdded : ''}`}
                          onClick={(e) => handleBag(e, item)}
                          aria-label={inBag ? 'In bag' : 'Add to bag'}
                        >
                          {inBag ? <Check size={14} /> : <Plus size={14} />}
                        </button>
                      ) : (
                        <span className={sfStyles.nextWindowLabel}>Next window</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Portfolio Gallery (Studio / Host) ──────────────────────────────────────

function PortfolioGallery({ 
  images, 
  captions, 
  groups 
}: { 
  images: string[], 
  captions?: string[],
  groups?: { label: string, range: [number, number] }[]
}) {
  const [activeGroup, setActiveGroup] = useState<number | null>(groups ? 0 : null);
  
  const displayImages = useMemo(() => {
    if (activeGroup === null || !groups) return images;
    const [start, end] = groups[activeGroup].range;
    return images.slice(start, end);
  }, [images, activeGroup, groups]);

  return (
    <section className={sfStyles.portfolioSection}>
      <h2 className={sfStyles.sectionTitle}>Portfolio</h2>
      
      {groups && (
        <div className={sfStyles.portfolioTabs}>
          {groups.map((g, i) => (
            <button 
              key={i} 
              className={`${sfStyles.portfolioTab} ${activeGroup === i ? sfStyles.portfolioTabActive : ''}`}
              onClick={() => setActiveGroup(i)}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      <div className={sfStyles.portfolioGrid}>
        {displayImages.map((img, i) => (
          <div key={i} className={sfStyles.portfolioItem}>
            <img src={img} alt="" loading="lazy" />
            {captions && captions[i] && (
              <div className={sfStyles.portfolioOverlay}>
                <p>{captions[i]}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Calendar Preview (Host) ────────────────────────────────────────────────

function CalendarPreview({ 
  merchantId, 
  onBookSlot 
}: { 
  merchantId: string; 
  handle: string;
  onBookSlot: (date: string, time: string) => void;
}) {
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

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = WORKING_HOURS.start; h < WORKING_HOURS.end; h++) {
      slots.push({ h, m: 0 });
      slots.push({ h, m: 30 });
    }
    return slots;
  }, []);

  return (
    <section className={sfStyles.calendarSection}>
      <h2 className={sfStyles.sectionTitle}>Availability</h2>
      <div className={sfStyles.calendar}>
        <div className={sfStyles.calendarHeader}>
          {['M','T','W','T','F','S','S'].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className={sfStyles.calendarGrid}>
          {days.map((d, i) => {
            const dateStr = d.toISOString().split('T')[0];
            const isAvailable = availableDays.has(dateStr);
            const isToday = dateStr === todayStr;
            return (
              <div 
                key={i} 
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
            {timeSlots.map(({ h, m }) => {
              const isAvailable = selectedDay ? isSlotAvailable(selectedDay, h, m, 60, merchantId) : false;
              const timeLabel = h >= 12 
                ? `${h === 12 ? 12 : h - 12}:${String(m).padStart(2, '0')} pm` 
                : `${h}:${String(m).padStart(2, '0')} am`;

              return (
                <div key={`${h}-${m}`} className={sfStyles.slotItem}>
                  <span className={sfStyles.slotTime}>{timeLabel}</span>
                  {isAvailable ? (
                    <button 
                      onClick={() => {
                        onBookSlot(selectedDay!, timeLabel);
                        setSelectedDay(null);
                      }} 
                      className={sfStyles.slotBookBtn}
                    >
                      Book →
                    </button>
                  ) : (
                    <span className={sfStyles.slotStatusBooked}>● Booked</span>
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

function EnquiryForm({ 
  storeName, 
  responseTime,
  initialProjectType
}: { 
  storeName: string; 
  responseTime: number | null;
  initialProjectType?: string;
}) {
  const [form, setForm] = useState({ 
    client_name: '', 
    company: '', 
    project_type: initialProjectType || '', 
    budget_range: '', 
    timeline: '', 
    message: '' 
  });

  useEffect(() => {
    if (initialProjectType) {
      setForm(f => ({ ...f, project_type: initialProjectType }));
    }
  }, [initialProjectType]);
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
          {responseTime && (
            <p className={sfStyles.enquiryConfirmSub}>{storeName} usually responds within {responseTime} hours.</p>
          )}
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
  product, handle, merchantId, cardStyle
}: {
  product: Product; handle: string; merchantId: string; cardStyle: CardStyle;
}) {
  const { add, has } = useBasketStore();
  const inBag = has(product.id);
  const fileType = getFileTypeBadge(product);
  const isFree = product.is_free;
  const [expanded, setExpanded] = useState(false);

  const handleBag = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add({
      id: product.id,
      name: product.name,
      price: isFree ? 0 : product.price,
      image: product.images[0] ?? `https://picsum.photos/seed/${product.id}/400/500`,
    }, merchantId);
  };

  return (
    <m.div variants={staggerChild} className={sfStyles.digitalCard}>
      <Link 
        to={`/store/${handle}/item/${product.id}`} 
        className={`sf-card sf-card-${cardStyle}`}
        aria-label={product.name}
      >
        <div className="sf-card-image">
          <img src={product.images[0] ?? `https://picsum.photos/seed/${product.id}/400/500`} alt={product.name} loading="lazy" />
          {fileType && <span className={sfStyles.fileTypeBadge}>{fileType}</span>}
          {isFree && <span className={sfStyles.freeBadge}>FREE</span>}
          <button
            className={`${sfStyles.digitalBagBtn} ${inBag ? sfStyles.digitalBagAdded : ''}`}
            onClick={handleBag}
            aria-label={inBag ? 'In bag' : 'Add to bag'}
          >
            {inBag ? <Check size={12} /> : <Plus size={12} />}
          </button>
        </div>
        <div className="sf-card-body">
          <h3 className="sf-card-name">{product.name}</h3>
          <p className="sf-card-price">
            {isFree ? 'Free' : formatCurrencyFull(product.price)}
          </p>
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

function RecentlyBrowsedShelf({ 
  handle, 
  cardStyle,
  currentProducts 
}: { 
  handle: string; 
  cardStyle: CardStyle;
  currentProducts: Product[];
}) {
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    const key = `trovea_recent_${handle}`;
    const now = Date.now();
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Filter last 24h only and exclude those currently visible in main grid (optional but cleaner)
    const filtered = list.filter((i: any) => 
      (now - i.timestamp < 86400000) && !currentProducts.some(p => p.id === i.id)
    );
    setRecent(filtered);
  }, [handle, currentProducts]);

  const handleClear = () => {
    localStorage.removeItem(`trovea_recent_${handle}`);
    setRecent([]);
  };

  if (recent.length < 2) return null;

  return (
    <section className={sfStyles.recentShelfSection}>
      <div className={sfStyles.recentShelfHeader}>
        <h2 className={sfStyles.sectionTitle}>Recently viewed</h2>
        <button className={sfStyles.recentClearBtn} onClick={handleClear}>Clear</button>
      </div>
      <div className={`${sfStyles.recentShelf} scrollbar-hide`}>
        <m.div 
          className={sfStyles.recentShelfInner}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {recent.map(item => (
            <div key={item.id} className={sfStyles.recentCardWrap}>
              <MiniCard 
                product={{
                  ...item,
                  status: 'live', // Simplified for recent shelf
                  images: [item.image]
                }} 
                handle={handle} 
                cardStyle={cardStyle} 
              />
            </div>
          ))}
        </m.div>
      </div>
    </section>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function StorefrontPage() {
  const { handle } = useParams<{ handle: string }>();
  const [searchParams] = useSearchParams();
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [digitalCheckoutOpen, setDigitalCheckoutOpen] = useState(false);
  const [devPaused, setDevPaused] = useState(false);
  const [following, setFollowing] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [merchant, setMerchant] = useState<Merchant>(FIXTURE_MERCHANT);
  const [products, setProducts] = useState<Product[]>(FIXTURE_PRODUCTS);
  const [merchantCollections, setMerchantCollections] = useState<any[]>([]);

  // Phase 3B: Fetch data from API with fixture fallback
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const hasApi = !!import.meta.env.VITE_API_URL;
      
      if (hasApi && handle) {
        try {
          const m = await getMerchantByHandle(handle);
          const [p, c] = await Promise.all([
            getProductsByMerchant(m.id),
            getCollectionsByMerchant(m.id)
          ]);
          setMerchant(m);
          setProducts(p);
          setMerchantCollections(c);
          setIsLoading(false);
          return;
        } catch (err) {
          console.error('Failed to fetch storefront data:', err);
          // Fall through to fixture logic on error
        }
      }

      // Fixture Fallback
      let fMerchant = FIXTURE_MERCHANT;
      let fProducts = FIXTURE_PRODUCTS;
      
      if (handle === 'chisombeauty') { fMerchant = FIXTURE_HOST_MERCHANT; fProducts = FIXTURE_HOST_PRODUCTS; }
      else if (handle === 'femicreates') { fMerchant = FIXTURE_DIGITAL_MERCHANT; fProducts = FIXTURE_DIGITAL_PRODUCTS; }
      else if (handle === 'ngozistudio') { fMerchant = FIXTURE_STUDIO_MERCHANT; fProducts = FIXTURE_STUDIO_PRODUCTS; }
      else if (handle === 'tobieats') { fMerchant = FIXTURE_VENDOR_MERCHANT; fProducts = FIXTURE_VENDOR_PRODUCTS; }

      setMerchant(fMerchant);
      setProducts(fProducts);
      setMerchantCollections(FIXTURE_COLLECTIONS.filter(c => c.merchant_id === fMerchant.id));
      setIsLoading(false);
    };

    fetchData();
  }, [handle]);

  // Phase 3G: Initial follow state
  useEffect(() => {
    const follows = JSON.parse(localStorage.getItem('trovea_follows') || '[]');
    if (follows.some((f: any) => f.handle === handle)) {
      setFollowing(true);
    }
  }, [handle]);

  const handleFollow = () => {
    const follows = JSON.parse(localStorage.getItem('trovea_follows') || '[]');
    if (!following) {
      const newFollows = [...follows, { handle, timestamp: new Date().toISOString() }];
      localStorage.setItem('trovea_follows', JSON.stringify(newFollows));
      setFollowing(true);
      
      const msg = `Hi ${merchant.store_name}! I'd love to be notified about new drops and restocks 📲`;
      const clean = merchant.whatsapp.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
      addToast(`Following ${merchant.store_name}`, 'success');
    } else {
      const newFollows = follows.filter((f: any) => f.handle !== handle);
      localStorage.setItem('trovea_follows', JSON.stringify(newFollows));
      setFollowing(false);
      addToast('Unfollowed', 'info');
    }
  };

  // Part 2 — Host Slot Picker State
  const [slotDrawerOpen, setSlotDrawerOpen] = useState(false);
  const [slotDrawerService, setSlotDrawerService] = useState<Product | null>(null);
  const [slotDrawerPreselected, setSlotDrawerPreselected] = useState<{ date?: string; time?: string }>({});

  const { store_config: cfg } = merchant;
  const layout     = cfg.layout;
  const cardStyle  = cfg.card_style;
  const { paletteId, isDark } = usePaletteTheme(cfg.palette);
  const signature  = SIGNATURES.find((s) => s.id === cfg.signature);

  const storeType   = merchant.store_type;
  const bagEligible = ['collector', 'vendor', 'digital_creator'].includes(storeType);

  const { addToast } = useUIStore();
  const { clearIfDifferentStore } = useBasketStore();
  const { holds, initFromDB: initHolds } = useHoldStore();

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

  const isPaused = merchant.is_paused || devPaused || (storeType === 'vendor' && windowState !== 'open');

  // Phase 3B: Clear bag if different store
  useEffect(() => {
    if (merchant.id) {
      clearIfDifferentStore(merchant.id);
      initHolds(merchant.id);
    }
  }, [merchant.id, clearIfDifferentStore, initHolds]);

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

  const { holds, initFromDB: initHolds } = useHoldStore();
  const [pendingClaimIds, setPendingClaimIds] = useState<Set<string>>(new Set());

  // ... rest of state ...

  // Phase 3D: Fetch pending claims for visible products
  useEffect(() => {
    const fetchClaims = async () => {
      const hasApi = !!import.meta.env.VITE_API_URL;
      if (!hasApi) return;

      try {
        const claims = await Promise.all(
          liveProducts.map(p => getPendingClaimForProduct(p.id))
        );
        const claimedSet = new Set(claims.filter(Boolean).map(c => c!.product_id));
        setPendingClaimIds(claimedSet);
      } catch (err) {
        console.error('Failed to fetch product claims:', err);
      }
    };

    if (liveProducts.length > 0) fetchClaims();
  }, [liveProducts]);

  const isOnHold = useCallback(
    (productId: string) =>
      holds.some((h: HoldRequest) => h.product_id === productId && h.status === 'active'),
    [holds],
  );

  const isClaimed = useCallback(
    (productId: string) => pendingClaimIds.has(productId),
    [pendingClaimIds]
  );


  const liveProducts = useMemo(
    () => products.filter((p) => p.status !== 'hidden'),
    [products]
  );

  const hasUncollected = useMemo(() => 
    liveProducts.some(p => p.collection_id === null),
  [liveProducts]);

  const displayProducts = useMemo(() => {
    if (activeCollection === 'uncollected') {
      return liveProducts.filter(p => p.collection_id === null);
    }
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

  // Host Slot Picker Helpers
  const openSlotPicker = (product: Product) => {
    setSlotDrawerService(product);
    setSlotDrawerPreselected({});
    setSlotDrawerOpen(true);
  };

  if (isLoading) return <StorefrontSkeleton />;

  if (!merchant.store_open) {
    return (
      <div
        className={`sf-themed ${sfStyles.storefront}`}
        data-layout={layout}
        data-palette={paletteId}
        data-dark={isDark}
        data-shape={cfg.shape ?? 'form'}
        data-motion={cfg.motion ?? 'precise'}
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
              {nextAvailableDate 
                ? `Next available: ${nextAvailableDate}` 
                : (
                  <div className={sfStyles.fullyBookedWrap}>
                    <span>Fully booked — check back soon</span>
                    <NotifyMeForm 
                      merchant={merchant} 
                      context="waitlist" 
                      label="Join the waitlist for next month." 
                    />
                  </div>
                )
              }
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
            <DropCountdown drop={activeDrop} merchant={merchant} onLive={() => setDropState('live')} />
          )}
          {dropState === 'live' && activeDrop && (
            <div className={sfStyles.dropLiveBanner}>
              <span className={sfStyles.pulseDot} />
              <span>Drop {activeDrop.id.split('-').pop()} — {activeDrop.label} is live</span>
            </div>
          )}

          {/* Collection Nav */}
          {(merchantCollections.length > 0 || hasUncollected) && (
            <m.nav
              className={`${sfStyles.collectionNav} scrollbar-hide`}
              aria-label="Collections"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.35, duration: 0.4 } }}
            >
              <button
                className={`${sfStyles.collectionChip} ${!activeCollection ? sfStyles.collectionChipActive : ''}`}
                onClick={() => setActiveCollection(null)}
              >
                All
              </button>
              {merchantCollections.map((col) => (
                <button
                  key={col.id}
                  className={`${sfStyles.collectionChip} ${activeCollection === col.id ? sfStyles.collectionChipActive : ''}`}
                  onClick={() => setActiveCollection(col.id)}
                >
                  <span className={sfStyles.collectionDot} style={{ background: col.color_accent }} />
                  {col.name}
                </button>
              ))}
              {hasUncollected && (
                <button
                  className={`${sfStyles.collectionChip} ${activeCollection === 'uncollected' ? sfStyles.collectionChipActive : ''}`}
                  onClick={() => setActiveCollection('uncollected')}
                >
                  Uncollected
                </button>
              )}
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
                    merchantId={merchant.id}
                    cardStyle={cardStyle}
                    bagEligible={bagEligible}
                    urgencySignal={getUrgencySignal(p, storeType, activeWindow, weekSlotCount)}
                    isOnHold={isOnHold(p.id)}
                    isClaimed={isClaimed(p.id)}
                    isPaused={isPaused}
                    dropState={dropState}

                  />
                ))}
              </m.div>
            </section>
          )}

          {/* Recently Viewed (Phase 3G) */}
          <RecentlyBrowsedShelf 
            handle={handle ?? merchant.handle} 
            cardStyle={cardStyle} 
            currentProducts={displayProducts} 
          />

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
                    merchantId={merchant.id}
                    cardStyle={cardStyle}
                    bagEligible={bagEligible}
                    urgencySignal={getUrgencySignal(p, storeType, activeWindow, weekSlotCount)}
                    isOnHold={isOnHold(p.id)}
                    isClaimed={isClaimed(p.id)}
                    isPaused={isPaused}
                    dropState={dropState}

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
            merchant={merchant}
          />

          {windowState === 'closed' && nextWindow && (
            <div className={sfStyles.preOrderChipRow}>
              <div className={sfStyles.preOrderChip}>
                <Clock size={12} />
                Pre-orders open {formatDate(nextWindow.opens_at, 'long')}
              </div>
            </div>
          )}
          
          <MenuDisplay products={liveProducts} merchant={merchant} windowState={windowState} />

          {windowState !== 'open' && (
            <div className={sfStyles.vendorNotifySection}>
              <a 
                href={buildVendorNotifyLink(merchant.whatsapp, merchant.store_name)}
                target="_blank"
                rel="noopener noreferrer"
                className={sfStyles.vendorNotifyLink}
              >
                <MessageCircle size={14} />
                Remind me on WhatsApp when open
              </a>
            </div>
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
                <Link key={p.id} to={`/store/${handle}/item/${p.id}`} className={sfStyles.serviceCard}>
                  <div className={sfStyles.serviceCardMain}>
                    <img 
                      src={p.images[0] ?? `https://picsum.photos/seed/${p.id}/160/160`} 
                      alt="" 
                      className={sfStyles.serviceCardThumb} 
                    />
                    <div className={sfStyles.serviceInfo}>
                      <h3 className={sfStyles.serviceName}>{p.name}</h3>
                      <div className={sfStyles.serviceMeta}>
                        {p.duration && <span>{p.duration} min</span>}
                        {p.duration && <span> · </span>}
                        {p.deposit_required && <span>{formatCurrencyFull(p.deposit_amount || 0)} deposit</span>}
                      </div>
                    </div>
                  </div>
                  <div className={sfStyles.serviceCardRight}>
                    <span className={sfStyles.servicePrice}>{formatCurrencyFull(p.price)}</span>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openSlotPicker(p);
                      }} 
                      className={sfStyles.serviceBookBtn}
                    >
                      Book a Slot
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Calendar Preview */}
          <CalendarPreview 
            merchantId={merchant.id} 
            handle={handle || merchant.handle} 
            onBookSlot={(date, time) => {
              setSlotDrawerService(liveProducts[0]);
              setSlotDrawerPreselected({ date, time });
              setSlotDrawerOpen(true);
            }}
          />

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
                  <DigitalProductCard key={p.id} product={p} handle={handle || merchant.handle} merchantId={merchant.id} cardStyle={cardStyle} />
                ))}
              </div>
            </section>
          )}

          {/* Digital Catalogue */}
          <section className={sfStyles.gridSection}>
            <h2 className={sfStyles.gridSectionTitle}>Digital Catalogue</h2>
            <div className={sfStyles.digitalCatalogue}>
              {liveProducts.map(p => (
                <DigitalProductCard key={p.id} product={p} handle={handle || merchant.handle} merchantId={merchant.id} cardStyle={cardStyle} />
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
                <Link key={p.id} to={`/store/${handle}/item/${p.id}`} className={sfStyles.packageCard}>
                  <h3 className={sfStyles.packageName}>{p.name}</h3>
                  <div className={sfStyles.packageMeta}>
                    {p.price_type === 'custom' ? 'Custom Quote' : `From ${formatCurrencyFull(p.price)}`}
                    {p.deposit_pct && ` · ${p.deposit_pct}% deposit`}
                    {p.timeline_estimate && ` · ${p.timeline_estimate}`}
                  </div>
                  {p.scope_description && <p className={sfStyles.packageScope}>{truncate(p.scope_description, 120)}</p>}
                  
                  <div className={sfStyles.packageCta}>
                    <span className={sfStyles.packageCtaLabel}>
                      {p.price_type === 'custom' ? 'View & Enquire →' : 'Book Package →'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Enquiry Form */}
          <EnquiryForm 
            storeName={merchant.store_name} 
            responseTime={merchant.response_time_hours} 
            initialProjectType={(() => {
              const pkgId = searchParams.get('package');
              if (!pkgId) return undefined;
              return products.find(p => p.id === pkgId)?.name;
            })()}
          />
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
          <div className={sfStyles.contactActions}>
            <a
              href={whatsappLink}
              className={sfStyles.whatsappCta}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={16} />
              Chat on WhatsApp
            </a>
            <button className={sfStyles.followBtn} onClick={handleFollow}>
              {following ? '✓ Following' : 'Follow for updates'}
            </button>
          </div>
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
      <InquiryBasket 
        merchant={merchant} 
        onOpenDigitalCheckout={() => setDigitalCheckoutOpen(true)}
      />

      {/* ── Digital Checkout Drawer (Phase 3E) ── */}
      <DigitalCartCheckoutDrawer
        open={digitalCheckoutOpen}
        onClose={() => setDigitalCheckoutOpen(false)}
        items={useBasketStore.getState().items}
        merchant={merchant}
        onComplete={() => {
          useBasketStore.getState().clear();
          addToast('Order received! Check your email.', 'success');
        }}
      />

      {/* ── Report Modal ── */}
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        storeName={merchant.store_name}
      />

      {/* ── Slot Picker Drawer (Host) ── */}
      {slotDrawerService && (
        <BookingRequestSheet
          open={slotDrawerOpen}
          onClose={() => setSlotDrawerOpen(false)}
          service={slotDrawerService}
          merchant={merchant}
          preselectedDate={slotDrawerPreselected.date}
          preselectedTime={slotDrawerPreselected.time}
        />
      )}

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

function ReportModal({
  open,
  onClose,
  storeName,
}: {
  open: boolean;
  onClose: () => void;
  storeName: string;
}) {
  const [step, setStep] = useState<'reason' | 'details' | 'success'>('reason');

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep('reason');
    }, 300);
  };

  return (
    <PopupModal open={open} onClose={handleClose} title="Report Store">
      <div className={sfStyles.reportModal}>
        <AnimatePresence mode="wait">
          {step === 'reason' && (
            <m.div key="reason" {...slideUp}>
              <p className={sfStyles.reportIntro}>Why are you reporting {storeName}?</p>
              <div className={sfStyles.reportReasons}>
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r}
                    className={sfStyles.reasonBtn}
                    onClick={() => {
                      setStep('details');
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </m.div>
          )}

          {step === 'details' && (
            <m.div key="details" {...slideUp}>
              <p className={sfStyles.reportIntro}>Any additional details? (Optional)</p>
              <textarea className={sfStyles.reportTextarea} rows={4} placeholder="Tell us more..." />
              <div className={sfStyles.reportActions}>
                <button className={sfStyles.reportSubmit} onClick={() => setStep('success')}>
                  Submit Report
                </button>
                <button className={sfStyles.reportBack} onClick={() => setStep('reason')}>
                  Back
                </button>
              </div>
            </m.div>
          )}

          {step === 'success' && (
            <m.div key="success" {...slideUp} className={sfStyles.reportSuccess}>
              <CheckCircle size={48} className={sfStyles.successIcon} />
              <h3 className={sfStyles.successTitle}>Report Received</h3>
              <p className={sfStyles.successText}>
                We've received your report and will investigate. Thank you for keeping Trove'a safe.
              </p>
              <button className={sfStyles.reportSubmit} onClick={handleClose}>
                Done
              </button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </PopupModal>
  );
}
