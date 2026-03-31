/**
 * Trove'a — ReceiptPage (Phase 2I: Per-type adaptive labels)
 * Sealed document aesthetic: wax seal motif, ceremonial timeline,
 * premium typography. This is the "proof of care" moment.
 *
 * Adapts labels, tracker, and sections based on receipt.receipt_type:
 *   sale     → Collector (default)
 *   order    → Vendor food/goods
 *   booking  → Host appointment
 *   download → Digital Creator purchase
 *   project  → Studio brief
 */

import type { ElementType } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Share2, Check, Package, Calendar, Download, Briefcase } from 'lucide-react';
import { m } from '@/lib/motion';
import { FIXTURE_RECEIPTS, FIXTURE_MERCHANT } from '@/lib/fixtures';
import { formatCurrencyFull, formatDate } from '@/lib/utils/format';
import { buildStoreContactLink } from '@/lib/utils/whatsapp';
import type { ReceiptType, ShipmentStatus } from '@/lib/types';
import { usePaletteTheme } from '@/lib/hooks/usePaletteTheme';
import styles from './ReceiptPage.module.css';

// ─── Per-type metadata ─────────────────────────────────────────────────────

interface ReceiptTypeMeta {
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
}

const STATUS_ORDER: ShipmentStatus[] = ['not_started', 'packed', 'shipped', 'received'];

function getReceiptTypeMeta(type: ReceiptType): ReceiptTypeMeta {
  switch (type) {
    case 'order':
      return {
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
      };
    case 'booking':
      return {
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
      };
    case 'download':
      return {
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
      };
    case 'project':
      return {
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
      };
    default: // 'sale'
      return {
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
      };
  }
}

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
      {/* Outer drip shape */}
      <path
        d="M36 4 C20 4 8 16 8 32 C8 44 14 50 18 56 C22 62 28 68 36 68 C44 68 50 62 54 56 C58 50 64 44 64 32 C64 16 52 4 36 4Z"
        className={styles.waxSealCircle}
      />
      {/* Inner star / embossed pattern */}
      <path
        d="M36 18 L39 28 L50 28 L41 34 L44 44 L36 38 L28 44 L31 34 L22 28 L33 28Z"
        className={styles.waxSealInner}
      />
      {/* Initial letter */}
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

// ─── Main ─────────────────────────────────────────────────────────────────

export default function ReceiptPage() {
  const { receipt_id } = useParams<{ receipt_id: string }>();

  const receipt = FIXTURE_RECEIPTS.find(
    (r) => r.id === receipt_id || r.seal_id.toLowerCase() === receipt_id?.toLowerCase()
  );

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: `Receipt ${receipt?.seal_id}`, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
  };

  const { paletteId, isDark } = usePaletteTheme(FIXTURE_MERCHANT.store_config?.palette);

  const whatsappLink = buildStoreContactLink(
    FIXTURE_MERCHANT.whatsapp,
    FIXTURE_MERCHANT.store_name
  );

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

  const meta = getReceiptTypeMeta(receipt.receipt_type);
  const currentShipIdx = STATUS_ORDER.indexOf(receipt.shipment_status ?? 'not_started');
  const storeInitial = FIXTURE_MERCHANT.store_name.charAt(0).toUpperCase();
  const { ContactBtnIcon } = meta;

  return (
    <m.div
      className={`sf-themed ${styles.page}`}
      data-palette={paletteId}
      data-dark={isDark}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
    >
      {/* Brand Bar */}
      <div className={styles.brandBar}>
        <Link to="/" className={styles.brandLogo}>
          Trove<span className={styles.brandLogoApos}>'</span>a
        </Link>
        <button className={styles.shareBtn} onClick={handleShare} aria-label="Share receipt">
          <Share2 size={14} />
        </button>
      </div>

      {/* ── Document Card ── */}
      <m.div
        className={styles.doc}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1, transition: { delay: 0.1, duration: 0.4 } }}
      >
        {/* Seal Header */}
        <div className={styles.sealHeader}>
          <WaxSeal initial={storeInitial} />
          <div className={styles.sealStoreRow}>
            <span className={styles.sealStoreName}>{FIXTURE_MERCHANT.store_name}</span>
            {FIXTURE_MERCHANT.verification_tier !== 'unverified' && (
              <span className={`badge-verified ${FIXTURE_MERCHANT.verification_tier === 'trusted' ? 'badge-trusted' : ''}`}>
                {FIXTURE_MERCHANT.verification_tier === 'trusted' ? '★ Trusted' : '✓ Verified'}
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
          {receipt.line_items.map((item, i) => (
            <div key={i} className={styles.lineItem}>
              <div className={styles.lineItemInfo}>
                <p className={styles.lineItemName}>{item.name}</p>
                {item.variant_label && (
                  <p className={styles.lineItemVariant}>{item.variant_label}</p>
                )}
              </div>
              <p className={styles.lineItemQtyPrice}>
                {item.quantity > 1 && `×${item.quantity}  `}
                {formatCurrencyFull(item.unit_price * item.quantity)}
              </p>
            </div>
          ))}
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
        <div className={styles.actionsSection}>
          <a
            href={whatsappLink}
            className={styles.whatsappBtn}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ContactBtnIcon size={14} />
            {meta.contactBtnLabel}
          </a>
          <button className={styles.shareReceiptBtn} onClick={handleShare}>
            <Share2 size={13} />
            Share Receipt
          </button>
        </div>
      </m.div>

      <p className={styles.poweredBy}>
        Powered by{' '}
        <Link to="/" className={styles.poweredByLink}>Trove'a</Link>
      </p>
    </m.div>
  );
}
