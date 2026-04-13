/**
 * Trovéa — ReceiptPage (Phase 2.5-G: The Seal v2)
 * Sealed document aesthetic: wax seal motif, ceremonial timeline,
 * premium typography. This is the "proof of care" moment.
 *
 * All 5 store types:
 * - Collector: Item thumbnails, Smart Drop CTA
 * - Vendor: Fulfilment Detail block, Smart Next Window CTA
 * - Host: Arrival Instructions, Cancellation Policy, Add to Calendar
 * - Creator: File type/size on links, Bundle savings, Explore More
 * - Studio: Financial summary, Deliverables checklist, Download as PDF
 */

import { useState, useMemo, useEffect, type ElementType } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  Share2, Check, Package, Calendar, Download, 
  Briefcase, Bell, ExternalLink,
  Printer, Clock, Lock
} from 'lucide-react';
import { m, staggerContainer } from '@/lib/motion';
import { 
  FIXTURE_RECEIPTS, 
  FIXTURE_MERCHANT,
  FIXTURE_VENDOR_MERCHANT,
  FIXTURE_HOST_MERCHANT,
  FIXTURE_DIGITAL_MERCHANT,
  FIXTURE_STUDIO_MERCHANT,
  FIXTURE_PRODUCTS,
  FIXTURE_VENDOR_PRODUCTS,
  FIXTURE_HOST_PRODUCTS,
  FIXTURE_DIGITAL_PRODUCTS,
  FIXTURE_STUDIO_PRODUCTS,
  FIXTURE_DROPS,
  FIXTURE_WINDOWS
} from '@/lib/fixtures';
import { formatCurrencyFull, formatDate } from '@/lib/utils/format';
import { buildStoreContactLink, buildBalanceDueLink, buildDeliverablesLink, buildRevisionRequestLink } from '@/lib/utils/whatsapp';
import type { ReceiptType, ShipmentStatus, Product, Receipt } from '@/lib/types';
import { usePaletteTheme } from '@/lib/hooks/usePaletteTheme';
import { useUIStore } from '@/lib/store/ui.store';
import { getReceiptBySealId } from '@/lib/api/receipts.api';
import MiniCard from '@/features/public/components/MiniCard/MiniCard';
import styles from './ReceiptPage.module.css';

// ─── Per-type metadata ─────────────────────────────────────────────────────

interface ReceiptTypeMeta {
  sealName:         string;
  paidLabel:        string;
  pendingLabel:     string;
  cancelledLabel:   string;
  itemsSectionLabel: string;
  issuedToLabel:    string;
  showShipTracker:  boolean;
  shipTitle:        string;
  shipSteps:        { status: ShipmentStatus; label: string }[];
  contactBtnLabel:  string;
  ContactBtnIcon:   ElementType;
  showThumbnails:   boolean;
}

const STATUS_ORDER: ShipmentStatus[] = ['not_started', 'packed', 'shipped', 'received'];

