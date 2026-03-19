import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ExternalLink, Package } from 'lucide-react';
import { useLedgerStore } from '@/lib/store/ledger.store';
import { useUIStore } from '@/lib/store/ui.store';
import { formatCurrencyFull, formatDate } from '@/lib/utils/format';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import type { PaymentMethod, Receipt } from '@/lib/types';
import styles from './LedgerPage.module.css';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'dispatch', label: 'Dispatch' },
  { value: 'completed', label: 'Completed' },
] as const;

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'opay', label: 'Opay' },
  { value: 'palmpay', label: 'PalmPay' },
  { value: 'moniepoint', label: 'Moniepoint' },
  { value: 'ussd', label: 'USSD' },
];

export default function LedgerPage() {
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
        {TABS.map(tab => (
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
              <motion.div
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
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 22, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`${styles.rowCheckbox} ${selectedIds.includes(receipt.id) ? styles.checked : ''}`}
                      aria-hidden="true"
                    >
                      {selectedIds.includes(receipt.id) && <Check size={12} />}
                    </motion.div>
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
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Bulk Select Bar */}
      <AnimatePresence>
        {isMultiSelectMode && (
          <motion.div
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Detail Drawer */}
      <BaseDrawer
        open={selectedReceipt !== null}
        onClose={() => setSelectedReceipt(null)}
        title={selectedReceipt?.buyer_name ?? 'Receipt'}
      >
        {selectedReceipt && (
          <div className={styles.drawerContent}>
            <span className={styles.drawerSealId}>{selectedReceipt.seal_id}</span>

            {/* Line items */}
            <div className={styles.lineItems}>
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
                  <span className={styles.lineItemPrice}>{formatCurrencyFull(item.total)}</span>
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
                    {PAYMENT_METHODS.map(m => (
                      <button
                        key={m.value}
                        className={`${styles.pmPill} ${markPaidMethod === m.value ? styles.selected : ''}`}
                        onClick={() => setMarkPaidMethod(m.value === markPaidMethod ? null : m.value)}
                        aria-pressed={markPaidMethod === m.value}
                        aria-label={m.label}
                      >
                        {m.label}
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
                <span className={styles.logTitle}>Receipt Log</span>
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
              View Full Receipt
            </Link>
          </div>
        )}
      </BaseDrawer>
    </div>
  );
}
