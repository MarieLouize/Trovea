/**
 * Trove'a — ItemDetailPage (Phase 2M: Hold CTA + Payment Proof)
 * Image lightbox with swipe/keyboard, basket integration, per-type action buttons.
 *
 * Motion rule: NEVER use initial={{ opacity: 0 }} on elements visible above the fold.
 * Only AnimatePresence (image crossfade, lightbox overlay) and whileInView (below-fold grid).
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Share2, MessageCircle, X, ShoppingBag,
  ZoomIn, ChevronLeft, ChevronRight, Check, Calendar, Tag,
  Clock, ChevronDown, AlertTriangle,
} from 'lucide-react';
import {
  FIXTURE_PRODUCTS, FIXTURE_COLLECTIONS, FIXTURE_MERCHANT,
  FIXTURE_CLAIMS, FIXTURE_HOLDS,
  FIXTURE_HOST_MERCHANT, FIXTURE_HOST_PRODUCTS,
  FIXTURE_DIGITAL_MERCHANT, FIXTURE_DIGITAL_PRODUCTS,
  FIXTURE_STUDIO_MERCHANT, FIXTURE_STUDIO_PRODUCTS,
} from '@/lib/fixtures';
import { formatCurrencyFull } from '@/lib/utils/format';
import { buildChatToBuyLink, buildStoreContactLink } from '@/lib/utils/whatsapp';
import { m, AnimatePresence, staggerContainer, staggerChild } from '@/lib/motion';
import { useBasketStore } from '@/lib/store/basket.store';
import type { Product, ProductVariant, CardStyle } from '@/lib/types';
import type { ClaimRequest, HoldRequest } from '@/lib/types/store-config.types';
import { usePaletteTheme } from '@/lib/hooks/usePaletteTheme';
import ClaimSheet from '@/components/public/ClaimSheet';
import HoldSheet from '@/components/public/HoldSheet';
import styles from './ItemDetailPage.module.css';
import '@/styles/cards.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hoursRemaining(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3_600_000));
}

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

// Payment methods for proof modal
const PAYMENT_METHODS = [
  'Bank Transfer',
  'Opay',
  'PalmPay',
  'Moniepoint',
  'Cash',
] as const;

// ─── Lightbox ─────────────────────────────────────────────────────────────────

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
    if (Math.abs(diff) > 40) {
      if (diff > 0) next();
      else prev();
    }
    touchStart.current = null;
  };

  return (
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

// ─── Mini Card (below-fold "More" grid) ───────────────────────────────────────

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

// ─── Payment Proof Modal (internal) ───────────────────────────────────────────

interface PaymentProofFormState {
  buyerName: string;
  buyerPhone: string;
  method: string;
  referenceNote: string;
}

interface PaymentProofErrors {
  buyerName?: string;
  buyerPhone?: string;
  referenceNote?: string;
}

function PaymentProofModal({
  open,
  onClose,
  product,
  merchant,
}: {
  open: boolean;
  onClose: () => void;
  product: { name: string; price: number };
  merchant: typeof FIXTURE_MERCHANT;
}) {
  const [form, setForm] = useState<PaymentProofFormState>({
    buyerName: '', buyerPhone: '', method: 'Bank Transfer', referenceNote: '',
  });
  const [errors, setErrors] = useState<PaymentProofErrors>({});

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setForm({ buyerName: '', buyerPhone: '', method: 'Bank Transfer', referenceNote: '' });
      setErrors({});
    }, 300);
  }, [onClose]);

  const handleSubmit = () => {
    const errs: PaymentProofErrors = {};
    if (!form.buyerName.trim() || form.buyerName.trim().length < 2) {
      errs.buyerName = 'Please enter your name.';
    }
    if (!form.buyerPhone.trim() || form.buyerPhone.trim().length < 8) {
      errs.buyerPhone = 'Please enter a valid WhatsApp number.';
    }
    if (!form.referenceNote.trim()) {
      errs.referenceNote = 'Please add a reference or note for your payment.';
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const priceStr = new Intl.NumberFormat('en-NG', {
      style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
    }).format(product.price);

    const message = [
      `Hi ${merchant.store_name}! I've made payment for ${product.name} (${priceStr}).`,
      '',
      `Payment method: ${form.method}`,
      `Reference: ${form.referenceNote.trim()}`,
      '',
      `My name: ${form.buyerName.trim()}`,
      `My WhatsApp: ${form.buyerPhone.trim()}`,
      '',
      'Please confirm receipt. Thank you!',
    ].join('\n');

    const clean = merchant.whatsapp.replace(/[^0-9]/g, '');
    const waLink = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
    window.open(waLink, '_blank', 'noopener,noreferrer');
    handleClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            className={styles.proofBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            onClick={handleClose}
          />
          <m.div
            className={styles.proofModal}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } }}
            exit={{ opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.18 } }}
            role="dialog"
            aria-modal="true"
            aria-label="I've already paid"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.proofHeader}>
              <h2 className={styles.proofTitle}>I've already paid</h2>
              <button className={styles.proofClose} onClick={handleClose} aria-label="Close">
                <X size={15} />
              </button>
            </div>

            <p className={styles.proofSubtitle}>
              Let the seller know your payment details:
            </p>

            <div className={styles.proofForm}>
              <div className={styles.proofField}>
                <label className={styles.proofLabel} htmlFor="proof-name">
                  Your Name <span className={styles.proofRequired}>*</span>
                </label>
                <input
                  id="proof-name"
                  className={`${styles.proofInput} ${errors.buyerName ? styles.proofInputError : ''}`}
                  type="text"
                  placeholder="e.g. Adaeze Okonkwo"
                  value={form.buyerName}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, buyerName: e.target.value }));
                    setErrors((err) => ({ ...err, buyerName: undefined }));
                  }}
                  autoComplete="name"
                />
                {errors.buyerName && <p className={styles.proofError}>{errors.buyerName}</p>}
              </div>

              <div className={styles.proofField}>
                <label className={styles.proofLabel} htmlFor="proof-phone">
                  WhatsApp <span className={styles.proofRequired}>*</span>
                </label>
                <input
                  id="proof-phone"
                  className={`${styles.proofInput} ${errors.buyerPhone ? styles.proofInputError : ''}`}
                  type="tel"
                  placeholder="08012345678"
                  value={form.buyerPhone}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, buyerPhone: e.target.value }));
                    setErrors((err) => ({ ...err, buyerPhone: undefined }));
                  }}
                  autoComplete="tel"
                />
                {errors.buyerPhone && <p className={styles.proofError}>{errors.buyerPhone}</p>}
              </div>

              <div className={styles.proofField}>
                <label className={styles.proofLabel} htmlFor="proof-method">
                  Payment method
                </label>
                <div className={styles.proofSelectWrap}>
                  <select
                    id="proof-method"
                    className={styles.proofSelect}
                    value={form.method}
                    onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className={styles.proofSelectIcon} />
                </div>
              </div>

              <div className={styles.proofField}>
                <label className={styles.proofLabel} htmlFor="proof-ref">
                  Reference / Note <span className={styles.proofRequired}>*</span>
                </label>
                <textarea
                  id="proof-ref"
                  className={`${styles.proofTextarea} ${errors.referenceNote ? styles.proofInputError : ''}`}
                  placeholder="e.g. Transfer ref: 3849201, sent 2:15pm"
                  value={form.referenceNote}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, referenceNote: e.target.value }));
                    setErrors((err) => ({ ...err, referenceNote: undefined }));
                  }}
                  rows={3}
                />
                {errors.referenceNote && (
                  <p className={styles.proofError}>{errors.referenceNote}</p>
                )}
              </div>
            </div>

            <m.button
              className={styles.proofSubmitBtn}
              onClick={handleSubmit}
              whileTap={{ scale: 0.97 }}
            >
              <MessageCircle size={14} />
              Send Confirmation →
            </m.button>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ItemDetailPage() {
  const { handle, item_id } = useParams<{ handle: string; item_id: string }>();

  // Derive merchant and products based on handle
  const { merchant, products } = useMemo(() => {
    if (handle === 'chisombeauty') return { merchant: FIXTURE_HOST_MERCHANT, products: FIXTURE_HOST_PRODUCTS };
    if (handle === 'femicreates') return { merchant: FIXTURE_DIGITAL_MERCHANT, products: FIXTURE_DIGITAL_PRODUCTS };
    if (handle === 'ngozistudio') return { merchant: FIXTURE_STUDIO_MERCHANT, products: FIXTURE_STUDIO_PRODUCTS };
    return { merchant: FIXTURE_MERCHANT, products: FIXTURE_PRODUCTS };
  }, [handle]);

  const product  = products.find((p) => p.id === item_id);
  const cfg      = merchant.store_config;
  const { paletteId, isDark } = usePaletteTheme(cfg.palette);
  
  const type = merchant.store_type;
  const st = useMemo(() => ({
    type,
    isCollector: type === 'collector',
    isVendor:    type === 'vendor',
    isHost:      type === 'host',
    isDigital:   type === 'digital_creator',
    isStudio:    type === 'studio',
  }), [type]);

  const [selectedImage,    setSelectedImage]    = useState(0);
  const [lightboxOpen,     setLightboxOpen]      = useState(false);
  const [selectedVariants, setSelectedVariants]  = useState<Record<string, string>>({});
  const [claimSheetOpen,   setClaimSheetOpen]    = useState(false);
  const [holdSheetOpen,    setHoldSheetOpen]     = useState(false);
  const [proofModalOpen,   setProofModalOpen]    = useState(false);
  const [claims,           setClaims]            = useState<ClaimRequest[]>(FIXTURE_CLAIMS);
  const [holds,            setHolds]             = useState<HoldRequest[]>(FIXTURE_HOLDS);

  const { add, remove, has } = useBasketStore();
  const inBasket = product ? has(product.id) : false;

  const touchStart = useRef<number | null>(null);

  const collection = useMemo(
    () => product ? FIXTURE_COLLECTIONS.find((c) => c.id === product.collection_id) : null,
    [product]
  );

  const relatedProducts = useMemo(
    () => products.filter((p) => p.id !== item_id && p.status !== 'hidden').slice(0, 4),
    [item_id, products]
  );

  const addClaim = useCallback((claim: ClaimRequest) => {
    setClaims((prev) => [claim, ...prev]);
  }, []);

  const addHold = useCallback((hold: HoldRequest) => {
    setHolds((prev) => [hold, ...prev]);
  }, []);

  const hasPendingClaim = useCallback((productId: string) =>
    claims.some((c) => c.product_id === productId && (c.status === 'pending' || c.status === 'accepted')),
    [claims]
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

  const isSoldOut  = product?.status === 'sold_out' || product?.stock_level === 0;
  const isLowStock = !isSoldOut && product?.stock_level === 1;

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
  }, [product, inBasket, selectedVariants, add, remove, isSoldOut]);

  const variantGroups = useMemo(() => {
    if (!product?.variants?.length) return [];
    const map = new Map<string, ProductVariant[]>();
    product.variants.forEach((v) => {
      if (!map.has(v.label)) map.set(v.label, []);
      map.get(v.label)!.push(v);
    });
    return Array.from(map.entries()).map(([name, opts]) => ({ name, opts }));
  }, [product?.variants]);

  // ── Not found ─────────────────────────────────────────────────────────────
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

  const variantString = Object.entries(selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ');

  const whatsappBuyLink     = buildChatToBuyLink({
    phone: merchant.whatsapp, itemName: product.name, price: product.price,
    variantLabel: variantString || undefined, storeName: merchant.store_name,
  });
  const whatsappContactLink = buildStoreContactLink(merchant.whatsapp, merchant.store_name);

  const images = product.images.length > 0
    ? product.images
    : [`https://picsum.photos/seed/${product.id}/600/600`];

  // Bag eligibility for this store type
  const bagEligible = st.isCollector || st.isVendor || st.isDigital;

  // Checkout (Claim) eligibility
  const checkoutEligible =
    merchant.checkout_enabled &&
    product.status === 'live' &&
    !merchant.is_paused &&
    !st.isDigital;

  // Hold eligibility — Collector and Vendor only
  const holdEligible =
    merchant.holds_enabled &&
    product.status === 'live' &&
    !merchant.is_paused &&
    (st.isCollector || st.isVendor);

  // Active hold on this product
  const activeHold = holds.find(
    (h) => h.product_id === product.id && h.status === 'active',
  );

  // Payment proof: no structured flows available — show "I've already paid" link
  const showPaymentProof =
    !merchant.checkout_enabled &&
    !merchant.holds_enabled &&
    !isSoldOut &&
    !st.isHost &&
    !st.isStudio;

  // Claim CTA label per store type
  const claimCtaLabel = (() => {
    if (st.isVendor) return 'Claim Pre-order';
    if (st.isHost || st.isStudio) return 'Book & Pay Deposit';
    return 'Claim This Piece';
  })();

  return (
    <div className={`sf-themed ${styles.page}`} data-palette={paletteId} data-dark={isDark}>

      {/* ── Nav ── */}
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

      {/* ── Pause Banner ── */}
      {merchant.is_paused && (
        <div className={styles.pauseBanner}>
          <AlertTriangle size={13} />
          <span>
            {merchant.pause_message ?? 'This store is temporarily paused — new orders are unavailable.'}
          </span>
        </div>
      )}

      <div className={styles.layout}>

        {/* ── Gallery ── */}
        <div className={styles.gallery}>
          <div
            className={styles.mainImageWrap}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onClick={() => !isSoldOut && setLightboxOpen(true)}
          >
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

        {/* ── Product Info ── */}
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
            <span className={styles.price}>
              {st.isDigital && product.is_free ? 'Free' : formatCurrencyFull(product.price)}
            </span>
            {isSoldOut  && <span className={`${styles.stockBadge} ${styles.stockOut}`}>Sold out</span>}
            {isLowStock && <span className={`${styles.stockBadge} ${styles.stockLow}`}>Last one</span>}
            {product.claim_mode && !isSoldOut && (
              <span className={`${styles.stockBadge} ${styles.stockClaim}`}>Claim mode</span>
            )}
            {st.isDigital && getFileTypeBadge(product) && (
              <span className={styles.stockBadge}>{getFileTypeBadge(product)}</span>
            )}
          </div>

          {(st.isHost || st.isStudio) && (
            <div className={styles.serviceBrief}>
              {product.duration && <p className={styles.metaInfo}>{product.duration} min service</p>}
              {product.deposit_required && (
                <p className={styles.metaInfo}>{formatCurrencyFull(product.deposit_amount || 0)} deposit required to book</p>
              )}
              {product.deposit_pct && (
                <p className={styles.metaInfo}>{product.deposit_pct}% deposit required to book</p>
              )}
            </div>
          )}

          {product.description && (
            <p className={styles.description}>{product.description}</p>
          )}

          {product.scope_description && (
            <div className={styles.scopeSection}>
              <p className={styles.scopeHeading}>Scope of Work</p>
              <p className={styles.description}>{product.scope_description}</p>
            </div>
          )}

          {product.deliverables && (
            <div className={styles.deliverablesSection}>
              <p className={styles.scopeHeading}>Deliverables</p>
              <ul className={styles.deliverablesList}>
                {product.deliverables.split(',').map((d, i) => (
                  <li key={i}>{d.trim()}</li>
                ))}
              </ul>
            </div>
          )}

          {st.isDigital && product.delivery_url && (
            <div className={styles.previewSection}>
              <a href={product.delivery_url} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>
                Preview Resource ↗
              </a>
            </div>
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
                    {opt.price_override !== null && <> (+{formatCurrencyFull(opt.price_override)})</>}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* ── Actions (per store type) ── */}
          <div className={styles.actions}>
            {merchant.is_paused ? (
              <div className={styles.pauseBanner}>
                <AlertTriangle size={13} />
                <span>Ordering unavailable while this store is paused.</span>
              </div>

            ) : isSoldOut ? (
              <span className={`${styles.actionBtn} ${styles.actionBtnDisabled}`}>Sold Out</span>

            ) : st.isHost ? (
              <a
                href={`/store/${handle}/book`}
                className={`${styles.actionBtn} ${styles.ctaPrimary}`}
              >
                <Calendar size={16} />
                Book a Slot
              </a>

            ) : st.isStudio ? (
              <a
                href={whatsappContactLink}
                className={`${styles.actionBtn} ${styles.ctaPrimary}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={16} />
                {product.product_type === 'package' ? 'Book Package' : 'Request Quote'}
              </a>

            ) : checkoutEligible ? (
              /* Checkout ON — Claim primary, Bag + Chat secondary */
              <>
                <m.button
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                  onClick={() => setClaimSheetOpen(true)}
                  whileTap={{ scale: 0.97 }}
                >
                  <Tag size={15} />
                  {claimCtaLabel}
                </m.button>
                {bagEligible && (
                  <button
                    className={`${styles.actionBtn} ${inBasket ? styles.actionBtnBasketAdded : styles.ctaSecondary}`}
                    onClick={handleBasketToggle}
                  >
                    {inBasket
                      ? <><Check size={15} /> In Bag</>
                      : <><ShoppingBag size={15} /> Add to Bag</>
                    }
                  </button>
                )}
                <a
                  href={whatsappBuyLink}
                  className={`${styles.actionBtn} ${styles.ctaSecondary}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={16} />
                  Chat to Buy
                </a>
              </>

            ) : product.claim_mode ? (
              <a
                href={`/submit-receipt/${product.id}`}
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              >
                Claim This Piece
              </a>

            ) : bagEligible ? (
              <>
                <button
                  className={`${styles.actionBtn} ${inBasket ? styles.actionBtnBasketAdded : styles.ctaPrimary}`}
                  onClick={handleBasketToggle}
                >
                  {inBasket
                    ? <><Check size={15} /> In Bag</>
                    : <><ShoppingBag size={15} /> {st.isDigital && product.is_free ? 'Get Free' : 'Add to Bag'}</>
                  }
                </button>
                <a
                  href={whatsappBuyLink}
                  className={`${styles.actionBtn} ${styles.ctaSecondary}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={16} />
                  Chat to Buy
                </a>
                {showPaymentProof && (
                  <button
                    className={styles.paidLink}
                    onClick={() => setProofModalOpen(true)}
                  >
                    I've already paid →
                  </button>
                )}
              </>

            ) : (
              <>
                <a
                  href={whatsappBuyLink}
                  className={`${styles.actionBtn} ${styles.actionBtnWhatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={16} />
                  Buy via WhatsApp
                </a>
                {showPaymentProof && (
                  <button
                    className={styles.paidLink}
                    onClick={() => setProofModalOpen(true)}
                  >
                    I've already paid →
                  </button>
                )}
              </>
            )}

            {/* ── Hold CTA ── */}
            {!isSoldOut && holdEligible && (
              activeHold ? (
                <div className={styles.holdStatusText}>
                  <Clock size={12} />
                  On hold · {hoursRemaining(activeHold.expires_at)}h remaining
                </div>
              ) : (
                <m.button
                  className={`${styles.actionBtn} ${styles.ctaTertiary}`}
                  onClick={() => setHoldSheetOpen(true)}
                  whileTap={{ scale: 0.97 }}
                >
                  <Clock size={14} />
                  Hold for me · {merchant.hold_duration_hours}h
                </m.button>
              )
            )}

            {!isSoldOut && !st.isHost && !st.isStudio && (
              <a
                href={whatsappContactLink}
                className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ask a Question
              </a>
            )}
          </div>

          <div className={styles.divider} />

          {/* Meta */}
          <div className={styles.metaTable}>
            {collection && (
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Collection</span>
                <span className={styles.metaVal}>{collection.name}</span>
              </div>
            )}
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>Seller</span>
              <span className={styles.metaVal}>
                {merchant.store_name}
                {merchant.verification_tier !== 'unverified' && (
                  <span
                    className={`badge-verified ${merchant.verification_tier === 'trusted' ? 'badge-trusted' : ''}`}
                    style={{ marginLeft: 6 }}
                  >
                    {merchant.verification_tier === 'trusted' ? '★ Trusted' : '✓ Verified'}
                  </span>
                )}
              </span>
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

      {/* ── More from Archive — below fold ── */}
      {relatedProducts.length > 0 && (
        <div className={`${styles.moreSection} card-${cfg.card_style}`}>
          <p className={styles.moreSectionTitle}>More from {merchant.store_name}</p>
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

      {/* ── Image Lightbox ── */}
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

      {/* ── Claim Sheet ── */}
      <ClaimSheet
        open={claimSheetOpen}
        onClose={() => setClaimSheetOpen(false)}
        product={product}
        merchant={merchant}
        variantLabel={variantString || null}
        hasPendingClaim={hasPendingClaim(product.id)}
        onClaimSubmitted={addClaim}
      />

      {/* ── Hold Sheet ── */}
      <HoldSheet
        open={holdSheetOpen}
        onClose={() => setHoldSheetOpen(false)}
        product={product}
        merchant={merchant}
        hasActiveHold={!!activeHold}
        onHoldCreated={addHold}
      />

      {/* ── Payment Proof Modal ── */}
      <PaymentProofModal
        open={proofModalOpen}
        onClose={() => setProofModalOpen(false)}
        product={product}
        merchant={merchant}
      />

    </div>
  );
}