function getReceiptTypeMeta(type: ReceiptType): ReceiptTypeMeta {
  switch (type) {
    case 'order':
      return {
        sealName:         'Order Receipt',
        paidLabel:        'Fulfilled',
        pendingLabel:     'Pending',
        cancelledLabel:   'Cancelled',
        itemsSectionLabel: 'Items Ordered',
        issuedToLabel:    'Ordered by',
        showShipTracker:  true,
        shipTitle:        'Order Status',
        shipSteps: [
          { status: 'not_started', label: 'Received' },
          { status: 'packed',      label: 'Preparing' },
          { status: 'shipped',     label: 'Ready' },
          { status: 'received',    label: 'Delivered' },
        ],
        contactBtnLabel:  'Contact Vendor on WhatsApp',
        ContactBtnIcon:   Package,
        showThumbnails:   false,
      };
    case 'booking':
      return {
        sealName:         'Booking Confirmation',
        paidLabel:        'Confirmed',
        pendingLabel:     'Pending Confirmation',
        cancelledLabel:   'Cancelled',
        itemsSectionLabel: 'Service Booked',
        issuedToLabel:    'Booked by',
        showShipTracker:  false,
        shipTitle:        '',
        shipSteps:        [],
        contactBtnLabel:  'Contact Host on WhatsApp',
        ContactBtnIcon:   Calendar,
        showThumbnails:   false,
      };
    case 'download':
      return {
        sealName:         'Purchase Receipt',
        paidLabel:        'Delivered',
        pendingLabel:     'Pending',
        cancelledLabel:   'Refunded',
        itemsSectionLabel: 'Products',
        issuedToLabel:    'Issued to',
        showShipTracker:  false,
        shipTitle:        '',
        shipSteps:        [],
        contactBtnLabel:  'Contact Creator on WhatsApp',
        ContactBtnIcon:   Download,
        showThumbnails:   false,
      };
    case 'project':
      return {
        sealName:         'Project Brief',
        paidLabel:        'Active',
        pendingLabel:     'Pending',
        cancelledLabel:   'Closed',
        itemsSectionLabel: 'Package',
        issuedToLabel:    'Issued to',
        showShipTracker:  false,
        shipTitle:        '',
        shipSteps:        [],
        contactBtnLabel:  'Contact Studio on WhatsApp',
        ContactBtnIcon:   Briefcase,
        showThumbnails:   false,
      };
    default: // 'sale'
      return {
        sealName:         'Receipt',
        paidLabel:        'Paid',
        pendingLabel:     'Awaiting Payment',
        cancelledLabel:   'Cancelled',
        itemsSectionLabel: 'Items',
        issuedToLabel:    'Issued to',
        showShipTracker:  true,
        shipTitle:        'Delivery Status',
        shipSteps: [
          { status: 'not_started', label: 'Processing' },
          { status: 'packed',      label: 'Packed' },
          { status: 'shipped',     label: 'Shipped' },
          { status: 'received',    label: 'Received' },
        ],
        contactBtnLabel:  'Contact Seller on WhatsApp',
        ContactBtnIcon:   Package,
        showThumbnails:   true,
      };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const getMerchantById = (id: string) => {
  if (id === FIXTURE_VENDOR_MERCHANT.id) return FIXTURE_VENDOR_MERCHANT;
  if (id === FIXTURE_HOST_MERCHANT.id) return FIXTURE_HOST_MERCHANT;
  if (id === FIXTURE_DIGITAL_MERCHANT.id) return FIXTURE_DIGITAL_MERCHANT;
  if (id === FIXTURE_STUDIO_MERCHANT.id) return FIXTURE_STUDIO_MERCHANT;
  return FIXTURE_MERCHANT;
};

const getProductById = (id: string | null) => {
  if (!id) return null;
  const allProducts = [
    ...FIXTURE_PRODUCTS,
    ...FIXTURE_VENDOR_PRODUCTS,
    ...FIXTURE_HOST_PRODUCTS,
    ...FIXTURE_DIGITAL_PRODUCTS,
    ...FIXTURE_STUDIO_PRODUCTS
  ];
  return allProducts.find(p => p.id === id) || null;
};

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

const getFileSizeEstimate = (productName: string): string => {
  const n = productName.toLowerCase();
  if (n.includes('kit')) return '~24 MB';
  if (n.includes('preset')) return '~8 MB';
  if (n.includes('notion') || n.includes('template')) return '~2 MB';
  if (n.includes('after effects')) return '~180 MB';
  return '~5 MB';
};

function statusBadgeClass(status: string) {
  if (status === 'paid')            return styles.statusPaid;
  if (status === 'deposit_paid')    return styles.statusDepositPaid;
  if (status === 'pending_payment') return styles.statusPending;
  return styles.statusCancelled;
}

function statusLabel(status: string, meta: ReceiptTypeMeta) {
  if (status === 'paid')            return meta.paidLabel;
  if (status === 'deposit_paid')    return 'Deposit Paid';
  if (status === 'pending_payment') return meta.pendingLabel;
  return meta.cancelledLabel;
}

function relDate(iso: string) {
  const d    = new Date(iso);
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (hours < 1)  return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return formatDate(iso, 'short');
}

// ─── Wax Seal SVG ─────────────────────────────────────────────────────────

function WaxSeal({ initial }: { initial: string }) {
  return (
    <svg
      className={styles.waxSeal}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M36 4 C20 4 8 16 8 32 C8 44 14 50 18 56 C22 62 28 68 36 68 C44 68 50 62 54 56 C58 50 64 44 64 32 C64 16 52 4 36 4Z"
        className={styles.waxSealCircle}
      />
      <path
        d="M36 18 L39 28 L50 28 L41 34 L44 44 L36 38 L28 44 L31 34 L22 28 L33 28Z"
        className={styles.waxSealInner}
      />
      <text
        x="36"
        y="35"
        textAnchor="middle"
        dominantBaseline="middle"
        className={styles.waxSealLetter}
        fontSize="18"
        fontFamily="Georgia, serif"
        fontStyle="italic"
        fill="rgba(240,237,232,0.85)"
      >
        {initial}
      </text>
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ReceiptPage() {
  const { receipt_id } = useParams<{ receipt_id: string }>();
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const [notified, setNotified] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkedDeliverables, setCheckedDeliverables] = useState<Set<number>>(new Set());

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const hasEnv = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (hasEnv && receipt_id) {
        try {
          const r = await getReceiptBySealId(receipt_id);
          if (r) {
            setReceipt(r);
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.error('DB Receipt load failed:', err);
        }
      }

      // Fallback: dynamic mock for Phase 4D or fixture data
      let r = FIXTURE_RECEIPTS.find(
        (r) => r.id === receipt_id || r.seal_id.toLowerCase() === receipt_id?.toLowerCase()
      );

      if (!r && receipt_id?.startsWith('mock-')) {
        const parts = receipt_id.split('-');
        const type = parts[1]; // 'free' or 'pending'
        const productId = parts.slice(2).join('-');
        const product = getProductById(productId);
        const m = FIXTURE_DIGITAL_MERCHANT; // For now default to digital

        if (product) {
          r = {
            id: receipt_id,
            merchant_id: m.id,
            seal_id: `SEAL-${Math.random().toString(36).substring(7).toUpperCase()}`,
            receipt_type: 'download',
            buyer_name: 'Curator',
            buyer_phone: null,
            buyer_email: 'buyer@example.com',
            line_items: [{
              product_id: product.id,
              name: product.name,
              variant_label: null,
              quantity: 1,
              unit_price: product.price,
              total_price: product.price
            }],
            subtotal: product.price,
            discount_amount: 0,
            discount_type: null,
            discount: null,
            delivery_fee: 0,
            total: product.price,
            payment_status: type === 'free' ? 'paid' : 'pending_payment',
            payment_method: type === 'free' ? 'other' : 'bank_transfer',
            shipment_status: type === 'free' ? 'received' : 'not_started',
            notes: null,
            log: [],
            is_quick_item: false,
            sale_note: null,
            fulfilment_type: null,
            order_type: null,
            delivery_status: type === 'free' ? 'sent' : 'manual_pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
      }

      setReceipt(r ?? null);
      setIsLoading(false);
    };

    load();
  }, [receipt_id]);

  const merchant = receipt ? getMerchantById(receipt.merchant_id) : FIXTURE_MERCHANT;
  const { paletteId, isDark } = usePaletteTheme(merchant.store_config?.palette);

  const receiptType = (receipt?.receipt_type ?? 'sale') as ReceiptType;
  const studioProduct = receiptType === 'project' ? getProductById(receipt?.line_items[0]?.product_id ?? null) : null;

  const bundleSavings = useMemo(() => {
    if (!receipt || receiptType !== 'download' || receipt.line_items.length <= 1) return 0;
    const individualTotal = receipt.line_items.reduce((sum, li) => {
      const p = getProductById(li.product_id);
      return sum + (p?.price ?? li.unit_price) * li.quantity;
    }, 0);
    return individualTotal - receipt.total;
  }, [receipt, receiptType]);

  const financialSummary = useMemo(() => {
    if (!receipt || (receiptType !== 'project' && receiptType !== 'booking')) return null;
    const totalValue = receipt.subtotal - receipt.discount_amount;

    // Use explicit deposit fields if stored on receipt
    if (receipt.deposit_amount != null && receipt.balance_due != null) {
      return {
        depositPaid: receipt.deposit_amount,
        balanceDue: receipt.balance_due,
        totalProjectValue: totalValue,
        isFullyPaid: receipt.payment_status === 'paid',
      };
    }

    // Booking: if fully paid, show 0 balance
    if (receiptType === 'booking') {
      return {
        depositPaid: receipt.total,
        balanceDue: 0,
        totalProjectValue: totalValue,
        isFullyPaid: true,
      };
    }

    // Studio project fallback: derive from deposit_pct on the package
    let depositPaid = receipt.total;
    let balanceDue = Math.max(0, totalValue - depositPaid);
    if (balanceDue === 0 && studioProduct?.deposit_pct) {
      const pct = studioProduct.deposit_pct;
      depositPaid = Math.round((totalValue * pct) / 100);
      balanceDue = totalValue - depositPaid;
    }

    return {
      depositPaid,
      balanceDue,
      totalProjectValue: totalValue,
      isFullyPaid: receipt.payment_status === 'paid',
    };
  }, [receipt, receiptType, studioProduct]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: `${meta.sealName} ${receipt?.seal_id}`, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      addToast('Seal link copied to clipboard', 'info');
    }
  };

  const handleAddToCalendar = () => {
    if (!receipt) return;
    const service = FIXTURE_HOST_PRODUCTS.find(p => 
      receipt.line_items[0]?.name === p.name
    );
    const start = new Date(receipt.created_at);
    const duration = service?.duration ?? 60;
    const end = new Date(start.getTime() + duration * 60000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
      `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
      `SUMMARY:${receipt.line_items[0]?.name ?? 'Appointment'} at ${merchant.store_name}`,
      `DESCRIPTION:Booking ref: ${receipt.seal_id}`,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'booking.ics'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.brandBar}>
          <div className="skeleton skeleton-text" style={{ width: '80px', height: '20px' }} />
        </div>
        <div className={styles.doc} style={{ opacity: 0.6 }}>
          <div className={styles.sealHeader} style={{ justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
            <div className="skeleton" style={{ width: '64px', height: '64px', borderRadius: '50%', marginBottom: '16px' }} />
            <div className="skeleton skeleton-text" style={{ width: '140px', height: '24px', marginBottom: '8px' }} />
            <div className="skeleton skeleton-text" style={{ width: '100px', height: '12px' }} />
          </div>
          <div style={{ padding: '24px' }}>
            <div className="skeleton skeleton-text" style={{ width: '40%', height: '10px', marginBottom: '20px' }} />
            {[1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div className="skeleton skeleton-text" style={{ width: '60%', height: '14px' }} />
                <div className="skeleton skeleton-text" style={{ width: '20%', height: '14px' }} />
              </div>
            ))}
            <div style={{ height: '1px', background: 'var(--color-border-dim)', margin: '24px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="skeleton skeleton-text" style={{ width: '30%', height: '16px' }} />
              <div className="skeleton skeleton-text" style={{ width: '25%', height: '24px' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className={`sf-themed ${styles.page}`} data-palette={paletteId} data-dark={isDark}>
        <div className={styles.brandBar}>
          <Link to="/" className={styles.brandLogo}>
            Trov<span className={styles.brandLogoApos}>é</span>a
          </Link>
        </div>
        <div className={styles.notFound}>
          <p className={styles.notFoundTitle}>Seal not found</p>
          <p className={styles.notFoundText}>
            This receipt doesn't exist or may have been removed.
          </p>
        </div>
      </div>
    );
  }

  const meta = getReceiptTypeMeta(receiptType);
  const currentShipIdx = STATUS_ORDER.indexOf(receipt.shipment_status ?? 'not_started');
  const storeInitial = merchant.store_name.charAt(0).toUpperCase();
  const { ContactBtnIcon } = meta;

  const whatsappLink = buildStoreContactLink(merchant.whatsapp, merchant.store_name);
  const sealUrl = `${window.location.origin}/seal/${receipt.seal_id}`;

  // ── Smart Data ──

  const nextDrop = FIXTURE_DROPS.find(
    d => d.merchant_id === receipt.merchant_id && d.status === 'scheduled'
  );

  const nextWindow = FIXTURE_WINDOWS
    .filter(w => w.merchant_id === receipt.merchant_id && w.status === 'upcoming')
    .sort((a, b) => new Date(a.opens_at).getTime() - new Date(b.opens_at).getTime())[0] ?? null;

  const deliverables = studioProduct?.deliverables?.split(/[,\n]/).map(s => s.trim()).filter(Boolean) ?? [];

  return (
    <m.div
      className={`sf-themed ${styles.page}`}
      data-palette={paletteId}
      data-dark={isDark}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.6 } }}
    >
      {/* Brand Bar */}
      <div className={`${styles.brandBar} noPrint`}>
        <Link to="/" className={styles.brandLogo}>
          Trov<span className={styles.brandLogoApos}>é</span>a
        </Link>
        <button className={styles.shareBtn} onClick={handleShare} aria-label="Share Seal">
          <Share2 size={14} />
        </button>
      </div>

      {/* ── Document Card ── */}
      <m.div
        className={`${styles.doc} receiptPrintArea`}
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          transition: { 
            type: 'spring',
            stiffness: 260,
            damping: 32,
            mass: 1.5,
            delay: 0.1 
          } 
        }}
      >
        {/* Seal Header */}
        <div className={styles.sealHeader}>
          <m.div
            initial={{ scale: 2.5, opacity: 0, rotate: -15, y: -60 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              rotate: 0, 
              y: 0,
              transition: { 
                type: 'spring',
                stiffness: 180,
                damping: 25,
                mass: 2,
                duration: 0.9, // The 900ms Ceremony
                delay: 0.6
              } 
            }}
            style={{ display: 'inline-block', marginBottom: 'var(--space-5)' }}
          >
            <WaxSeal initial={storeInitial} />
          </m.div>
          
          <m.p 
            className={styles.sealId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 1.2 } }}
          >
            {meta.sealName}
          </m.p>

          <m.div 
            className={styles.sealStoreRow}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 1.3 } }}
          >
            <span className={styles.sealStoreName}>{merchant.store_name}</span>
            {merchant.verification_tier !== 'unverified' && (
              <span className={`badge-verified ${merchant.verification_tier === 'trusted' ? 'badge-trusted' : ''}`}>
                {merchant.verification_tier === 'trusted' ? '★ Trusted' : '✓ Verified'}
              </span>
            )}
          </m.div>

          <m.span 
            className={styles.sealId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 1.4 } }}
          >
            {receipt.seal_id}
          </m.span>

          <m.span 
            className={styles.sealDate}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 1.5 } }}
          >
            {formatDate(receipt.created_at, 'long')}
          </m.span>

          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1, transition: { delay: 1.6 } }}
          >
            <span className={`${styles.statusBadge} ${statusBadgeClass(receipt.payment_status)}`}>
              <span className={styles.statusDot} />
              {statusLabel(receipt.payment_status, meta)}
            </span>
          </m.div>
        </div>

        {/* Buyer */}
        <m.div 
          className={styles.buyerSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 1.7 } }}
        >
          <p className={styles.buyerLabel}>{meta.issuedToLabel}</p>
          <p className={styles.buyerName}>{receipt.buyer_name}</p>
          {receipt.buyer_phone && (
            <p className={styles.buyerPhone}>{receipt.buyer_phone}</p>
          )}
          {receipt.buyer_email && !receipt.buyer_phone && (
            <p className={styles.buyerPhone}>{receipt.buyer_email}</p>
          )}
        </m.div>

        {/* Line Items */}
        <m.div 
          className={styles.lineItems}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 1.8 } }}
        >
          <p className={styles.lineItemsSectionLabel}>{meta.itemsSectionLabel}</p>
          {receipt.line_items.map((item, i) => {
            const product = getProductById(item.product_id);
            const thumb = product?.images[0];
            const fileType = product ? getFileTypeBadge(product) : null;
            const fileSize = product ? getFileSizeEstimate(product.name) : null;

            return (
              <div key={i} className={styles.lineItem}>
                {meta.showThumbnails && (
                  thumb ? (
                    <img src={thumb} alt="" className={styles.lineItemImg} />
                  ) : (
                    <div className={styles.lineItemPlaceholder}>
                      <Package size={18} />
                    </div>
                  )
                )}
                <div className={styles.lineItemInfo}>
                  <p className={styles.lineItemName}>{item.name}</p>
                  {item.variant_label && (
                    <p className={styles.lineItemVariant}>{item.variant_label}</p>
                  )}
                  {product?.delivery_url && (
                    receipt.payment_status === 'pending_payment' ? (
                      <div className={`${styles.lineItemDownload} ${styles.downloadLocked}`} title="Unlocks after payment verification">
                        <Lock size={10} />
                        {fileType} · {fileSize} · Locked
                      </div>
                    ) : (
                      <a href={product.delivery_url} className={styles.lineItemDownload} target="_blank" rel="noopener noreferrer">
                        <Download size={10} />
                        {fileType} · {fileSize} · Download
                      </a>
                    )
                  )}

                </div>
                <p className={styles.lineItemQtyPrice}>
                  {item.quantity > 1 && `×${item.quantity}  `}
                  {formatCurrencyFull(item.unit_price * item.quantity)}
                </p>
              </div>
            );
          })}
          {bundleSavings > 0 && (
            <div className={styles.savingsNote}>
              You saved {formatCurrencyFull(bundleSavings)} by purchasing {receipt.line_items.length} products together
            </div>
          )}
        </m.div>

        {/* Totals */}
        <m.div 
          className={styles.totalsSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 1.9 } }}
        >
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Subtotal</span>
            <span className={styles.totalValue}>{formatCurrencyFull(receipt.subtotal)}</span>
          </div>
          {receipt.discount_amount > 0 && (
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>
                Discount{receipt.discount_type === 'percent'
                  ? ` (${Math.round((receipt.discount_amount / receipt.subtotal) * 100)}%)`
                  : ''}
              </span>
              <span className={`${styles.totalValue} ${styles.discountValue}`}>
                −{formatCurrencyFull(receipt.discount_amount)}
              </span>
            </div>
          )}
          {receipt.delivery_fee != null && receipt.delivery_fee > 0 && (
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Delivery fee</span>
              <span className={styles.totalValue}>{formatCurrencyFull(receipt.delivery_fee)}</span>
            </div>
          )}
          <div className={`${styles.totalRow} ${styles.totalRowGrand}`}>
            <span className={styles.totalLabelGrand}>Total</span>
            <span className={`${styles.totalValueGrand} text-foil`}>{formatCurrencyFull(receipt.total)}</span>
          </div>
        </m.div>

        {/* Host/Studio: Financial Summary (deposit + balance) */}
        {(receiptType === 'project' || receiptType === 'booking') && financialSummary && (
          <div className={styles.metaBlock}>
            <p className={styles.metaLabel}>Payment Summary</p>
            <div className={styles.totalsSection} style={{ padding: 0, border: 'none' }}>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Deposit paid</span>
                <span className={`${styles.totalValue} ${styles.depositPaidValue}`}>
                  ✓ {formatCurrencyFull(financialSummary.depositPaid)}
                </span>
              </div>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>
                  {receiptType === 'booking' ? 'Balance due at appointment' : 'Balance on completion'}
                </span>
                <span className={styles.totalValue}>
                  {financialSummary.isFullyPaid
                    ? <span className={styles.depositPaidValue}>✓ Fully paid</span>
                    : formatCurrencyFull(financialSummary.balanceDue)}
                </span>
              </div>
              <div className={styles.totalRow} style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 8, marginTop: 4 }}>
                <span className={styles.totalLabel} style={{ fontWeight: 600 }}>
                  {receiptType === 'booking' ? 'Total service fee' : 'Total project value'}
                </span>
                <span className={styles.totalValue} style={{ fontWeight: 600 }}>{formatCurrencyFull(financialSummary.totalProjectValue)}</span>
              </div>
            </div>
            {financialSummary.balanceDue > 0 && !financialSummary.isFullyPaid && (
              <button
                className={styles.collectBalanceBtn}
                onClick={() => {
                  const url = buildBalanceDueLink({
                    phone: receipt.buyer_phone ?? '',
                    buyerName: receipt.buyer_name,
                    projectName: receipt.line_items[0]?.name ?? (receiptType === 'booking' ? 'your appointment' : 'your project'),
                    balanceAmount: financialSummary.balanceDue,
                    storeName: merchant.store_name,
                  });
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
              >
                Request Balance via WhatsApp ↗
              </button>
            )}
          </div>
        )}

        {/* Vendor: Fulfilment Detail */}
        {receiptType === 'order' && (
          <div className={styles.metaBlock}>
            <p className={styles.metaLabel}>Order Details</p>
            <p className={styles.metaValue}>Type: {receipt.order_type === 'walkin' ? 'Walk-in' : 'Pre-order'}</p>
            <p className={styles.metaValue}>Fulfilment: {receipt.fulfilment_type === 'delivery' ? 'Delivery' : 'Pickup'}</p>
            <div style={{ marginTop: 12 }}>
              {receipt.fulfilment_type === 'pickup' ? (
                <p className={styles.metaValueMuted}>Collection window: Sat 5 Apr, 12pm – 6pm</p>
              ) : (
                <p className={styles.metaValueMuted}>Delivery: Courier dispatch after window closes</p>
              )}
            </div>
          </div>
        )}

        {/* Host: Arrival Instructions */}
        {receiptType === 'booking' && merchant.arrival_notes && (
          <div className={styles.metaBlock}>
            <p className={styles.metaLabel}>Arrival Instructions</p>
            <p className={styles.metaValue}>{merchant.arrival_notes}</p>
          </div>
        )}

        {/* Host/Studio: Cancellation Policy */}
        {(receiptType === 'booking' || receiptType === 'project') && (
          <div className={styles.metaBlock}>
            <p className={styles.metaLabel}>Cancellation Policy</p>
            <p className={styles.metaValueMuted}>
              {merchant.cancellation_policy ?? 'Cancellations must be made at least 24 hours in advance. Deposits are non-refundable for late cancellations.'}
            </p>
          </div>
        )}

        {/* Studio: Deliverables Checklist */}
        {receiptType === 'project' && deliverables.length > 0 && (
          <div className={styles.metaBlock}>
            <div className={styles.deliverablesHeader}>
              <p className={styles.metaLabel} style={{ margin: 0 }}>Project Deliverables</p>
              {checkedDeliverables.size === deliverables.length && (
                <span className={styles.deliverablesComplete}>All done ✓</span>
              )}
            </div>
            <div className={styles.deliverableList}>
              {deliverables.map((d, i) => {
                const done = checkedDeliverables.has(i);
                return (
                  <button
                    key={i}
                    className={`${styles.deliverableItem} ${done ? styles.deliverableItemDone : ''}`}
                    onClick={() => {
                      setCheckedDeliverables(prev => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i); else next.add(i);
                        return next;
                      });
                    }}
                  >
                    <div className={`${styles.deliverableCheck} ${done ? styles.deliverableCheckDone : ''}`}>
                      {done && <span>✓</span>}
                    </div>
                    <span className={done ? styles.deliverableTextDone : ''}>{d}</span>
                  </button>
                );
              })}
            </div>

            {/* Send deliverables button */}
            {receipt.payment_status !== 'paid' && (
              <a
                href={buildDeliverablesLink({
                  phone: receipt.buyer_phone ?? '',
                  buyerName: receipt.buyer_name,
                  projectName: receipt.line_items[0]?.name ?? 'your project',
                  storeName: merchant.store_name,
                  sealUrl,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sendDeliverablesBtn}
              >
                Send Deliverables to Client ↗
              </a>
            )}

            {/* Revision request — for buyer */}
            <a
              href={buildRevisionRequestLink({
                phone: merchant.whatsapp ?? '',
                storeName: merchant.store_name,
                projectName: receipt.line_items[0]?.name ?? 'your project',
                sealId: receipt.seal_id,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.revisionRequestBtn}
            >
              Request a Revision ↗
            </a>
          </div>
        )}

        {/* Shipment / Order Tracker — sale + order types only */}
        {meta.showShipTracker && receipt.payment_status === 'paid' && (
          <div className={styles.shipSection}>
            <p className={styles.shipTitle}>{meta.shipTitle}</p>
            <div className={styles.shipTrack}>
              {meta.shipSteps.map((step, i) => {
                const isDone   = i < currentShipIdx;
                const isActive = i === currentShipIdx;
                return (
                  <div
                    key={step.status}
                    className={`${styles.shipStep} ${isDone ? styles.shipStepDone : ''}`}
                  >
                    <div className={`${styles.shipDot} ${isDone ? styles.shipDotDone : ''} ${isActive ? styles.shipDotActive : ''}`}>
                      {isDone
                        ? <Check size={12} color="var(--color-success)" />
                        : <div className={`${styles.shipDotIcon} ${isActive ? styles.shipDotIconActive : ''} ${isDone ? styles.shipDotIconDone : ''}`} />
                      }
                    </div>
                    <span className={`${styles.shipLabel} ${isActive ? styles.shipLabelActive : ''} ${isDone ? styles.shipLabelDone : ''}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        {receipt.notes && (
          <div className={styles.notesSection}>
            <p className={styles.notesLabel}>Note</p>
            <p className={styles.notesText}>{receipt.notes}</p>
          </div>
        )}

        {/* Activity Log */}
        {receipt.log.length > 0 && (
          <div className={styles.logSection}>
            <p className={styles.logTitle}>Activity</p>
            <div className={styles.logList}>
              {[...receipt.log].reverse().map((entry) => (
                <div key={entry.id} className={styles.logEntry}>
                  <div className={styles.logDot} />
                  <p className={styles.logText}>{entry.event}</p>
                  <span className={styles.logTime}>{relDate(entry.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explore More (Phase 3G) */}
        {receiptType !== 'download' && (
          <div className={`${styles.exploreSection} noPrint`}>
            <p className={styles.metaLabel}>More from {merchant.store_name}</p>
            <m.div 
              className={styles.exploreGrid}
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {[
                ...FIXTURE_PRODUCTS,
                ...FIXTURE_VENDOR_PRODUCTS,
                ...FIXTURE_HOST_PRODUCTS,
                ...FIXTURE_STUDIO_PRODUCTS
              ]
                .filter(p => p.merchant_id === merchant.id && p.status === 'live' && !receipt.line_items.some(li => li.product_id === p.id))
                .slice(0, 2)
                .map(p => (
                  <MiniCard 
                    key={p.id} 
                    product={p} 
                    handle={merchant.handle} 
                    cardStyle={merchant.store_config.card_style} 
                  />
                ))
              }
            </m.div>
          </div>
        )}

        {/* Actions */}
        <div className={`${styles.actionsSection} noPrint`}>
          {/* Main Primary CTA */}
          {receiptType === 'booking' ? (
            <button className={`${styles.ctaBtn} ${styles.ctaBtnPrimary}`} onClick={() => navigate(`/store/${merchant.handle}`)}>
              <Clock size={14} /> Book Again
            </button>
          ) : receiptType === 'project' ? (
            <button className={`${styles.ctaBtn} ${styles.ctaBtnPrimary}`} onClick={handleDownloadPDF}>
              <Printer size={14} /> Download as PDF
            </button>
          ) : (
            <a href={whatsappLink} className={styles.whatsappBtn} target="_blank" rel="noopener noreferrer">
              <ContactBtnIcon size={14} />
              {meta.contactBtnLabel}
            </a>
          )}

          {/* Secondary CTA */}
          {receiptType === 'booking' && (
            <button className={`${styles.ctaBtn} ${styles.ctaBtnSecondary}`} onClick={handleAddToCalendar}>
              <Calendar size={14} /> Add to Calendar
            </button>
          )}

          {receiptType === 'download' && (
            <>
              {/* Delivery confirmation panel */}
              <div className={styles.deliveryConfirmPanel}>
                {receipt.delivery_status === 'manual_pending' ? (
                  <>
                    <div className={styles.deliveryConfirmIcon}>⏳</div>
                    <p className={styles.deliveryConfirmTitle}>Files coming soon</p>
                    <p className={styles.deliveryConfirmBody}>
                      {merchant.display_name} will send your files to{' '}
                      <strong>{receipt.buyer_email ?? 'your email'}</strong> within 24 hours.
                    </p>
                  </>
                ) : (
                  <>
                    <div className={styles.deliveryConfirmIcon}>✓</div>
                    <p className={styles.deliveryConfirmTitle}>Files sent</p>
                    <p className={styles.deliveryConfirmBody}>
                      Your download link was sent to{' '}
                      <strong>{receipt.buyer_email ?? 'your email'}</strong>.
                      Check your inbox (and spam folder).
                    </p>
                  </>
                )}
              </div>
              <button className={`${styles.ctaBtn} ${styles.ctaBtnSecondary}`} onClick={() => navigate(`/store/${merchant.handle}`)}>
                <ExternalLink size={14} /> Explore More
              </button>
            </>
          )}

          {receiptType === 'sale' && nextDrop && (
            <div className={styles.dropCta}>
              <p className={styles.dropCtaLabel}>Next Drop</p>
              <p className={styles.dropCtaTitle}>{nextDrop.label}</p>
              <button 
                className={`${styles.dropNotifyBtn} ${notified ? styles.dropNotifyBtnOk : ''}`}
                onClick={() => setNotified(true)}
              >
                {notified ? <><Check size={12} /> Notified</> : <><Bell size={12} /> Notify Me</>}
              </button>
            </div>
          )}

          {receiptType === 'order' && nextWindow ? (
            <div className={styles.dropCta}>
              <p className={styles.dropCtaLabel}>Next Window</p>
              <p className={styles.dropCtaTitle}>
                {formatDate(nextWindow.opens_at, 'short')} · {new Date(nextWindow.opens_at).getHours() % 12 || 12}{new Date(nextWindow.opens_at).getHours() >= 12 ? 'pm' : 'am'}–{new Date(nextWindow.closes_at).getHours() % 12 || 12}{new Date(nextWindow.closes_at).getHours() >= 12 ? 'pm' : 'am'}
              </p>
              <button className={styles.ctaBtn} style={{ width: '100%', marginTop: 8 }} onClick={() => navigate(`/store/${merchant.handle}`)}>
                View Menu
              </button>
            </div>
          ) : receiptType === 'order' && (
            <div className={styles.dropCta}>
              <p className={styles.metaValueMuted} style={{ fontSize: 11 }}>Follow on Instagram for next window dates</p>
              <a 
                href={`https://instagram.com/${merchant.social_links.instagram}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.lineItemDownload}
                style={{ fontSize: 13, marginTop: 8 }}
              >
                @{merchant.social_links.instagram} <ExternalLink size={12} />
              </a>
            </div>
          )}

          <button className={styles.shareReceiptBtn} onClick={handleShare}>
            <Share2 size={13} />
            Share Receipt
          </button>
        </div>
      </m.div>

      <p className={`${styles.poweredBy} noPrint`}>
        Powered by{' '}
        <Link to="/" className={styles.poweredByLink}>Trovéa</Link>
      </p>
    </m.div>
  );
}
