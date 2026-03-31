import { useState } from 'react';
import { Link } from 'react-router-dom';
import { m, AnimatePresence } from '@/lib/motion';
import { Check, ExternalLink, Package } from 'lucide-react';
import { useLedgerStore } from '@/lib/store/ledger.store';
import { useUIStore } from '@/lib/store/ui.store';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { formatCurrencyFull, formatDate } from '@/lib/utils/format';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import type { PaymentMethod, Receipt } from '@/lib/types';
import styles from './LedgerPage.module.css';

const ALL_PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'opay', label: 'Opay' },
  { value: 'palmpay', label: 'PalmPay' },
  { value: 'moniepoint', label: 'Moniepoint' },
  { value: 'ussd', label: 'USSD' },
];

export default function LedgerPage() {
  const st = useStoreType();

  const {
    activeTab, setActiveTab,
    filteredReceipts,
    isMultiSelectMode, selectedIds,
    enterMultiSelectMode, exitMultiSelectMode, toggleSelectId,
    markAsPaid, markManyAsPaid, markShipped,
  } = useLedgerStore();
  const { addToast } = useUIStore();

  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [markPaidMethod, setMarkPaidMethod] = useState<PaymentMethod | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const receipts = filteredReceipts();
  const pendingCount = useLedgerStore.getState().receipts.filter(r => r.payment_status === 'pending_payment').length;

  // ── Adaptive tabs ──
  const completedLabel =
    st.isVendor  ? 'Fulfilled' :
    st.isHost    ? 'Confirmed' :
    st.isDigital ? 'Delivered' :
    st.isStudio  ? 'Active'    :
    'Completed';

  const visibleTabs = [
    { value: 'all'       as const, label: 'All' },
    { value: 'pending'   as const, label: 'Pending' },
    ...(st.isHost || st.isDigital || st.isStudio
      ? []
      : [{ value: 'dispatch' as const, label: 'Dispatch' }]),
    { value: 'completed' as const, label: completedLabel },
  ];

  // ── Per-type status labels ──
  const paidLabel =
    st.isVendor  ? 'Fulfilled' :
    st.isHost    ? 'Confirmed' :
    st.isDigital ? 'Delivered' :
    st.isStudio  ? 'Active'    :
    'Paid';

  const cancelledLabel =
    st.isDigital ? 'Refunded' :
    st.isStudio  ? 'Closed'   :
    'Cancelled';

  function getStatusLabel(status: string): string {
    if (status === 'pending_payment') return 'Pending';
    if (status === 'cancelled') return cancelledLabel;
    return paidLabel;
  }

  function getStatusChipClass(status: string): string {
    if (status === 'pending_payment') return styles.chipPending;
    if (status === 'cancelled') return styles.chipCancelled;
    return styles.chipPaid;
  }

  // ── Payment methods (hide Cash for Digital Creator) ──
  const paymentMethods = st.isDigital
    ? ALL_PAYMENT_METHODS.filter(pm => pm.value !== 'cash')
    : ALL_PAYMENT_METHODS;

  // ── Drawer items section label ──
  const itemsSectionLabel =
    st.isVendor  ? 'Items Ordered'   :
    st.isHost    ? 'Service Booked'  :
    st.isDigital ? 'Products'        :
    st.isStudio  ? 'Package'         :
    'Items';

  const openDrawer = (receipt: Receipt) => {
    if (isMultiSelectMode) {
      toggleSelectId(receipt.id);
      return;
    }
    setMarkPaidMethod(null);
    setSelectedReceipt(receipt);
  };

  const handleLongPressStart = (receipt: Receipt) => {
    if (receipt.payment_status !== 'pending_payment') return;
    const timer = setTimeout(() => {
      enterMultiSelectMode(receipt.id);
    }, 600);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleMarkPaid = () => {
    if (!selectedReceipt || !markPaidMethod) return;
    markAsPaid(selectedReceipt.id, markPaidMethod);
    setSelectedReceipt(null);
    addToast('Payment confirmed.', 'success');
  };

  const handleBulkMarkPaid = () => {
    if (!selectedIds.length) return;
    markManyAsPaid(selectedIds, 'bank_transfer');
    addToast(`${selectedIds.length} receipt${selectedIds.length > 1 ? 's' : ''} marked as paid.`, 'success');
  };

  const handleMarkShipped = (receiptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markShipped(receiptId);
    addToast('Marked as shipped.', 'success');
  };

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Ledger</h1>
      </div>

      {/* Tabs */}
      <div className={styles.tabs} role="tablist" aria-label="Filter receipts">
        {visibleTabs.map(tab => (
          <button
            key={tab.value}
            className={`${styles.tab} ${activeTab === tab.value ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.value)}
            role="tab"
            aria-selected={activeTab === tab.value}
            aria-label={tab.label}
          >
            {tab.label}
            {tab.value === 'pending' && pendingCount > 0 && (
              <span className={styles.tabBadge} aria-label={`${pendingCount} pending`}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Receipt List */}
      {receipts.length === 0 ? (
        <div className={styles.emptyState} role="status">
          <span className={styles.emptyIcon}>—</span>
          <h2 className={styles.emptyTitle}>No receipts here.</h2>
        </div>
      ) : (
        <div className={styles.receiptList} role="list">
          <AnimatePresence initial={false}>
            {receipts.map((receipt, i) => (
              <m.div
                key={receipt.id}
                role="listitem"
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.22, delay: i * 0.03 }}
                className={styles.receiptRow}
                onClick={() => openDrawer(receipt)}
                onMouseDown={() => handleLongPressStart(receipt)}
                onMouseUp={handleLongPressEnd}
                onTouchStart={() => handleLongPressStart(receipt)}
                onTouchEnd={handleLongPressEnd}
                tabIndex={0}
                aria-label={`${receipt.buyer_name}, ${formatCurrencyFull(receipt.total)}, ${receipt.payment_status.replace('_', ' ')}`}
                onKeyDown={(e) => { if (e.key === 'Enter') openDrawer(receipt); }}
              >
                {/* Multi-select checkbox */}
                <AnimatePresence>
                  {isMultiSelectMode && receipt.payment_status === 'pending_payment' && (
                    <m.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 22, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`${styles.rowCheckbox} ${selectedIds.includes(receipt.id) ? styles.checked : ''}`}
                      aria-hidden="true"
                    >
                      {selectedIds.includes(receipt.id) && <Check size={12} />}
                    </m.div>
                  )}
                </AnimatePresence>

                {/* Status dot */}
                <div
                  className={`${styles.rowStatus} ${styles[receipt.payment_status === 'pending_payment' ? 'pending' : receipt.payment_status === 'cancelled' ? 'cancelled' : 'paid']}`}
                  aria-hidden="true"
                />

                {/* Body */}
                <div className={styles.rowBody}>
                  <div className={styles.rowBuyer}>{receipt.buyer_name}</div>
                  <div className={styles.rowItems}>
                    {receipt.line_items.map(li => li.name).join(', ')}
                  </div>
                  <div className={styles.rowMeta}>
                    <span className={styles.rowDate}>{formatDate(receipt.created_at, 'relative')}</span>
                    {receipt.payment_method && (
                      <span className={styles.rowPaymentMethod}>{receipt.payment_method.replace('_', ' ')}</span>
                    )}
                    {receipt.shipment_status !== 'not_started' && receipt.shipment_status !== 'received' && (
                      <span className={`${styles.rowShipPill} ${styles[receipt.shipment_status]}`}>
                        {receipt.shipment_status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right */}
                <div className={styles.rowRight}>
                  <span className={styles.rowAmount}>{formatCurrencyFull(receipt.total)}</span>
                  <span className={styles.rowSealId}>{receipt.seal_id}</span>
                  <span className={`${styles.rowStatusChip} ${getStatusChipClass(receipt.payment_status)}`}>
                    {getStatusLabel(receipt.payment_status)}
                  </span>
                  {/* Dispatch action — no drawer needed */}
                  {activeTab === 'dispatch' && receipt.shipment_status === 'packed' && (
                    <button
                      className={styles.dispatchBtn}
                      onClick={(e) => handleMarkShipped(receipt.id, e)}
                      aria-label="Mark as shipped"
                    >
                      Mark Shipped
                    </button>
                  )}
                </div>
              </m.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Bulk Select Bar */}
      <AnimatePresence>
        {isMultiSelectMode && (
          <m.div
            className={styles.bulkBar}
            role="toolbar"
            aria-label="Bulk actions"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
          >
            <span className={styles.bulkBarText}>
              {selectedIds.length > 0
                ? `${selectedIds.length} selected`
                : 'Select receipts'}
            </span>
            <div className={styles.bulkBarActions}>
              <button
                className={styles.bulkMarkPaidBtn}
                onClick={handleBulkMarkPaid}
                disabled={selectedIds.length === 0}
                aria-label={`Mark ${selectedIds.length} as paid`}
              >
                Mark {selectedIds.length > 0 ? selectedIds.length : ''} as Paid
              </button>
              <button
                className={styles.bulkCancelBtn}
                onClick={exitMultiSelectMode}
                aria-label="Cancel bulk selection"
              >
                Cancel
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Receipt Detail Drawer */}
      <BaseDrawer
        open={selectedReceipt !== null}
        onClose={() => setSelectedReceipt(null)}
        title={selectedReceipt?.buyer_name ?? st.receiptLabel}
      >
        {selectedReceipt && (
          <div className={styles.drawerContent}>
            <span className={styles.drawerSealId}>{selectedReceipt.seal_id}</span>

            {/* Line items */}
            <div className={styles.lineItems}>
              <span className={styles.logTitle} style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
                {itemsSectionLabel}
              </span>
              {selectedReceipt.line_items.map((item, i) => (
                <div key={i} className={styles.lineItem}>
                  <div>
                    <div className={styles.lineItemName}>
                      {item.name}
                      {item.quantity > 1 && (
                        <span style={{ color: 'var(--color-fg-muted)', marginLeft: 4 }}>×{item.quantity}</span>
                      )}
                    </div>
                    {item.variant_label && (
                      <div className={styles.lineItemVariant}>{item.variant_label}</div>
                    )}
                  </div>
                  <span className={styles.lineItemPrice}>{formatCurrencyFull(item.total_price)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            {selectedReceipt.discount_amount && selectedReceipt.discount_amount > 0 && (
              <div className={styles.discountRow}>
                <span>Discount</span>
                <span className={styles.discountRowAmount}>−{formatCurrencyFull(selectedReceipt.discount_amount)}</span>
              </div>
            )}
            <div className={styles.drawerTotal}>
              <span className={styles.drawerTotalLabel}>Total</span>
              <span className={styles.drawerTotalAmount}>{formatCurrencyFull(selectedReceipt.total)}</span>
            </div>

            {/* Mark as paid (if pending) */}
            {selectedReceipt.payment_status === 'pending_payment' && (
              <>
                <div>
                  <span className={styles.logTitle} style={{ marginBottom: 'var(--space-3)', display: 'block' }}>
                    Payment Method
                  </span>
                  <div className={styles.paymentMethodGrid} role="group" aria-label="Select payment method">
                    {paymentMethods.map(pm => (
                      <button
                        key={pm.value}
                        className={`${styles.pmPill} ${markPaidMethod === pm.value ? styles.selected : ''}`}
                        onClick={() => setMarkPaidMethod(pm.value === markPaidMethod ? null : pm.value)}
                        aria-pressed={markPaidMethod === pm.value}
                        aria-label={pm.label}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  className={styles.confirmPaidBtn}
                  onClick={handleMarkPaid}
                  disabled={!markPaidMethod}
                  aria-label="Confirm payment received"
                >
                  <Check size={14} aria-hidden="true" />
                  {markPaidMethod ? 'Confirm Payment Received' : 'Select payment method'}
                </button>
              </>
            )}

            {/* Mark packed / shipped / received */}
            {selectedReceipt.payment_status === 'paid' && (
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                {selectedReceipt.shipment_status === 'not_started' && (
                  <button
                    className={styles.confirmPaidBtn}
                    onClick={() => { useLedgerStore.getState().markPacked(selectedReceipt.id); setSelectedReceipt(null); addToast('Marked as packed.', 'success'); }}
                    aria-label="Mark as packed"
                  >
                    <Package size={14} aria-hidden="true" />
                    Mark Packed
                  </button>
                )}
                {selectedReceipt.shipment_status === 'packed' && (
                  <button
                    className={styles.confirmPaidBtn}
                    onClick={() => { markShipped(selectedReceipt.id); setSelectedReceipt(null); addToast('Marked as shipped.', 'success'); }}
                    aria-label="Mark as shipped"
                  >
                    Mark Shipped
                  </button>
                )}
                {selectedReceipt.shipment_status === 'shipped' && (
                  <button
                    className={styles.confirmPaidBtn}
                    onClick={() => { useLedgerStore.getState().markReceived(selectedReceipt.id); setSelectedReceipt(null); addToast('Marked as received.', 'success'); }}
                    aria-label="Mark as received"
                  >
                    Mark Received
                  </button>
                )}
              </div>
            )}

            {/* Log */}
            {selectedReceipt.log && selectedReceipt.log.length > 0 && (
              <div className={styles.logSection}>
                <span className={styles.logTitle}>{st.receiptLabel} Log</span>
                <div className={styles.logTimeline}>
                  {selectedReceipt.log.map((entry, i) => (
                    <div key={i} className={styles.logEntry}>
                      <div className={styles.logEntryEvent}>
                        {entry.event}
                        {entry.actor && (
                          <span className={`${styles.logEntryActor} ${styles[entry.actor]}`}>
                            {entry.actor}
                          </span>
                        )}
                      </div>
                      <div className={styles.logEntryTime}>{formatDate(entry.timestamp, 'relative')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View receipt button */}
            <Link
              to={`/receipt/${selectedReceipt.id}`}
              className={styles.viewReceiptLink}
              aria-label="View full receipt page"
              onClick={() => setSelectedReceipt(null)}
            >
              <ExternalLink size={14} aria-hidden="true" />
              View Full {st.receiptLabel}
            </Link>
          </div>
        )}
      </BaseDrawer>
    </div>
  );
}
