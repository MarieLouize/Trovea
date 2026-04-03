/**
 * Trove'a — ReceiptPage (Phase 2.5-G: The Seal v2)
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

import { useState, useMemo, type ElementType } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  Share2, Check, Package, Calendar, Download, 
  Briefcase, Bell, ArrowRight, ExternalLink,
  ChevronRight, Printer, Clock
} from 'lucide-react';
import { m } from '@/lib/motion';
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
import { buildStoreContactLink } from '@/lib/utils/whatsapp';
import type { ReceiptType, ShipmentStatus, Product } from '@/lib/types';
import { usePaletteTheme } from '@/lib/hooks/usePaletteTheme';
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
  if (status === 'pending_payment') return styles.statusPending;
  return styles.statusCancelled;
}

function statusLabel(status: string, meta: ReceiptTypeMeta) {
  if (status === 'paid')            return meta.paidLabel;
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
  const [notified, setNotified] = useState(false);

  const receipt = FIXTURE_RECEIPTS.find(
    (r) => r.id === receipt_id || r.seal_id.toLowerCase() === receipt_id?.toLowerCase()
  );

  const merchant = receipt ? getMerchantById(receipt.merchant_id) : FIXTURE_MERCHANT;
  const { paletteId, isDark } = usePaletteTheme(merchant.store_config?.palette);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: `${meta.sealName} ${receipt?.seal_id}`, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
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

  if (!receipt) {
    return (
      <div className={`sf-themed ${styles.page}`} data-palette={paletteId} data-dark={isDark}>
        <div className={styles.brandBar}>
          <Link to="/" className={styles.brandLogo}>
            Trove<span className={styles.brandLogoApos}>'</span>a
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

  const receiptType = (receipt.receipt_type ?? 'sale') as ReceiptType;
  const meta = getReceiptTypeMeta(receiptType);
  const currentShipIdx = STATUS_ORDER.indexOf(receipt.shipment_status ?? 'not_started');
  const storeInitial = merchant.store_name.charAt(0).toUpperCase();
  const { ContactBtnIcon } = meta;

  const whatsappLink = buildStoreContactLink(merchant.whatsapp, merchant.store_name);

  // ── Smart Data ──

  const nextDrop = FIXTURE_DROPS.find(
    d => d.merchant_id === receipt.merchant_id && d.status === 'scheduled'
  );

  const nextWindow = FIXTURE_WINDOWS
    .filter(w => w.merchant_id === receipt.merchant_id && w.status === 'scheduled')
    .sort((a, b) => new Date(a.open_at).getTime() - new Date(b.open_at).getTime())[0] ?? null;

  const bundleSavings = useMemo(() => {
    if (receiptType !== 'download' || receipt.line_items.length <= 1) return 0;
    const individualTotal = receipt.line_items.reduce((sum, li) => {
      const p = getProductById(li.product_id);
      return sum + (p?.price ?? li.unit_price) * li.quantity;
    }, 0);
    return individualTotal - receipt.total;
  }, [receipt, receiptType]);

  const studioProduct = receiptType === 'project' ? getProductById(receipt.line_items[0]?.product_id) : null;
  const deliverables = studioProduct?.deliverables?.split(/[,\n]/).map(s => s.trim()).filter(Boolean) ?? [];

  const financialSummary = useMemo(() => {
    if (receiptType !== 'project') return null;
    const totalProjectValue = receipt.subtotal - receipt.discount_amount;
    let depositPaid = receipt.total;
    let balanceDue = Math.max(0, totalProjectValue - depositPaid);

    // Hardcode for mockup if balance is 0 to show the feature
    if (balanceDue === 0 && (studioProduct?.deposit_pct || receipt.id === 'receipt-019')) {
      const pct = studioProduct?.deposit_pct ?? 50;
      depositPaid = (totalProjectValue * pct) / 100;
      balanceDue = totalProjectValue - depositPaid;
    }

    return { depositPaid, balanceDue, totalProjectValue };
  }, [receipt, receiptType, studioProduct]);

  return (
    <m.div
      className={`sf-themed ${styles.page}`}
      data-palette={paletteId}
      data-dark={isDark}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
    >
      {/* Brand Bar */}
      <div className={`${styles.brandBar} noPrint`}>
        <Link to="/" className={styles.brandLogo}>
          Trove<span className={styles.brandLogoApos}>'</span>a
        </Link>
        <button className={styles.shareBtn} onClick={handleShare} aria-label="Share receipt">
          <Share2 size={14} />
        </button>
      </div>

      {/* ── Document Card ── */}
      <m.div
        className={`${styles.doc} receiptPrintArea`}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1, transition: { delay: 0.1, duration: 0.4 } }}
      >
        {/* Seal Header */}
        <div className={styles.sealHeader}>
          <WaxSeal initial={storeInitial} />
          <p className={styles.sealId}>{meta.sealName}</p>
          <div className={styles.sealStoreRow}>
            <span className={styles.sealStoreName}>{merchant.store_name}</span>
            {merchant.verification_tier !== 'unverified' && (
              <span className={`badge-verified ${merchant.verification_tier === 'trusted' ? 'badge-trusted' : ''}`}>
                {merchant.verification_tier === 'trusted' ? '★ Trusted' : '✓ Verified'}
              </span>
            )}
          </div>
          <span className={styles.sealId}>{receipt.seal_id}</span>
          <span className={styles.sealDate}>{formatDate(receipt.created_at, 'long')}</span>
          <div>
            <span className={`${styles.statusBadge} ${statusBadgeClass(receipt.payment_status)}`}>
              <span className={styles.statusDot} />
              {statusLabel(receipt.payment_status, meta)}
            </span>
          </div>
        </div>

        {/* Buyer */}
        <div className={styles.buyerSection}>
          <p className={styles.buyerLabel}>{meta.issuedToLabel}</p>
          <p className={styles.buyerName}>{receipt.buyer_name}</p>
          {receipt.buyer_phone && (
            <p className={styles.buyerPhone}>{receipt.buyer_phone}</p>
          )}
          {receipt.buyer_email && !receipt.buyer_phone && (
            <p className={styles.buyerPhone}>{receipt.buyer_email}</p>
          )}
        </div>

        {/* Line Items */}
        <div className={styles.lineItems}>
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
                  {receiptType === 'download' && product?.delivery_url && (
                    <a href={product.delivery_url} className={styles.lineItemDownload} target="_blank" rel="noopener noreferrer">
                      <Download size={10} />
                      {fileType} · {fileSize} · Download
                    </a>
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
        </div>

        {/* Totals */}
        <div className={styles.totalsSection}>
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
            <span className={styles.totalValueGrand}>{formatCurrencyFull(receipt.total)}</span>
          </div>
        </div>

        {/* Studio: Financial Summary */}
        {receiptType === 'project' && financialSummary && (
          <div className={styles.metaBlock}>
            <p className={styles.metaLabel}>Payment Summary</p>
            <div className={styles.totalsSection} style={{ padding: 0, border: 'none' }}>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Deposit paid now</span>
                <span className={styles.totalValue}>{formatCurrencyFull(financialSummary.depositPaid)}</span>
              </div>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Balance on completion</span>
                <span className={styles.totalValue}>{formatCurrencyFull(financialSummary.balanceDue)}</span>
              </div>
              <div className={styles.totalRow} style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 8, marginTop: 4 }}>
                <span className={styles.totalLabel} style={{ fontWeight: 600 }}>Total project value</span>
                <span className={styles.totalValue} style={{ fontWeight: 600 }}>{formatCurrencyFull(financialSummary.totalProjectValue)}</span>
              </div>
            </div>
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

        {/* Host: Cancellation Policy */}
        {receiptType === 'booking' && (
          <div className={styles.metaBlock}>
            <p className={styles.metaLabel}>Cancellation Policy</p>
            <p className={styles.metaValueMuted}>
              Cancellations must be made at least 24 hours in advance.<br/>
              Deposits are non-refundable for late cancellations.
            </p>
          </div>
        )}

        {/* Studio: Deliverables Checklist */}
        {receiptType === 'project' && deliverables.length > 0 && (
          <div className={styles.metaBlock}>
            <p className={styles.metaLabel}>Project Deliverables</p>
            <div className={styles.deliverableList}>
              {deliverables.map((d, i) => (
                <div key={i} className={styles.deliverableItem}>
                  <div className={styles.deliverableDot} />
                  <span>{d}</span>
                </div>
              ))}
            </div>
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
            <button className={`${styles.ctaBtn} ${styles.ctaBtnSecondary}`} onClick={() => navigate(`/store/${merchant.handle}`)}>
              <ExternalLink size={14} /> Explore More
            </button>
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
                {formatDate(nextWindow.open_at, 'short')} · {new Date(nextWindow.open_at).getHours() % 12 || 12}{new Date(nextWindow.open_at).getHours() >= 12 ? 'pm' : 'am'}–{new Date(nextWindow.closes_at).getHours() % 12 || 12}{new Date(nextWindow.closes_at).getHours() >= 12 ? 'pm' : 'am'}
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
        <Link to="/" className={styles.poweredByLink}>Trove'a</Link>
      </p>
    </m.div>
  );
}
