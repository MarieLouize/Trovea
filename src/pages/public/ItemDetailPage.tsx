/**
 * Trove'a — ItemDetailPage (Phase 3 Revision)
 * Refined buyer flows for all product types.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Share2, MessageCircle, X, ShoppingBag,
  ZoomIn, ChevronLeft, ChevronRight, Check, Calendar, Tag,
  Clock, ChevronDown, AlertTriangle, Download
} from 'lucide-react';
import {
  FIXTURE_PRODUCTS, FIXTURE_COLLECTIONS, FIXTURE_MERCHANT,
  FIXTURE_CLAIMS,
  FIXTURE_HOST_MERCHANT, FIXTURE_HOST_PRODUCTS,
  FIXTURE_DIGITAL_MERCHANT, FIXTURE_DIGITAL_PRODUCTS,
  FIXTURE_STUDIO_MERCHANT, FIXTURE_STUDIO_PRODUCTS,
  FIXTURE_VENDOR_MERCHANT, FIXTURE_VENDOR_PRODUCTS,
  FIXTURE_WINDOWS,
} from '@/lib/fixtures';
import { formatCurrencyFull } from '@/lib/utils/format';
import { 
  buildChatToBuyLink, buildStoreContactLink, buildStudioEnquiryLink, 
  buildVendorNotifyLink 
} from '@/lib/utils/whatsapp';
import { m, AnimatePresence, staggerContainer } from '@/lib/motion';
import { useBasketStore } from '@/lib/store/basket.store';
import { useHoldStore } from '@/lib/store/hold.store';
import { useUIStore } from '@/lib/store/ui.store';
import type { Product, ProductVariant, Merchant, ClaimRequest, HoldRequest } from '@/lib/types';
import { usePaletteTheme } from '@/lib/hooks/usePaletteTheme';
import PopupModal from '@/components/primitives/PopupModal/PopupModal';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import ClaimSheet from '@/components/public/ClaimSheet';
import HoldSheet from '@/components/public/HoldSheet';
import BookingRequestSheet from '@/components/public/BookingRequestSheet';
import MiniCard from '@/components/public/MiniCard/MiniCard';
import { ItemDetailSkeleton } from '@/components/public/Skeletons';
import { getMerchantByHandle } from '@/lib/api/merchants.api';
import { getProductById } from '@/lib/api/products.api';
import styles from './ItemDetailPage.module.css';
import '@/styles/cards.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHoldTime(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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

// ─── Payment Proof Modal (internal) ───────────────────────────────────────────

interface PaymentProofFormState {
  buyerName: string;
  buyerPhone: string;
  method: string;
  referenceNote: string;
}

function PaymentProofModal({
  open,
  onClose,
  product,
  merchant,
}: {
  open: boolean;
  onClose: () => void;
  product: Product;
  merchant: Merchant;
}) {
  const { addToast } = useUIStore();
  const [form, setForm] = useState<PaymentProofFormState>({
    buyerName: '',
    buyerPhone: '',
    method: 'Bank Transfer',
    referenceNote: '',
  });

  const handleSubmit = () => {
    if (!form.buyerName || !form.buyerPhone) {
      addToast('Please fill in your name and phone.', 'error');
      return;
    }
    addToast('Proof submitted! The seller will verify and confirm.', 'success');
    onClose();
  };

  return (
    <PopupModal open={open} onClose={onClose} title="I've already paid">
      <div className={styles.proofForm}>
        <p className={styles.proofHint}>
          Submit this if you've already transferred <strong>{formatCurrencyFull(product.price)}</strong> to {merchant.store_name}.
        </p>
        
        <div className={styles.proofField}>
          <label className={styles.proofLabel} htmlFor="proof-name">Your Name</label>
          <input
            id="proof-name"
            className={styles.proofInput}
            type="text"
            placeholder="e.g. Adaeze Okonkwo"
            value={form.buyerName}
            onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
          />
        </div>

        <div className={styles.proofField}>
          <label className={styles.proofLabel} htmlFor="proof-phone">WhatsApp Number</label>
          <input
            id="proof-phone"
            className={styles.proofInput}
            type="tel"
            placeholder="080..."
            value={form.buyerPhone}
            onChange={(e) => setForm({ ...form, buyerPhone: e.target.value })}
          />
        </div>

        <div className={styles.proofField}>
          <label className={styles.proofLabel}>Payment Method</label>
          <div className={styles.proofSelectWrap}>
            <select
              className={styles.proofSelect}
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown size={13} className={styles.proofSelectIcon} />
          </div>
        </div>

        <div className={styles.proofField}>
          <label className={styles.proofLabel} htmlFor="proof-ref">Reference / Note (Optional)</label>
          <textarea
            id="proof-ref"
            className={styles.proofTextarea}
            rows={2}
            placeholder="e.g. Session ID or bank name"
            value={form.referenceNote}
            onChange={(e) => setForm({ ...form, referenceNote: e.target.value })}
          />
        </div>

        <button className={styles.proofSubmitBtn} onClick={handleSubmit}>
          Submit Proof
        </button>
      </div>
    </PopupModal>
  );
}

// ─── Digital Acquisition Drawer ───────────────────────────────────────────────

function DigitalAcquisitionDrawer({
  open,
  onClose,
  product,
  merchant,
}: {
  open: boolean;
  onClose: () => void;
  product: Product;
  merchant: Merchant;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'start' | 'form'>(product.is_free ? 'form' : 'start');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAction = async () => {
    if (!email.trim() || (!product.is_free && !name.trim())) return;
    
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setSubmitting(false);

    if (product.is_free) {
      navigate(`/receipt/mock-free-${product.id}`);
    } else {
      // In Phase 3E, we build a WhatsApp message for manual verification
      const message = [
        `*DIGITAL ORDER: ${merchant.store_name}*`,
        '---',
        `Buyer: ${name}`,
        `Email: ${email}`,
        `Item: ${product.name} — ${formatCurrencyFull(product.price)}`,
        '',
        'I have made the transfer for this tool. 🚀',
      ].join('\n');

      const cleanPhone = merchant.whatsapp.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
      navigate(`/receipt/mock-pending-${product.id}`);
    }
    onClose();
  };

  const bank = merchant.bank_account;

  return (
    <BaseDrawer open={open} onClose={onClose} title={product.is_free ? 'Get Resource' : 'Buy Now'}>
      <div className={styles.digitalDrawer}>
        <div className={styles.digitalHero}>
          <img src={product.images[0] ?? `https://picsum.photos/seed/${product.id}/200/200`} alt="" className={styles.digitalHeroImg} />
          <div className={styles.digitalHeroInfo}>
            <h3 className={styles.digitalHeroName}>{product.name}</h3>
            <p className={styles.digitalHeroPrice}>{product.is_free ? 'Free' : formatCurrencyFull(product.price)}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'start' && !product.is_free && (
            <m.div 
              key="start"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <div className={styles.paymentBox}>
                <p className={styles.paymentHint}>Transfer to unlock your download:</p>
                {bank ? (
                  <div className={styles.bankCard}>
                    <div className={styles.bankHeader}>
                      <span>{bank.bank_name}</span>
                      <strong className={styles.bankNumber}>{bank.account_number}</strong>
                    </div>
                    <p className={styles.bankName}>{bank.account_name}</p>
                  </div>
                ) : (
                  <div className={styles.noBankNotice}>
                    <AlertTriangle size={14} />
                    <span>Contact seller on WhatsApp for payment details.</span>
                  </div>
                )}
              </div>
              <button className={`${styles.actionBtn} ${styles.ctaPrimary}`} onClick={() => setStep('form')}>
                I've Made the Transfer →
              </button>
            </m.div>
          )}

          {(step === 'form' || product.is_free) && (
            <m.div 
              key="form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className={styles.acquisitionForm}
            >
              <div className={styles.fieldGroup}>
                {!product.is_free && (
                  <div className={styles.field}>
                    <label>Full Name</label>
                    <input type="text" placeholder="e.g. Femi Kuti" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                )}
                <div className={styles.field}>
                  <label>Email for delivery</label>
                  <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              <p className={styles.digitalHint}>
                {product.is_free 
                  ? "We'll send your download link right away."
                  : "The seller will verify your payment and unlock the files shortly."}
              </p>
              <button 
                className={`${styles.actionBtn} ${styles.ctaPrimary}`} 
                onClick={handleAction}
                disabled={submitting || !email.trim() || (!product.is_free && !name.trim())}
              >
                {submitting ? 'Processing...' : product.is_free ? 'Send Me the Files →' : 'Submit Proof →'}
              </button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </BaseDrawer>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ItemDetailPage() {
  const { handle, item_id } = useParams<{ handle: string; item_id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(true);
  const [merchant, setMerchant] = useState<Merchant>(FIXTURE_MERCHANT);
  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [pendingClaim, setPendingClaim] = useState<ClaimRequest | null>(null);
  const { addToast } = useUIStore();
  const { initFromDB: initHolds, getHoldForProduct } = useHoldStore();

  // Phase 3B: Fetch data from API with fixture fallback
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const hasApi = !!import.meta.env.VITE_API_URL;

      if (hasApi && handle && item_id) {
        try {
          // Optimization: If we already have the item, we still need the merchant for theme/config
          const [m, p, claim] = await Promise.all([
            getMerchantByHandle(handle),
            getProductById(item_id),
            getPendingClaimForProduct(item_id)
          ]);
          // Also fetch all merchant products for "Related Items"
          const allP = await getProductsByMerchant(m.id);
          
          setMerchant(m);
          setProduct(p);
          setProducts(allP);
          setPendingClaim(claim);
          initHolds(m.id);
          setIsLoading(false);
          return;
        } catch (err) {
          console.error('Failed to fetch item data:', err);
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
      setProduct(fProducts.find(p => p.id === item_id));
      setIsLoading(false);
    };

    fetchData();
  }, [handle, item_id]);
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

  // Vendor Window Logic
  const activeWindow = useMemo(() => {
    if (!st.isVendor) return null;
    return FIXTURE_WINDOWS.find(w => w.merchant_id === merchant.id && w.status === 'open');
  }, [st.isVendor, merchant.id]);

  const windowState = activeWindow ? 'open' : 'closed';
  
  const vendorNotifyLink = buildVendorNotifyLink(merchant.whatsapp, merchant.store_name);

  const [selectedImage,    setSelectedImage]    = useState(0);
  const [lightboxOpen,     setLightboxOpen]      = useState(false);
  const [selectedVariants, setSelectedVariants]  = useState<Record<string, string>>({});
  const [claimSheetOpen,   setClaimSheetOpen]    = useState(false);
  const [holdSheetOpen,    setHoldSheetOpen]     = useState(false);
  const [bookingSheetOpen, setBookingSheetOpen]  = useState(false);
  const [digitalDrawerOpen, setDigitalDrawerOpen] = useState(false);
  const [proofModalOpen,   setProofModalOpen]    = useState(false);
  const [enquirySubmitted, setEnquirySubmitted]  = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({
    name: '', company: '', budget: '', timeline: '', message: '', projectType: ''
  });
  const [claims,           setClaims]            = useState<ClaimRequest[]>(FIXTURE_CLAIMS);
  const { addHold, getHoldForProduct } = useHoldStore();

  const { add, has, clearIfDifferentStore, open: openBasket, items: basketItems } = useBasketStore();
  const { addToast } = useUIStore();
  const inBasket = product ? has(product.id) : false;

  // Phase 3B: Clear bag if different store
  useEffect(() => {
    if (merchant.id) {
      clearIfDifferentStore(merchant.id);
    }
  }, [merchant.id, clearIfDifferentStore]);

  // Phase 3G: Recently browsed tracking
  useEffect(() => {
    if (!product || !handle) return;
    
    const key = `trovea_recent_${handle}`;
    const now = Date.now();
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Filter out old (>24h) and current
    const filtered = existing.filter((i: any) => 
      (now - i.timestamp < 86400000) && i.id !== product.id
    );
    
    const newList = [
      { 
        id: product.id, 
        name: product.name, 
        price: product.price, 
        image: product.images[0] ?? `https://picsum.photos/seed/${product.id}/300/300`,
        timestamp: now 
      },
      ...filtered
    ].slice(0, 6);
    
    localStorage.setItem(key, JSON.stringify(newList));
  }, [product, handle]);

  const touchStart = useRef<number | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const autoEnquire = searchParams.get('action') === 'enquire';

  useEffect(() => {
    if (autoEnquire && st.isStudio && product?.product_type === 'package') {
      setEnquiryForm(f => ({ ...f, projectType: product.name }));
      setTimeout(() => {
        document.querySelector('[data-enquiry-form]')?.scrollIntoView({ behavior: 'smooth' });
      }, 400);
    }
  }, [autoEnquire, product, st.isStudio]);

  const collection = useMemo(
    () => product ? FIXTURE_COLLECTIONS.find((c) => c.id === product.collection_id) : null,
    [product]
  );

  const relatedProducts = useMemo(() => {
    const others = products.filter((p) => p.id !== item_id && p.status !== 'hidden');
    // Phase 3G: Prioritize same collection
    const sameCollection = collection
      ? others.filter(p => p.collection_id === collection.id)
      : [];
    const rest = others.filter(p => !sameCollection.some(s => s.id === p.id));
    return [...sameCollection, ...rest].slice(0, 4);
  }, [item_id, products, collection]);

  const relatedSectionTitle = useMemo(() => {
    // If we have at least one from same collection, show collection name
    const fromCollection = collection ? relatedProducts.filter(p => p.collection_id === collection.id) : [];
    if (fromCollection.length > 0 && collection) {
      return `More from ${collection.name}`;
    }
    return `More from ${merchant.store_name}`;
  }, [relatedProducts, collection, merchant.store_name]);

  const addClaim = useCallback((claim: ClaimRequest) => {
    setClaims((prev) => [claim, ...prev]);
    setClaimSheetOpen(false);
    addToast('Claim submitted! Verification in progress.', 'success');
  }, [addToast]);

  const onHoldCreated = useCallback((hold: HoldRequest) => {
    addHold(hold);
    setHoldSheetOpen(false);
    addToast('Item placed on hold for you.', 'success');
  }, [addToast, addHold]);

  const hasPendingClaim = useCallback(
    (productId: string) =>
      claims.some((c) => c.product_id === productId && c.status === 'pending'),
    [claims],
  );
const activeHold = useMemo(
  () => product ? getHoldForProduct(product.id) : null,
  [product, getHoldForProduct],
);

const isClaimed = !!pendingClaim;

if (isLoading) return <ItemDetailSkeleton />;
if (!product) {

  const isPaused = merchant.is_paused; 
  const bagEligible = st.isCollector || st.isVendor || st.isDigital;
  const checkoutEligible = merchant.checkout_enabled && 
    (st.isCollector || st.isVendor);

  const whatsappContactLink = buildStoreContactLink(merchant.whatsapp, merchant.store_name);
  const whatsappBuyLink = product ? buildChatToBuyLink({
    phone: merchant.whatsapp,
    itemName: product.name,
    price: product.price,
    storeName: merchant.store_name,
  }) : '#';

  const studioPackageWaLink = st.isStudio && product?.product_type === 'package'
    ? buildStudioEnquiryLink({
        phone: merchant.whatsapp,
        storeName: merchant.store_name,
        projectName: product.name,
        clientName: 'Buyer',
        message: 'I\'m interested in this package.',
      })
    : whatsappContactLink;

  const claimCtaLabel = useMemo(() => {
    if (st.isHost || st.isStudio) return 'Book & Pay Deposit';
    if (st.isVendor) return 'Claim Pre-order';
    return 'Claim Piece';
  }, [st.isHost, st.isStudio, st.isVendor]);

  if (!product) {
    return (
      <div className={styles.errorPage}>
        <div
          className={`sf-themed ${styles.root}`}
          data-palette={paletteId}
          data-dark={isDark}
        >
          <div className={styles.notFound}>
            <h1>Item not found</h1>
            <Link to={`/store/${handle}`} className={styles.backLink}>Back to Store</Link>
          </div>
        </div>
      </div>
    );
  }

  const isSoldOut  = product.status === 'sold_out' || product.stock_level === 0;
  const isLowStock = !isSoldOut && product.stock_level === 1;

  const handleBasketToggle = useCallback(() => {
    if (!product || isSoldOut) return;
    if (inBasket) {
      // Phase 3B: Navigate back and open basket instead of removing
      navigate(`/store/${handle}`);
      openBasket();
    } else {
      add({
        id:    product.id,
        name:  product.name,
        price: product.price,
        image: product.images[0] ?? `https://picsum.photos/seed/${product.id}/300/300`,
        variantLabel: Object.entries(selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ') || undefined,
      }, merchant.id);
    }
  }, [product, inBasket, selectedVariants, add, navigate, handle, openBasket, isSoldOut, merchant.id]);

  const variantGroups = useMemo(() => {
    if (!product.variants?.length) return [];
    const map = new Map<string, ProductVariant[]>();
    product.variants.forEach((v) => {
      if (!map.has(v.label)) map.set(v.label, []);
      map.get(v.label)!.push(v);
    });
    return Array.from(map.entries()).map(([name, opts]) => ({ name, opts }));
  }, [product.variants]);

  const selectVariant = (groupName: string, value: string) =>
    setSelectedVariants((prev) => ({ ...prev, [groupName]: value }));

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product.name, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      addToast('Link copied.', 'info');
    }
  };

  const onTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    const len  = images.length;
    if (Math.abs(diff) > 40) {
      setSelectedImage((i) => diff > 0 ? (i + 1) % len : (i - 1 + len) % len);
    }
    touchStart.current = null;
  };

  const images = product.images.length > 0
    ? product.images
    : [`https://picsum.photos/seed/${product.id}/600/600`];

  // Hold eligibility — Collector and Vendor only
  const holdEligible =
    merchant.holds_enabled &&
    product.status === 'live' &&
    !merchant.is_paused &&
    (st.isCollector || st.isVendor);

  // Payment proof
  const showPaymentProof =
    !merchant.checkout_enabled &&
    !merchant.holds_enabled &&
    !isSoldOut &&
    !st.isHost &&
    !st.isStudio;

  // Studio Package View
  if (st.isStudio && product.product_type === 'package') {
    return (
      <div className={`sf-themed ${styles.page}`} data-palette={paletteId} data-dark={isDark}>
        <nav className={styles.navBar}>
          <Link to={`/store/${handle}`} className={styles.backBtn} aria-label="Back">
            <ArrowLeft size={16} />
          </Link>
          <span className={styles.navStoreName}>{merchant.store_name} · Package Proposal</span>
          <button className={styles.shareBtn} onClick={handleShare} aria-label="Share">
            <Share2 size={15} />
          </button>
        </nav>

        <div className={styles.proposalLayout}>
          <header className={styles.proposalHeader}>
            <h1 className={styles.proposalTitle}>{product.name}</h1>
            <div className={styles.proposalPrice}>
              {product.price_type === 'custom' ? 'Custom Quote' : `From ${formatCurrencyFull(product.price)}`}
            </div>
            <div className={styles.proposalBrief}>
              {product.deposit_pct && <span>{product.deposit_pct}% deposit</span>}
              {product.timeline_estimate && <span> · {product.timeline_estimate}</span>}
            </div>
          </header>

          <section className={styles.proposalSection}>
            <h2 className={styles.proposalSectionTitle}>What's Included</h2>
            <ul className={styles.deliverablesList}>
              {(product.deliverables?.includes('\n') 
                ? product.deliverables.split('\n') 
                : product.deliverables?.split(',') || []
              ).map((d, i) => (
                <li key={i}>{d.trim()}</li>
              ))}
            </ul>
          </section>

          <section className={styles.proposalSection}>
            <h2 className={styles.proposalSectionTitle}>About this Package</h2>
            <p className={styles.proposalDescription}>{product.scope_description}</p>
          </section>

          <section className={styles.proposalSection} data-enquiry-form>
            <h2 className={styles.proposalSectionTitle}>Send Enquiry</h2>
            {enquirySubmitted ? (
              <div className={styles.enquirySuccess}>
                <Check size={24} className={styles.successIcon} />
                <p>Enquiry received! {merchant.store_name} will get back to you shortly.</p>
              </div>
            ) : (
              <div className={styles.enquiryForm}>
                <div className={styles.enquiryRow}>
                  <div className={styles.enquiryField}>
                    <label>Client Name *</label>
                    <input 
                      type="text" 
                      placeholder="Your name" 
                      value={enquiryForm.name}
                      onChange={e => setEnquiryForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className={styles.enquiryField}>
                    <label>Company</label>
                    <input 
                      type="text" 
                      placeholder="Optional" 
                      value={enquiryForm.company}
                      onChange={e => setEnquiryForm(f => ({ ...f, company: e.target.value }))}
                    />
                  </div>
                </div>
                <div className={styles.enquiryRow}>
                  <div className={styles.enquiryField}>
                    <label>Timeline</label>
                    <select 
                      value={enquiryForm.timeline}
                      onChange={e => setEnquiryForm(f => ({ ...f, timeline: e.target.value }))}
                    >
                      <option value="Flexible">Select timeline (Optional)</option>
                      {['ASAP', 'Within 1 month', 'Next 3 months', 'Planning phase'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className={styles.enquiryField}>
                    <label>Budget</label>
                    <select 
                      value={enquiryForm.budget}
                      onChange={e => setEnquiryForm(f => ({ ...f, budget: e.target.value }))}
                    >
                      <option value="Open">Select range (Optional)</option>
                      {['Under ₦200k', '₦200k–₦500k', '₦500k–₦1.5m', 'Over ₦1.5m'].map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div className={styles.enquiryField}>
                  <label>Brief / Message *</label>
                  <textarea 
                    rows={4} 
                    placeholder="Tell us about your goals for this project..."
                    value={enquiryForm.message}
                    onChange={e => setEnquiryForm(f => ({ ...f, message: e.target.value }))}
                  />
                </div>
                <button 
                  className={styles.proposalSubmitBtn}
                  onClick={() => {
                    if (!enquiryForm.name || !enquiryForm.message) {
                      addToast('Name and brief are required', 'error');
                      return;
                    }
                    
                    const waLink = buildStudioEnquiryLink({
                      phone: merchant.whatsapp,
                      storeName: merchant.store_name,
                      projectName: product.name,
                      clientName: enquiryForm.name,
                      company: enquiryForm.company,
                      budget: enquiryForm.budget,
                      timeline: enquiryForm.timeline,
                      message: enquiryForm.message,
                    });

                    window.open(waLink, '_blank');
                    setEnquirySubmitted(true);
                    addToast('Brief sent via WhatsApp', 'success');
                  }}
                >
                  Start Consultation →
                </button>
                <a 
                  href={studioPackageWaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.proposalWaBtn}
                >
                  Or chat on WhatsApp →
                </a>
              </div>
            )}
          </section>

          {images.length > 0 && (
            <section className={styles.proposalGallery}>
              {images.map((img, i) => (
                <img key={i} src={img} alt="" className={styles.proposalGalleryImg} />
              ))}
            </section>
          )}
        </div>
      </div>
    );
  }

  const variantString = Object.entries(selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ');

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
            {st.isVendor && product.stock_level !== null && (
              <span className={`${styles.stockBadge} ${styles.stockClaim}`}>
                {product.stock_level} remaining this window
              </span>
            )}
            {product.claim_mode && !isSoldOut && !st.isVendor && (
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
            {isClaimed ? (
              <span className={`${styles.actionBtn} ${styles.actionBtnDisabled}`}>Reserved</span>

            ) : isPaused ? (
              <div className={styles.pauseBanner}>
                <AlertTriangle size={13} />
                <span>
                  {merchant.is_paused 
                    ? (merchant.pause_message ?? 'Ordering unavailable while this store is paused.') 
                    : 'Ordering is currently closed. Check back during our next session.'}
                </span>
              </div>

            ) : isSoldOut ? (
              <span className={`${styles.actionBtn} ${styles.actionBtnDisabled}`}>Sold Out</span>

            ) : st.isVendor && windowState !== 'open' ? (
              <>
                <button className={`${styles.actionBtn} ${styles.actionBtnDisabled}`} disabled>
                  Window Closed
                </button>
                <a
                  href={vendorNotifyLink}
                  className={`${styles.actionBtn} ${styles.ctaSecondary}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={16} />
                  Notify me when open
                </a>
              </>

            ) : st.isHost ? (
              <button
                className={`${styles.actionBtn} ${styles.ctaPrimary}`}
                onClick={() => setBookingSheetOpen(true)}
              >
                <Calendar size={16} />
                Book a Slot
              </button>

            ) : st.isStudio ? (
              product.product_type === 'package' && product.price_type !== 'custom' ? (
                <m.button
                  className={`${styles.actionBtn} ${styles.ctaPrimary}`}
                  onClick={() => setClaimSheetOpen(true)}
                  whileTap={{ scale: 0.97 }}
                >
                  <Tag size={15} />
                  Book & Pay Deposit
                </m.button>
              ) : (
                <a
                  href={whatsappContactLink}
                  className={`${styles.actionBtn} ${styles.ctaPrimary}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={16} />
                  {product.product_type === 'package' ? 'Book Package' : 'Request Quote'}
                </a>
              )

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
                      ? <><Check size={15} /> In Bag ({basketItems.length})</>
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

            ) : st.isDigital ? (
              <>
                <button
                  className={`${styles.actionBtn} ${styles.ctaPrimary}`}
                  onClick={() => setDigitalDrawerOpen(true)}
                >
                  {product.is_free ? (
                    <><Download size={16} /> Get Free</>
                  ) : (
                    <><ShoppingBag size={16} /> Buy Now</>
                  )}
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
                {!product.is_free && (
                  <button
                    className={styles.paidLink}
                    onClick={() => setProofModalOpen(true)}
                  >
                    I've already paid →
                  </button>
                )}
              </>

            ) : bagEligible ? (
              <>
                <button
                  className={`${styles.actionBtn} ${inBasket ? styles.actionBtnBasketAdded : styles.ctaPrimary}`}
                  onClick={handleBasketToggle}
                >
                  {inBasket
                    ? <><Check size={15} /> In Bag ({basketItems.length})</>
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
            {!isSoldOut && !isClaimed && holdEligible && (
              activeHold ? (
                <div className={styles.holdStatusText}>
                  <Clock size={12} />
                  On hold · {formatHoldTime(activeHold.expires_at)} remaining
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
          <p className={styles.moreSectionTitle}>{relatedSectionTitle}</p>
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
      <BookingRequestSheet
        open={bookingSheetOpen}
        onClose={() => setBookingSheetOpen(false)}
        service={product}
        merchant={merchant}
      />

      <ClaimSheet
        open={claimSheetOpen}
        onClose={() => setClaimSheetOpen(false)}
        product={product}
        merchant={merchant}
        variantLabel={variantString || null}
        hasPendingClaim={hasPendingClaim(product.id)}
        isDeposit={st.isStudio && product.product_type === 'package'}
        onClaimSubmitted={addClaim}
      />

      {/* ── Hold Sheet ── */}
      <HoldSheet
        open={holdSheetOpen}
        onClose={() => setHoldSheetOpen(false)}
        product={product}
        merchant={merchant}
        hasActiveHold={!!activeHold}
        onHoldCreated={onHoldCreated}
      />

      {/* ── Payment Proof Modal ── */}
      <PaymentProofModal
        open={proofModalOpen}
        onClose={() => setProofModalOpen(false)}
        product={product}
        merchant={merchant}
      />

      {/* ── Digital Acquisition Drawer ── */}
      <DigitalAcquisitionDrawer
        open={digitalDrawerOpen}
        onClose={() => setDigitalDrawerOpen(false)}
        product={product}
        merchant={merchant}
      />

    </div>
  );
}
