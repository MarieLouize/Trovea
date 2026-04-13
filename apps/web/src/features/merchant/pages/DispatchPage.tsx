import { useState, useEffect } from 'react';
import { m, AnimatePresence } from '@/lib/motion';
import { Package, Check, Truck, CheckCircle, MessageCircle, MapPin, Layers } from 'lucide-react';
import { useLedgerStore } from '@/lib/store/ledger.store';
import { useUIStore } from '@/lib/store/ui.store';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { getDropsByMerchant } from '@/lib/api/drops.api';
import { formatCurrencyFull, formatRelativeDate } from '@/lib/utils/format';
import { buildChatToBuyLink } from '@/lib/utils/whatsapp';
import { FIXTURE_MERCHANT, FIXTURE_DROPS, FIXTURE_WINDOWS } from '@/lib/fixtures';
import type { ShipmentStatus, Receipt, Drop, AvailabilityWindow } from '@/lib/types';
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

// ─── Dispatch Card (shared) ───────────────────────────────────────────────────

function DispatchCard({
  r, i, onMarkShipped, onMarkReceived, storeName,
}: {
  r: Receipt;
  i: number;
  onMarkShipped: (id: string) => void;
  onMarkReceived: (id: string) => void;
  storeName: string;
}) {
  const stepIdx = STEP_ORDER.indexOf(r.shipment_status);
  const itemSummary = r.line_items.map((li) =>
    `${li.name}${li.variant_label ? ` (${li.variant_label})` : ''}${li.quantity > 1 ? ` ×${li.quantity}` : ''}`
  ).join(', ');

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

  return (
    <m.div
      key={r.id}
      className={styles.dispatchCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, delay: i * 0.06 }}
    >
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

      <div className={styles.cardActions}>
        {r.shipment_status === 'packed' && (
          <button
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            onClick={() => onMarkShipped(r.id)}
            aria-label={`Mark ${r.buyer_name}'s order as shipped`}
          >
            <Truck size={12} aria-hidden="true" />
            Mark Shipped
          </button>
        )}

        {r.shipment_status === 'shipped' && (
          <button
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            onClick={() => onMarkReceived(r.id)}
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
              storeName,
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
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function DispatchPage() {
  const { receipts, markShipped, markReceived, markPacked } = useLedgerStore();
  const { addToast } = useUIStore();
  const st = useStoreType();
  const merchant = useMerchantStore((s) => s.merchant);
  const [filter, setFilter] = useState<DispatchFilter>('all');
  const [drops, setDrops] = useState<Drop[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!st.isCollector) return;
      const hasApi = !!import.meta.env.VITE_API_URL;
      setDrops(hasApi ? await getDropsByMerchant().catch(() => FIXTURE_DROPS) : FIXTURE_DROPS);
    };
    load();
  }, [st.isCollector]);

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

  const filterOptions: { key: DispatchFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'packed', label: 'Packed' },
    { key: 'shipped', label: 'In Transit' },
    { key: 'received', label: 'Received' },
  ];

  const handleMarkShipped = (id: string) => { markShipped(id); addToast('Marked as shipped', 'success'); };
  const handleMarkReceived = (id: string) => { markReceived(id); addToast('Order complete', 'success'); };

  // ── Collector: group receipts by drop ──────────────────────────────────────
  const buildDropGroups = () => {
    const groups: { drop: Drop | null; label: string; receipts: Receipt[] }[] = [];
    const assignedIds = new Set<string>();

    const merchantDrops = [...drops]
      .filter(d => d.merchant_id === merchant.id)
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

    for (const drop of merchantDrops) {
      const windowStart = new Date(drop.scheduled_at).getTime() - 3600000;
      const windowEnd = windowStart + 50 * 3600000; // 48h + 2h buffer
      const dropReceipts = filtered.filter((r) => {
        const t = new Date(r.created_at).getTime();
        return t >= windowStart && t <= windowEnd;
      });
      dropReceipts.forEach((r) => assignedIds.add(r.id));
      if (dropReceipts.length > 0) {
        groups.push({ drop, label: drop.label, receipts: dropReceipts });
      }
    }

    const ungrouped = filtered.filter((r) => !assignedIds.has(r.id));
    if (ungrouped.length > 0) {
      groups.push({ drop: null, label: 'Other Orders', receipts: ungrouped });
    }

    return groups;
  };

  const handleBulkMarkPacked = async (groupReceipts: Receipt[]) => {
    const targets = groupReceipts.filter((r) => r.shipment_status === 'not_started' || r.shipment_status === 'packed');
    const unpackedTargets = groupReceipts.filter((r) => r.shipment_status !== 'packed' && r.shipment_status !== 'shipped' && r.shipment_status !== 'received');
    if (unpackedTargets.length === 0) { addToast('All orders in this drop are already packed.', 'info'); return; }
    await Promise.all(unpackedTargets.map((r) => markPacked(r.id)));
    addToast(`${unpackedTargets.length} order${unpackedTargets.length > 1 ? 's' : ''} marked as packed.`, 'success');
  };

  const storeName = merchant.store_name;

  // ── Vendor: group receipts by window, then fulfilment type ─────────────────
  const buildWindowGroups = () => {
    const merchantWindows = FIXTURE_WINDOWS
      .filter(w => w.merchant_id === merchant.id)
      .sort((a, b) => new Date(b.opens_at).getTime() - new Date(a.opens_at).getTime());

    type WindowGroup = {
      window: AvailabilityWindow;
      pickup: Receipt[];
      delivery: Receipt[];
      all: Receipt[];
    };

    const groups: WindowGroup[] = [];
    const assignedIds = new Set<string>();

    for (const win of merchantWindows) {
      const winStart = new Date(win.opens_at).getTime();
      const winEnd = new Date(win.closes_at).getTime() + 48 * 3600000; // 48h delivery buffer
      const winReceipts = filtered.filter(r => {
        const t = new Date(r.created_at).getTime();
        return t >= winStart && t <= winEnd;
      });
      winReceipts.forEach(r => assignedIds.add(r.id));
      if (winReceipts.length > 0) {
        groups.push({
          window: win,
          pickup: winReceipts.filter(r => r.fulfilment_type !== 'delivery'),
          delivery: winReceipts.filter(r => r.fulfilment_type === 'delivery'),
          all: winReceipts,
        });
      }
    }

    const ungrouped = filtered.filter(r => !assignedIds.has(r.id));
    if (ungrouped.length > 0) {
      const syntheticWin = { id: '__ungrouped__', label: 'Other Orders', opens_at: '', closes_at: '' } as unknown as AvailabilityWindow;
      groups.push({ window: syntheticWin, pickup: ungrouped, delivery: [], all: ungrouped });
    }

    return groups;
  };

  const dropCompletion = (groupReceipts: Receipt[]) => {
    const received = groupReceipts.filter((r) => r.shipment_status === 'received').length;
    return groupReceipts.length > 0 ? Math.round((received / groupReceipts.length) * 100) : 0;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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
        {filterOptions.map((f) => (
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

      {/* ── COLLECTOR: Drop-grouped view ── */}
      {st.isCollector ? (
        <div className={styles.cardList}>
          {filtered.length === 0 ? (
            <m.div className={styles.empty} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className={styles.emptyIcon}><Package size={26} /></div>
              <p className={styles.emptyTitle}>Nothing here</p>
              <p className={styles.emptyBody}>Paid orders will appear once marked as packed or shipped.</p>
            </m.div>
          ) : (
            buildDropGroups().map((group) => {
              const completion = dropCompletion(group.receipts);
              const packableCount = group.receipts.filter((r) => r.shipment_status !== 'packed' && r.shipment_status !== 'shipped' && r.shipment_status !== 'received').length;
              return (
                <m.div
                  key={group.label}
                  className={styles.dropGroup}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Drop Group Header */}
                  <div className={styles.dropGroupHeader}>
                    <div className={styles.dropGroupLeft}>
                      <Layers size={13} className={styles.dropGroupIcon} />
                      <span className={styles.dropGroupLabel}>{group.label}</span>
                      <span className={styles.dropGroupCount}>{group.receipts.length} orders</span>
                    </div>
                    <div className={styles.dropGroupRight}>
                      <div className={styles.dropCompletionBar}>
                        <div
                          className={styles.dropCompletionFill}
                          style={{ width: `${completion}%` }}
                          aria-label={`${completion}% dispatched`}
                        />
                      </div>
                      <span className={styles.dropCompletionPct}>{completion}%</span>
                      {packableCount > 0 && (
                        <button
                          className={styles.bulkPackBtn}
                          onClick={() => handleBulkMarkPacked(group.receipts)}
                        >
                          Pack all ({packableCount})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Orders in this drop */}
                  <AnimatePresence mode="popLayout">
                    {group.receipts.map((r, i) => (
                      <DispatchCard
                        key={r.id}
                        r={r}
                        i={i}
                        onMarkShipped={handleMarkShipped}
                        onMarkReceived={handleMarkReceived}
                        storeName={storeName}
                      />
                    ))}
                  </AnimatePresence>
                </m.div>
              );
            })
          )}
        </div>
      ) : st.isVendor ? (
        /* ── VENDOR: Window-grouped, split pickup / delivery ── */
        <div className={styles.cardList}>
          {filtered.length === 0 ? (
            <m.div className={styles.empty} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className={styles.emptyIcon}><Package size={26} /></div>
              <p className={styles.emptyTitle}>Nothing here</p>
              <p className={styles.emptyBody}>Paid orders will appear once marked as packed or shipped.</p>
            </m.div>
          ) : (
            buildWindowGroups().map((group) => {
              const completion = dropCompletion(group.all);
              const packableCount = group.all.filter(r => r.shipment_status !== 'packed' && r.shipment_status !== 'shipped' && r.shipment_status !== 'received').length;
              return (
                <m.div
                  key={group.window.id}
                  className={styles.dropGroup}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.dropGroupHeader}>
                    <div className={styles.dropGroupLeft}>
                      <Layers size={13} className={styles.dropGroupIcon} />
                      <span className={styles.dropGroupLabel}>{group.window.label}</span>
                      <span className={styles.dropGroupCount}>{group.all.length} orders</span>
                    </div>
                    <div className={styles.dropGroupRight}>
                      <div className={styles.dropCompletionBar}>
                        <div className={styles.dropCompletionFill} style={{ width: `${completion}%` }} />
                      </div>
                      <span className={styles.dropCompletionPct}>{completion}%</span>
                      {packableCount > 0 && (
                        <button className={styles.bulkPackBtn} onClick={() => handleBulkMarkPacked(group.all)}>
                          Pack all ({packableCount})
                        </button>
                      )}
                    </div>
                  </div>

                  {group.pickup.length > 0 && (
                    <div className={styles.fulfilmentGroup}>
                      <span className={styles.fulfilmentGroupLabel}>Pickup ({group.pickup.length})</span>
                      <AnimatePresence mode="popLayout">
                        {group.pickup.map((r, i) => (
                          <DispatchCard key={r.id} r={r} i={i} onMarkShipped={handleMarkShipped} onMarkReceived={handleMarkReceived} storeName={storeName} />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  {group.delivery.length > 0 && (
                    <div className={styles.fulfilmentGroup}>
                      <span className={styles.fulfilmentGroupLabel}>Delivery ({group.delivery.length})</span>
                      <AnimatePresence mode="popLayout">
                        {group.delivery.map((r, i) => (
                          <DispatchCard key={r.id} r={r} i={i} onMarkShipped={handleMarkShipped} onMarkReceived={handleMarkReceived} storeName={storeName} />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </m.div>
              );
            })
          )}
        </div>
      ) : (
        /* ── OTHER: Flat list ── */
        <div className={styles.cardList}>
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <m.div key="empty" className={styles.empty} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className={styles.emptyIcon} aria-hidden="true"><Package size={26} /></div>
                <p className={styles.emptyTitle}>Nothing here</p>
                <p className={styles.emptyBody}>Paid orders will appear once marked as packed or shipped.</p>
              </m.div>
            ) : (
              filtered.map((r, i) => (
                <DispatchCard key={r.id} r={r} i={i} onMarkShipped={handleMarkShipped} onMarkReceived={handleMarkReceived} storeName={storeName} />
              ))
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
