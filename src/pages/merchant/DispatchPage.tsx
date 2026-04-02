import { useState } from 'react';
import { m, AnimatePresence } from '@/lib/motion';
import { Package, Check, Truck, CheckCircle, MessageCircle, MapPin } from 'lucide-react';
import { useLedgerStore } from '@/lib/store/ledger.store';
import { useUIStore } from '@/lib/store/ui.store';
import { formatCurrencyFull, formatRelativeDate } from '@/lib/utils/format';
import { buildChatToBuyLink } from '@/lib/utils/whatsapp';
import { FIXTURE_MERCHANT } from '@/lib/fixtures';
import type { ShipmentStatus } from '@/lib/types';
import styles from './DispatchPage.module.css';

type DispatchFilter = 'all' | 'packed' | 'shipped' | 'received';

const PIPELINE_STEPS: { key: ShipmentStatus; label: string }[] = [
  { key: 'not_started', label: 'Pending' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'received', label: 'Received' },
];

const STEP_ORDER: ShipmentStatus[] = ['not_started', 'packed', 'shipped', 'received'];

function PipelineDot({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <div className={styles.pipeStep}>
      <div className={`${styles.pipeDot} ${done ? styles.pipeDotDone : active ? styles.pipeDotActive : styles.pipeDotEmpty}`}>
        {done ? <Check size={12} aria-hidden="true" /> : active ? '●' : '·'}
      </div>
      <span className={`${styles.pipeLabel} ${done ? styles.pipeLabelDone : ''}`}>{label}</span>
    </div>
  );
}

export default function DispatchPage() {
  const { receipts, markShipped, markReceived } = useLedgerStore();
  const { addToast } = useUIStore();
  const [filter, setFilter] = useState<DispatchFilter>('all');

  // Only paid receipts belong in dispatch
  const dispatchReceipts = receipts.filter(
    (r) => r.payment_status === 'paid' && r.shipment_status !== 'not_started'
  );

  const filtered = dispatchReceipts.filter((r) => {
    if (filter === 'all') return true;
    return r.shipment_status === filter;
  });

  const counts: Record<DispatchFilter, number> = {
    all: dispatchReceipts.length,
    packed: dispatchReceipts.filter((r) => r.shipment_status === 'packed').length,
    shipped: dispatchReceipts.filter((r) => r.shipment_status === 'shipped').length,
    received: dispatchReceipts.filter((r) => r.shipment_status === 'received').length,
  };

  const filters: { key: DispatchFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'packed', label: 'Packed' },
    { key: 'shipped', label: 'In Transit' },
    { key: 'received', label: 'Received' },
  ];

  const handleMarkShipped = (id: string) => {
    markShipped(id);
    addToast('Marked as shipped', 'success');
  };

  const handleMarkReceived = (id: string) => {
    markReceived(id);
    addToast('Order complete', 'success');
  };

  const getStatusBadgeClass = (status: ShipmentStatus) => {
    switch (status) {
      case 'packed': return styles.statusPacked;
      case 'shipped': return styles.statusShipped;
      case 'received': return styles.statusReceived;
      default: return '';
    }
  };

  const getStatusLabel = (status: ShipmentStatus) => {
    const labels: Record<ShipmentStatus, string> = {
      not_started: 'Not Started',
      packed: 'Packed',
      shipped: 'In Transit',
      received: 'Received',
    };
    return labels[status];
  };

  const currentStepIndex = (status: ShipmentStatus) => STEP_ORDER.indexOf(status);

  return (
    <div className={styles.root}>
      {/* Header */}
      <m.div
        className={styles.pageHeader}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <span className={styles.eyebrow}>Dispatch</span>
        <h1 className={styles.headline}>In transit.</h1>
        <p className={styles.subtext}>Track and advance every active shipment.</p>
      </m.div>

      {/* Filter Bar */}
      <m.div
        className={styles.filterBar}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {filters.map((f) => (
          <button
            key={f.key}
            className={`${styles.filterChip} ${filter === f.key ? styles.filterChipActive : ''}`}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
          >
            {f.label}
            {counts[f.key] > 0 && (
              <span className={styles.filterBadge}>{counts[f.key]}</span>
            )}
          </button>
        ))}
      </m.div>

      {/* Card List */}
      <div className={styles.cardList}>
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <m.div
              key="empty"
              className={styles.empty}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className={styles.emptyIcon} aria-hidden="true">
                <Package size={26} />
              </div>
              <p className={styles.emptyTitle}>Nothing here</p>
              <p className={styles.emptyBody}>
                Paid orders will appear once marked as packed or shipped.
              </p>
            </m.div>
          ) : (
            filtered.map((r, i) => {
              const stepIdx = currentStepIndex(r.shipment_status);
              const itemSummary = r.line_items.map((li) =>
                `${li.name}${li.variant_label ? ` (${li.variant_label})` : ''}${li.quantity > 1 ? ` ×${li.quantity}` : ''}`
              ).join(', ');

              return (
                <m.div
                  key={r.id}
                  className={styles.dispatchCard}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25, delay: i * 0.06 }}
                  layout
                >
                  {/* Main */}
                  <div className={styles.cardMain}>
                    <div className={styles.cardLeft}>
                      <span className={styles.sealId}>{r.seal_id}</span>
                      <span className={styles.buyerName}>{r.buyer_name}</span>
                      <span className={styles.itemSummary}>{itemSummary}</span>
                    </div>
                    <div className={styles.cardRight}>
                      <span className={styles.total}>{formatCurrencyFull(r.total)}</span>
                      <span className={`${styles.statusBadge} ${getStatusBadgeClass(r.shipment_status)}`}>
                        {getStatusLabel(r.shipment_status)}
                      </span>
                    </div>
                  </div>

                  {/* Pipeline */}
                  <div className={styles.pipeline} aria-label="Shipment progress">
                    {PIPELINE_STEPS.map((step, si) => (
                      <div
                        key={step.key}
                        className={`${styles.pipeStep} ${si < stepIdx ? styles.pipeStepDone : ''}`}
                      >
                        <PipelineDot
                          done={si < stepIdx}
                          active={si === stepIdx}
                          label={step.label}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className={styles.cardActions}>
                    {r.shipment_status === 'packed' && (
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                        onClick={() => handleMarkShipped(r.id)}
                        aria-label={`Mark ${r.buyer_name}'s order as shipped`}
                      >
                        <Truck size={12} aria-hidden="true" />
                        Mark Shipped
                      </button>
                    )}

                    {r.shipment_status === 'shipped' && (
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                        onClick={() => handleMarkReceived(r.id)}
                        aria-label={`Mark ${r.buyer_name}'s order as received`}
                      >
                        <CheckCircle size={12} aria-hidden="true" />
                        Confirm Received
                      </button>
                    )}

                    {r.buyer_phone && (
                      <a
                        href={buildChatToBuyLink({
                          phone: r.buyer_phone,
                          itemName: r.line_items[0]?.name ?? 'your order',
                          price: r.total,
                          storeName: FIXTURE_MERCHANT.store_name,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.actionBtn}
                        aria-label={`WhatsApp ${r.buyer_name}`}
                      >
                        <MessageCircle size={12} aria-hidden="true" />
                        WhatsApp
                      </a>
                    )}

                    <span
                      className={`${styles.actionBtn} ${styles.actionBtnGhost}`}
                      style={{ color: 'var(--color-fg-ghost)', fontSize: '10px', fontFamily: 'var(--font-mono)' }}
                    >
                      <MapPin size={10} aria-hidden="true" />
                      {formatRelativeDate(r.updated_at)}
                    </span>
                  </div>
                </m.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
