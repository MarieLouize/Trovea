import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { m, AnimatePresence } from '@/lib/motion';
import { Check, ExternalLink, Package, Download, ChevronRight } from 'lucide-react';
import { useLedgerStore, type LedgerTab } from '@/lib/store/ledger.store';
import { useUIStore } from '@/lib/store/ui.store';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { formatCurrencyFull, formatDate } from '@/lib/utils/format';
import { generateCSV, downloadCSV } from '@/lib/utils/csv';
import { FIXTURE_DROPS, FIXTURE_ENQUIRIES, FIXTURE_WINDOWS, FIXTURE_PRODUCTS, FIXTURE_STUDIO_PRODUCTS } from '@/lib/fixtures';
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
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const buyerParam = searchParams.get('buyer');

  const {
    receipts: allReceipts,
    activeTab, setActiveTab,
    isMultiSelectMode, selectedIds,
    enterMultiSelectMode, exitMultiSelectMode, toggleSelectId,
    markAsPaid, markManyAsPaid, markShipped, updateReceiptStatus
  } = useLedgerStore();
  const { addToast } = useUIStore();

  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [markPaidMethod, setMarkPaidMethod] = useState<PaymentMethod | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Filters
  const [dropFilter, setDropFilter] = useState<string>('all');
  const [windowFilter, setWindowFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [packageFilter, setPackageFilter] = useState<string>('all');

  // Local state for toggles in new tabs
  const [fulfilmentStatus, setFulfilmentStatus] = useState<Record<string, 'pending' | 'done'>>({});
  const [depositStatus, setDepositStatus] = useState<Record<string, 'pending' | 'done'>>({});
  const [deliveryStatus, setDeliveryStatus] = useState<Record<string, 'pending' | 'done'>>({});

  useEffect(() => {
    if (tabParam) {
      const validTabs: LedgerTab[] = ['all', 'pending', 'dispatch', 'completed', 'drops', 'fulfilment', 'deposits', 'delivery', 'pipeline', 'buyers', 'clients'];
      if (validTabs.includes(tabParam as LedgerTab)) {
        setActiveTab(tabParam as LedgerTab);
      }
    }
  }, [tabParam, setActiveTab]);

  const buyerStats = useMemo(() => {
    const map: Record<string, { count: number; total: number; lastDate: string }> = {};
    allReceipts.forEach(r => {
      if (!map[r.buyer_name]) map[r.buyer_name] = { count: 0, total: 0, lastDate: r.created_at };
      map[r.buyer_name].count++;
      map[r.buyer_name].total += r.total;
      if (r.created_at > map[r.buyer_name].lastDate) map[r.buyer_name].lastDate = r.created_at;
    });
    return map;
  }, [allReceipts]);

  const filteredReceipts = useMemo(() => {
    let list = [...allReceipts];

    // URL Filter
    if (buyerParam) {
      list = list.filter(r => r.buyer_name === buyerParam);
    }

    // Tab Filter
    switch (activeTab) {
      case 'pending':
        list = list.filter(r => r.payment_status === 'pending_payment');
        break;
      case 'dispatch':
        list = list.filter(r => r.payment_status === 'paid' && (r.shipment_status === 'packed' || r.shipment_status === 'shipped'));
        break;
      case 'completed':
        list = list.filter(r => r.payment_status === 'paid' && (r.shipment_status === 'received' || r.receipt_type === 'download' || r.receipt_type === 'project'));
        break;
      case 'all':
      default:
        list = list.filter(r => r.payment_status !== 'cancelled');
    }

    // Drop Filter (Collector)
    if (st.isCollector && dropFilter !== 'all') {
      const drop = FIXTURE_DROPS.find(d => d.id === dropFilter);
      if (drop) {
        const start = new Date(drop.scheduled_at).getTime() - 3600000;
        const end = start + 48 * 3600000;
        list = list.filter(r => {
          const t = new Date(r.created_at).getTime();
          return t >= start && t <= end;
        });
      }
    }

    // Window Filter (Vendor)
    if (st.isVendor && windowFilter !== 'all') {
      const window = FIXTURE_WINDOWS.find(w => w.id === windowFilter);
      if (window) {
        const start = new Date(window.opens_at).getTime();
        const end = new Date(window.closes_at).getTime();
        list = list.filter(r => {
          const t = new Date(r.created_at).getTime();
          return t >= start && t <= end;
        });
      }
    }

    // Service Filter (Host)
    if (st.isHost && serviceFilter !== 'all') {
      list = list.filter(r => r.line_items.some(li => li.name === serviceFilter));
    }

    // Product Filter (Creator)
    if (st.isDigital && productFilter !== 'all') {
      list = list.filter(r => r.line_items.some(li => li.product_id === productFilter));
    }

    // Package Filter (Studio)
    if (st.isStudio && packageFilter !== 'all') {
      list = list.filter(r => r.line_items.some(li => li.name === packageFilter));
    }

    return list;
  }, [allReceipts, activeTab, dropFilter, windowFilter, serviceFilter, productFilter, packageFilter, st, buyerParam]);

  const handleExportCSV = () => {
    const csv = generateCSV(filteredReceipts);
    downloadCSV(csv, `trovea-ledger-${new Date().toISOString().split('T')[0]}.csv`);
    addToast('Ledger exported to CSV.', 'success');
  };

  // ── Adaptive tabs ──
  const completedLabel =
    st.isVendor  ? 'Fulfilled' :
    st.isHost    ? 'Confirmed' :
    st.isDigital ? 'Delivered' :
    st.isStudio  ? 'Active'    :
    'Completed';

  const typeSpecificTabs: { value: LedgerTab; label: string }[] = [];
  if (st.isCollector) typeSpecificTabs.push({ value: 'drops', label: 'Drops' });
  if (st.isVendor)    typeSpecificTabs.push({ value: 'fulfilment', label: 'Fulfilment' });
  if (st.isHost)      typeSpecificTabs.push({ value: 'deposits', label: 'Deposits' });
  if (st.isDigital)   typeSpecificTabs.push({ value: 'delivery', label: 'Delivery' });
  if (st.isStudio)    typeSpecificTabs.push({ value: 'pipeline', label: 'Pipeline' });

  const visibleTabs = [
    { value: 'all' as const, label: 'Stream' },
    { value: 'pending' as const, label: 'Pending' },
    ...(st.isHost || st.isDigital || st.isStudio ? [] : [{ value: 'dispatch' as const, label: 'Dispatch' }]),
    { value: 'completed' as const, label: completedLabel },
    ...typeSpecificTabs,
    { value: (st.isStudio ? 'clients' : 'buyers') as LedgerTab, label: st.isStudio ? 'Clients' : 'Buyers' }
  ];

  const pendingCount = allReceipts.filter(r => r.payment_status === 'pending_payment').length;

  const handleToggleFulfilment = (receiptId: string) => {
    setFulfilmentStatus(prev => ({
      ...prev,
      [receiptId]: prev[receiptId] === 'done' ? 'pending' : 'done'
    }));
  };

  const handleToggleDeposit = (receiptId: string) => {
    setDepositStatus(prev => ({
      ...prev,
      [receiptId]: prev[receiptId] === 'done' ? 'pending' : 'done'
    }));
  };

  const handleResendDelivery = (receiptId: string) => {
    addToast('Delivery link resent to buyer.', 'success');
    setDeliveryStatus(prev => ({ ...prev, [receiptId]: 'done' }));
  };

  const getGeography = (buyerName: string): string => {
    const intl: Record<string, string> = {
      'David Chen': '🇬🇧 UK',
      'Sarah O\'Brien': '🇺🇸 US',
      'Marie Dupont': '🇫🇷 France',
    };
    return intl[buyerName] ?? '🇳🇬 Nigeria';
  };

  // ── Rendering helpers ──
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
    const timer = setTimeout(() => { enterMultiSelectMode(receipt.id); }, 600);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); }
  };

  const handleMarkPaid = () => {
    if (!selectedReceipt || !markPaidMethod) return;
    markAsPaid(selectedReceipt.id, markPaidMethod);
    setSelectedReceipt(null);
    addToast('Payment confirmed.', 'success');
  };

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Ledger</h1>
        <div className={styles.headerActions}>
          <button className={styles.exportBtn} onClick={handleExportCSV}>
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs} role="tablist">
        {visibleTabs.map(tab => (
          <button
            key={tab.value}
            className={`${styles.tab} ${activeTab === tab.value ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.value)}
            role="tab"
          >
            {tab.label}
            {tab.value === 'pending' && pendingCount > 0 && (
              <span className={styles.tabBadge}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filters (Stream Tab Only) */}
      {activeTab === 'all' && (
        <div className={styles.filterBar}>
          {st.isCollector && (
            <select className={styles.filterSelect} value={dropFilter} onChange={e => setDropFilter(e.target.value)}>
              <option value="all">All time</option>
              {FIXTURE_DROPS.map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          )}
          {st.isVendor && (
            <select className={styles.filterSelect} value={windowFilter} onChange={e => setWindowFilter(e.target.value)}>
              <option value="all">All time</option>
              {FIXTURE_WINDOWS.map(w => (
                <option key={w.id} value={w.id}>Window: {new Date(w.opens_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</option>
              ))}
            </select>
          )}
          {st.isHost && (
            <select className={styles.filterSelect} value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}>
              <option value="all">All services</option>
              {FIXTURE_PRODUCTS.filter(p => p.product_type === 'service').map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          )}
          {st.isDigital && (
            <select className={styles.filterSelect} value={productFilter} onChange={e => setProductFilter(e.target.value)}>
              <option value="all">All products</option>
              {FIXTURE_PRODUCTS.filter(p => p.product_type === 'digital').map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          {st.isStudio && (
            <select className={styles.filterSelect} value={packageFilter} onChange={e => setPackageFilter(e.target.value)}>
              <option value="all">All packages</option>
              {FIXTURE_STUDIO_PRODUCTS.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {/* Standard List Tabs (Stream, Pending, Dispatch, Completed) */}
        {['all', 'pending', 'dispatch', 'completed'].includes(activeTab) && (
          <div className={styles.receiptList}>
            {filteredReceipts.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>—</span>
                <h2 className={styles.emptyTitle}>No receipts here.</h2>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredReceipts.map((receipt, i) => (
                  <m.div
                    key={receipt.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={styles.receiptRow}
                    onClick={() => openDrawer(receipt)}
                    onMouseDown={() => handleLongPressStart(receipt)}
                    onMouseUp={handleLongPressEnd}
                    onTouchStart={() => handleLongPressStart(receipt)}
                    onTouchEnd={handleLongPressEnd}
                  >
                    {isMultiSelectMode && receipt.payment_status === 'pending_payment' && (
                      <div className={`${styles.rowCheckbox} ${selectedIds.includes(receipt.id) ? styles.checked : ''}`}>
                        {selectedIds.includes(receipt.id) && <Check size={12} />}
                      </div>
                    )}
                    <div className={`${styles.rowStatus} ${styles[receipt.payment_status === 'pending_payment' ? 'pending' : receipt.payment_status === 'cancelled' ? 'cancelled' : 'paid']}`} />
                    <div className={styles.rowBody}>
                      <div className={styles.rowBuyer}>
                        {receipt.buyer_name}
                        {st.isCollector && buyerStats[receipt.buyer_name]?.count >= 3 && (
                          <span className={styles.regularBadge}>Regular</span>
                        )}
                        {st.isDigital && <span className={styles.geoFlag}>{getGeography(receipt.buyer_name)}</span>}
                      </div>
                      <div className={styles.rowItems}>{receipt.line_items.map(li => li.name).join(', ')}</div>
                      <div className={styles.rowMeta}>
                        <span className={styles.rowDate}>{formatDate(receipt.created_at, 'relative')}</span>
                        {receipt.payment_method && <span className={styles.rowPaymentMethod}>{receipt.payment_method.replace('_', ' ')}</span>}
                      </div>
                    </div>
                    <div className={styles.rowRight}>
                      <span className={styles.rowAmount}>{formatCurrencyFull(receipt.total)}</span>
                      <span className={styles.rowSealId}>{receipt.seal_id}</span>
                    </div>
                  </m.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        )}

        {/* Drops Tab (Collector) */}
        {activeTab === 'drops' && (
          <div className={styles.dropSummaryList}>
            {FIXTURE_DROPS.map(drop => {
              const dropReceipts = allReceipts.filter(r => {
                const t = new Date(r.created_at).getTime();
                const start = new Date(drop.scheduled_at).getTime() - 3600000;
                return t >= start && t <= start + 48 * 3600000;
              });
              const revenue = dropReceipts.reduce((sum, r) => sum + r.total, 0);
              return (
                <div key={drop.id} className={styles.dropSummaryCard}>
                  <div className={styles.dropCardHeader}>
                    <h3 className={styles.dropCardTitle}>{drop.title}</h3>
                    <span className={styles.dropCardStatus}>Completed · {new Date(drop.scheduled_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <div className={styles.dropCardStats}>
                    <div className={styles.dropStatRow}>8 items staged · {dropReceipts.length}/18 sold</div>
                    <div className={styles.dropStatRow}>{formatCurrencyFull(revenue)} revenue</div>
                  </div>
                  <button className={styles.viewDropReceipts} onClick={() => { setDropFilter(drop.id); setActiveTab('all'); }}>
                    View all receipts →
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Fulfilment Tab (Vendor) */}
        {activeTab === 'fulfilment' && (
          <div className={styles.fulfilmentView}>
            <div className={styles.fulfilmentSection}>
              <h3 className={styles.fulfilmentTitle}>PICKUP ({allReceipts.filter(r => r.fulfilment_type === 'pickup').length} orders)</h3>
              {allReceipts.filter(r => r.fulfilment_type === 'pickup' || r.fulfilment_type === null).map(receipt => (
                <div key={receipt.id} className={styles.fulfilmentRow}>
                  <div className={styles.fulfilmentInfo}>
                    <div className={styles.fulfilmentBuyer}>{receipt.buyer_name}</div>
                    <div className={styles.fulfilmentItems}>{receipt.line_items.map(li => `${li.quantity}× ${li.name}`).join(', ')}</div>
                    <div className={styles.fulfilmentAmount}>{formatCurrencyFull(receipt.total)}</div>
                  </div>
                  <button 
                    className={`${styles.fulfilmentToggle} ${fulfilmentStatus[receipt.id] === 'done' ? styles.done : styles.pending}`}
                    onClick={() => handleToggleFulfilment(receipt.id)}
                  >
                    {fulfilmentStatus[receipt.id] === 'done' ? <><Check size={12} /> Collected</> : 'Mark Collected'}
                  </button>
                </div>
              ))}
            </div>
            <div className={styles.fulfilmentSection}>
              <h3 className={styles.fulfilmentTitle}>DELIVERY ({allReceipts.filter(r => r.fulfilment_type === 'delivery').length} orders)</h3>
              {allReceipts.filter(r => r.fulfilment_type === 'delivery').map(receipt => (
                <div key={receipt.id} className={styles.fulfilmentRow}>
                  <div className={styles.fulfilmentInfo}>
                    <div className={styles.fulfilmentBuyer}>{receipt.buyer_name}</div>
                    <div className={styles.fulfilmentItems}>{receipt.line_items.map(li => `${li.quantity}× ${li.name}`).join(', ')}</div>
                    <div className={styles.fulfilmentAmount}>{formatCurrencyFull(receipt.total)}</div>
                  </div>
                  <button 
                    className={`${styles.fulfilmentToggle} ${fulfilmentStatus[receipt.id] === 'done' ? styles.done : styles.pending}`}
                    onClick={() => handleToggleFulfilment(receipt.id)}
                  >
                    {fulfilmentStatus[receipt.id] === 'done' ? <><Check size={12} /> Delivered</> : 'Mark Delivered'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deposits Tab (Host) */}
        {activeTab === 'deposits' && (
          <div className={styles.depositsView}>
            <h3 className={styles.fulfilmentTitle}>Outstanding Deposits</h3>
            {allReceipts.filter(r => r.payment_status === 'pending_payment').map(receipt => (
              <div key={receipt.id} className={styles.depositRow}>
                <div className={styles.depositInfo}>
                  <div className={styles.depositBuyer}>{receipt.buyer_name}</div>
                  <div className={styles.depositService}>{receipt.line_items[0]?.name}</div>
                  <div className={styles.depositDate}>{new Date(receipt.created_at).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                </div>
                <div className={styles.depositAction}>
                  <span className={`${styles.depositAmount} ${styles.depositPending}`}>{formatCurrencyFull(receipt.total)} awaited</span>
                  <button className={styles.dispatchBtn} onClick={() => handleToggleDeposit(receipt.id)}>Mark Received</button>
                </div>
              </div>
            ))}
            <h3 className={styles.fulfilmentTitle} style={{ marginTop: 'var(--space-8)' }}>Confirmed Deposits</h3>
            {allReceipts.filter(r => r.payment_status === 'paid').map(receipt => (
              <div key={receipt.id} className={styles.depositRow}>
                <div className={styles.depositInfo}>
                  <div className={styles.depositBuyer}>{receipt.buyer_name}</div>
                  <div className={styles.depositService}>{receipt.line_items[0]?.name}</div>
                  <div className={styles.depositDate}>{new Date(receipt.created_at).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                </div>
                <div className={styles.depositAction}>
                  <span className={`${styles.depositAmount} ${styles.depositPaid}`}><Check size={12} /> {formatCurrencyFull(receipt.total)} received</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delivery Tab (Creator) */}
        {activeTab === 'delivery' && (
          <div className={styles.deliveryView}>
            <h3 className={styles.fulfilmentTitle}>All Deliveries</h3>
            {allReceipts.map(receipt => (
              <div key={receipt.id} className={styles.deliveryRow}>
                <div className={styles.deliveryInfo}>
                  <div className={styles.deliveryProduct}>{receipt.line_items[0]?.name}</div>
                  <div className={styles.deliveryBuyer}>{receipt.buyer_name}</div>
                  <div className={styles.deliveryTime}>Sent {formatDate(receipt.created_at, 'relative')}</div>
                </div>
                <div className={styles.deliveryStatus}>
                  {receipt.delivery_status === 'failed' ? (
                    <button className={styles.resendBtn} onClick={() => handleResendDelivery(receipt.id)}>Resend ↗</button>
                  ) : (
                    <span className={styles.depositPaid}><Check size={12} /> Delivered</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pipeline Tab (Studio) */}
        {activeTab === 'pipeline' && (
          <div className={styles.pipelineView}>
            <div className={styles.pipelineSection}>
              <h3 className={styles.fulfilmentTitle}>Active Pipeline</h3>
              <div style={{ marginBottom: 'var(--space-4)', fontSize: '18px', fontWeight: 500 }}>
                {formatCurrencyFull(840000)} total committed
              </div>
              
              <h4 className={styles.logTitle}>In Discussion</h4>
              {FIXTURE_ENQUIRIES.filter(e => e.status === 'open').map(enquiry => (
                <div key={enquiry.id} className={styles.pipelineCard}>
                  <div className={styles.pipelineHeader}>
                    <div>
                      <div className={styles.pipelineClient}>{enquiry.buyer_name}</div>
                      <div className={styles.pipelineProject}>{enquiry.subject}</div>
                    </div>
                    <div className={styles.pipelineTotal}>{formatCurrencyFull(80000)}</div>
                  </div>
                  <div className={styles.pipelineStatus}>Deposit: not yet confirmed</div>
                </div>
              ))}

              <h4 className={styles.logTitle} style={{ marginTop: 'var(--space-6)' }}>Active Projects</h4>
              {allReceipts.filter(r => r.receipt_type === 'project' && r.payment_status === 'paid' && r.shipment_status !== 'received').map(receipt => (
                <div key={receipt.id} className={styles.pipelineCard}>
                  <div className={styles.pipelineHeader}>
                    <div>
                      <div className={styles.pipelineClient}>{receipt.buyer_name}</div>
                      <div className={styles.pipelineProject}>{receipt.line_items[0]?.name}</div>
                    </div>
                    <div className={styles.pipelineTotal}>{formatCurrencyFull(receipt.total)}</div>
                  </div>
                  <div className={styles.pipelineStatus}>
                    Deposit: <span className={styles.depositPaid}>✓ {formatCurrencyFull(receipt.total / 2)} received</span>
                    <span className={styles.balancePending}> · {formatCurrencyFull(receipt.total / 2)} balance pending</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buyers/Clients Tab */}
        {(activeTab === 'buyers' || activeTab === 'clients') && (
          <div className={styles.buyersView}>
            {Object.entries(buyerStats).map(([name, stats]) => (
              <Link key={name} to={`/ledger?buyer=${encodeURIComponent(name)}`} className={styles.clientCard}>
                <div className={styles.clientMain}>
                  <div className={styles.clientName}>
                    {name}
                    {st.isCollector && stats.count >= 3 && <span className={styles.regularBadge} style={{ marginLeft: 'var(--space-2)' }}>Regular</span>}
                  </div>
                  <div className={styles.clientMeta}>
                    {stats.count} {st.isStudio ? 'projects' : 'orders'} 
                    {st.isVendor && ` · 3 pre-orders · ${stats.count - 3} walk-ins`}
                    {st.isHost && ` · No-show: 0%`}
                  </div>
                </div>
                <div className={styles.clientStats}>
                  <div style={{ fontSize: '14px', color: 'var(--color-fg)', fontWeight: 500 }}>{formatCurrencyFull(stats.total)}</div>
                  <div>Last: {formatDate(stats.lastDate, 'relative')}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Select Bar */}
      <AnimatePresence>
        {isMultiSelectMode && (
          <m.div
            className={styles.bulkBar}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
          >
            <span className={styles.bulkBarText}>{selectedIds.length} selected</span>
            <div className={styles.bulkBarActions}>
              <button className={styles.bulkMarkPaidBtn} onClick={() => { markManyAsPaid(selectedIds, 'bank_transfer'); exitMultiSelectMode(); addToast('Bulk payment confirmed.', 'success'); }}>
                Mark Paid
              </button>
              <button className={styles.bulkCancelBtn} onClick={exitMultiSelectMode}>Cancel</button>
            </div>
          </m.div>
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
            <div className={styles.lineItems}>
              <span className={styles.logTitle}>{itemsSectionLabel}</span>
              {selectedReceipt.line_items.map((item, i) => (
                <div key={i} className={styles.lineItem}>
                  <div>
                    <div className={styles.lineItemName}>{item.name} {item.quantity > 1 && `×${item.quantity}`}</div>
                    {item.variant_label && <div className={styles.lineItemVariant}>{item.variant_label}</div>}
                  </div>
                  <span className={styles.lineItemPrice}>{formatCurrencyFull(item.total_price)}</span>
                </div>
              ))}
            </div>
            <div className={styles.drawerTotal}>
              <span className={styles.drawerTotalLabel}>Total</span>
              <span className={styles.drawerTotalAmount}>{formatCurrencyFull(selectedReceipt.total)}</span>
            </div>
            
            {selectedReceipt.payment_status === 'pending_payment' && (
              <>
                <div className={styles.paymentMethodGrid}>
                  {ALL_PAYMENT_METHODS.map(pm => (
                    <button
                      key={pm.value}
                      className={`${styles.pmPill} ${markPaidMethod === pm.value ? styles.selected : ''}`}
                      onClick={() => setMarkPaidMethod(pm.value)}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
                <button className={styles.confirmPaidBtn} disabled={!markPaidMethod} onClick={handleMarkPaid}>
                  Confirm Payment Received
                </button>
              </>
            )}

            <Link to={`/receipt/${selectedReceipt.id}`} className={styles.viewReceiptLink} onClick={() => setSelectedReceipt(null)}>
              <ExternalLink size={14} /> View Full Receipt
            </Link>
          </div>
        )}
      </BaseDrawer>
    </div>
  );
}
