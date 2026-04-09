import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from '@/lib/motion';
import { Check, ExternalLink, Download, Search, X, Filter } from 'lucide-react';
import { useLedgerStore, type LedgerTab } from '@/lib/store/ledger.store';
import { useUIStore } from '@/lib/store/ui.store';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { formatCurrencyFull, formatDate } from '@/lib/utils/format';
import { generateCSV, downloadCSV } from '@/lib/utils/csv';
import { 
  buildOrderConfirmedLink, 
  buildItemShippedLink, 
  buildCustomMessageLink 
} from '@/lib/utils/whatsapp';
import { FIXTURE_DROPS, FIXTURE_ENQUIRIES, FIXTURE_WINDOWS } from '@/lib/fixtures';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import PopupModal from '@/components/primitives/PopupModal/PopupModal';
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
  const navigate = useNavigate();
  const st = useStoreType();
  const merchant = useMerchantStore(s => s.merchant);
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const buyerParam = searchParams.get('buyer');

  const {
    receipts: allReceipts,
    activeTab, setActiveTab,
    isMultiSelectMode, selectedIds,
    exitMultiSelectMode, toggleSelectId,
    markAsPaid, markManyAsPaid, markShipped, markFulfilled,
    selectAll
  } = useLedgerStore();
  const { addToast } = useUIStore();

  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [markPaidMethod, setMarkPaidMethod] = useState<PaymentMethod | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Custom message modal
  const [customMsgOpen, setCustomMsgOpen] = useState(false);
  const [customMsgBody, setCustomMsgBody] = useState('');

  // Filters
  const [dropFilter, setDropFilter] = useState<string>('all');
  const [windowFilter, setWindowFilter] = useState<string>('all');

  // Local state
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading (Phase 3C)
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

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

    // Search Filter
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(r => 
        r.buyer_name.toLowerCase().includes(s) || 
        r.seal_id.toLowerCase().includes(s) ||
        r.line_items.some(li => li.name.toLowerCase().includes(s))
      );
    }

    // URL Filter
    if (buyerParam) {
      list = list.filter(r => r.buyer_name === buyerParam);
    }

    // Bucket Logic (Mapped to existing tabs for now to avoid breaking state)
    switch (activeTab) {
      case 'pending': // "Active" bucket
        list = list.filter(r => r.payment_status === 'pending_payment');
        break;
      case 'dispatch':
        list = list.filter(r => r.payment_status === 'paid' && (r.shipment_status === 'packed' || r.shipment_status === 'shipped'));
        break;
      case 'all': // "History" bucket
      case 'completed':
        // list = list; // Keep all for history unless completed specific is needed
        break;
      default:
        // Other tabs handle their own filtering
    }

    // Sub-filters (Drop, Window, etc.) - only applied if activeTab is not Insights/Buyers
    if (!['buyers', 'clients', 'drops', 'pipeline', 'deposits', 'fulfilment'].includes(activeTab)) {
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
    }

    return list;
  }, [allReceipts, activeTab, searchTerm, dropFilter, windowFilter, st, buyerParam]);

  const handleExportCSV = () => {
    const csv = generateCSV(filteredReceipts);
    downloadCSV(csv, `trovea-ledger-${new Date().toISOString().split('T')[0]}.csv`);
    addToast('Ledger exported to CSV.', 'success');
  };

  const typeSpecificTabs: { value: LedgerTab; label: string }[] = [];
  if (st.isCollector) typeSpecificTabs.push({ value: 'drops', label: 'Drops' });
  if (st.isVendor)    typeSpecificTabs.push({ value: 'fulfilment', label: 'Fulfilment' });
  if (st.isHost)      typeSpecificTabs.push({ value: 'deposits', label: 'Deposits' });
  if (st.isDigital)   typeSpecificTabs.push({ value: 'delivery', label: 'Delivery' });
  if (st.isStudio)    typeSpecificTabs.push({ value: 'pipeline', label: 'Pipeline' });

  const visibleTabs: { value: LedgerTab; label: string }[] = [
    { value: 'pending', label: 'Active' },
    ...typeSpecificTabs,
  ];

  if (st.isCollector || st.isVendor) {
    visibleTabs.push({ value: 'dispatch', label: 'Dispatch' });
  }

  visibleTabs.push({ value: 'all', label: 'History' });
  visibleTabs.push({ value: (st.isStudio ? 'clients' : 'buyers') as LedgerTab, label: 'Insights' });

  const pendingCount = allReceipts.filter(r => r.payment_status === 'pending_payment').length;

  const handleToggleFulfilment = (receiptId: string) => {
    markFulfilled(receiptId);
    addToast('Marked as fulfilled.', 'success');
  };

  const handleResendDelivery = () => {
    addToast('Delivery link resent to buyer.', 'success');
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

  const handleMarkPaid = () => {
    if (!selectedReceipt || !markPaidMethod) return;
    markAsPaid(selectedReceipt.id, markPaidMethod);
    setSelectedReceipt(null);
    addToast('Payment confirmed.', 'success');
  };

  const handleMarkShipped = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markShipped(id);
    addToast('Marked as shipped', 'success');
  };

  const handleNotifyBuyer = (receipt: Receipt, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!merchant) return;
    const url = buildItemShippedLink({
      phone: receipt.buyer_phone ?? '',
      buyerName: receipt.buyer_name,
      sealId: receipt.seal_id,
      storeName: merchant.store_name,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openCustomMsg = () => {
    if (!selectedReceipt) return;
    setCustomMsgBody(`Hi ${selectedReceipt.buyer_name}! `);
    setCustomMsgOpen(true);
  };

  const sendCustomMsg = () => {
    if (!selectedReceipt || !merchant) return;
    const url = buildCustomMessageLink({
      phone: selectedReceipt.buyer_phone ?? '',
      messageBody: customMsgBody,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
    setCustomMsgOpen(false);
  };

  if (isLoading) {
    return (
      <div className={styles.root}>
        <div className={styles.pageHeader}>
          <div className={styles.headerTop}>
            <div className="skeleton skeleton-text" style={{ width: '100px', height: '28px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="skeleton" style={{ width: '60px', height: '32px', borderRadius: 'var(--r-sm)' }} />
              <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: 'var(--r-sm)' }} />
            </div>
          </div>
          <div className={styles.searchBar}>
            <div className="skeleton" style={{ flex: 1, height: '44px', borderRadius: 'var(--r-md)' }} />
            <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: 'var(--r-md)' }} />
          </div>
        </div>
        <div className={styles.tabContainer}>
          <div className={styles.segmentedControl}>
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton" style={{ flex: 1, height: '36px', borderRadius: 'var(--r-pill)', margin: '0 4px' }} />
            ))}
          </div>
        </div>
        <div className={styles.mainContent}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className={styles.receiptRow} style={{ padding: '16px' }}>
              <div className="skeleton" style={{ width: '12px', height: '12px', borderRadius: '50%', marginRight: '12px' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: '40%', height: '14px', marginBottom: '8px' }} />
                <div className="skeleton skeleton-text" style={{ width: '70%', height: '12px' }} />
              </div>
              <div className="skeleton skeleton-text" style={{ width: '60px', height: '16px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerTop}>
          <h1 className={styles.pageTitle}>Ledger</h1>
          <div className={styles.headerActions}>
            <button 
              className={`${styles.headerBtn} ${isMultiSelectMode ? styles.activeBtn : ''}`}
              onClick={() => isMultiSelectMode ? exitMultiSelectMode() : selectAll()}
            >
              {isMultiSelectMode ? 'Cancel' : 'Select'}
            </button>
            <button className={styles.headerBtn} onClick={handleExportCSV}>
              <Download size={14} />
            </button>
          </div>
        </div>

        <div className={styles.searchBar}>
          <div className={styles.searchInputWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input 
              type="text" 
              className={styles.searchInput}
              placeholder="Search by buyer, items, or ID…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className={styles.searchClear} onClick={() => setSearchTerm('')}>
                <X size={14} />
              </button>
            )}
          </div>
          <button 
            className={`${styles.filterToggle} ${showFilters ? styles.filterActive : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Tabs (Segmented Control) */}
      <div className={styles.tabContainer}>
        <div className={styles.segmentedControl} role="tablist">
          {visibleTabs.map(tab => (
            <button
              key={tab.value}
              className={`${styles.segment} ${activeTab === tab.value || (activeTab === 'completed' && tab.value === 'all') ? styles.segmentActive : ''}`}
              onClick={() => setActiveTab(tab.value)}
              role="tab"
            >
              {tab.label}
              {tab.value === 'pending' && pendingCount > 0 && (
                <span className={styles.segmentBadge}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filters (Expandable) */}
      <AnimatePresence>
        {showFilters && (
          <m.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={styles.filterBar}
          >
            <div className={styles.filterInner}>
              {st.isCollector && (
                <select className={styles.filterSelect} value={dropFilter} onChange={e => setDropFilter(e.target.value)}>
                  <option value="all">All Drops</option>
                  {FIXTURE_DROPS.map(d => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              )}
              {st.isVendor && (
                <select className={styles.filterSelect} value={windowFilter} onChange={e => setWindowFilter(e.target.value)}>
                  <option value="all">All Windows</option>
                  {FIXTURE_WINDOWS.map(w => (
                    <option key={w.id} value={w.id}>Window: {new Date(w.opens_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</option>
                  ))}
                </select>
              )}
              {/* Other type specific filters could go here */}
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {/* Active & History Buckets */}
        {(activeTab === 'pending' || activeTab === 'all' || activeTab === 'completed' || activeTab === 'dispatch') && (
          <div className={activeTab === 'pending' ? styles.activeList : styles.receiptList}>
            {filteredReceipts.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon">—</span>
                <h2 className="empty-state__title">No receipts here.</h2>
                <p className="empty-state__text">Transactions will appear here once issued.</p>
                <button 
                  className={styles.emptyCta}
                  onClick={() => navigate('/terminal')}
                >
                  Issue a Receipt
                </button>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredReceipts.map((receipt, index) => {
                  const delayClass = `delay-${Math.min((index % 5) + 1, 5)}`;
                  return (
                    <m.div
                      key={receipt.id}
                      initial={false}
                      className={`${activeTab === 'pending' ? styles.actionCard : styles.receiptRow} animate-in ${delayClass}`}
                      onClick={() => openDrawer(receipt)}
                    >
                      {isMultiSelectMode && (
                        <div className={`${styles.rowCheckbox} ${selectedIds.includes(receipt.id) ? styles.checked : ''}`}>
                          {selectedIds.includes(receipt.id) && <Check size={12} />}
                        </div>
                      )}
                      
                      <div className={styles.rowStatusIndicator}>
                        <div className={`${styles.rowStatusDot} ${styles[receipt.payment_status === 'pending_payment' ? 'pending' : receipt.payment_status === 'cancelled' ? 'cancelled' : 'paid']}`} />
                      </div>

                      <div className={styles.rowBody}>
                        <div className={styles.rowBuyer}>
                          {receipt.buyer_name}
                          {st.isCollector && buyerStats[receipt.buyer_name]?.count >= 3 && (
                            <span className={styles.regularBadge}>Regular</span>
                          )}
                        </div>
                        <div className={styles.rowItems}>{receipt.line_items.map(li => li.name).join(', ')}</div>
                        <div className={styles.rowMeta}>
                          <span className={styles.rowDate}>{formatDate(receipt.created_at, 'relative')}</span>
                          {receipt.payment_method && <span className={styles.rowPaymentMethod}>{receipt.payment_method.replace('_', ' ')}</span>}
                        </div>
                      </div>

                      <div className={styles.rowRight}>
                        <span className={styles.rowAmount}>{formatCurrencyFull(receipt.total)}</span>
                        {activeTab === 'all' ? (
                           <span className={styles.rowSealId}>{receipt.seal_id}</span>
                        ) : activeTab === 'dispatch' ? (
                          <div className={styles.rowActionsInline}>
                            {receipt.shipment_status === 'packed' && (
                              <button 
                                className={styles.inlineActionBtn}
                                onClick={(e) => handleMarkShipped(receipt.id, e)}
                              >
                                Mark Shipped
                              </button>
                            )}
                            <button 
                              className={styles.inlineNotifyBtn}
                              onClick={(e) => handleNotifyBuyer(receipt, e)}
                            >
                              Notify Buyer ↗
                            </button>
                          </div>
                        ) : (
                          <div className={styles.rowActionLabel}>
                            {receipt.payment_status === 'pending_payment' ? 'Awaiting Payment' : 'Ready to Ship'}
                          </div>
                        )}
                      </div>
                    </m.div>
                  );
                })}
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
                    <h3 className={styles.dropCardTitle}>{drop.label}</h3>
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
                    className={`${styles.fulfilmentToggle} ${receipt.shipment_status === 'received' ? styles.done : styles.pending}`}
                    onClick={() => handleToggleFulfilment(receipt.id)}
                  >
                    {receipt.shipment_status === 'received' ? <><Check size={12} /> Collected</> : 'Mark Collected'}
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
                    className={`${styles.fulfilmentToggle} ${receipt.shipment_status === 'received' ? styles.done : styles.pending}`}
                    onClick={() => handleToggleFulfilment(receipt.id)}
                  >
                    {receipt.shipment_status === 'received' ? <><Check size={12} /> Delivered</> : 'Mark Delivered'}
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
                  <button className={styles.dispatchBtn} onClick={() => addToast('Deposit tracking will be wired in Phase 4.', 'info')}>Mark Received</button>
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
                    <button className={styles.resendBtn} onClick={() => handleResendDelivery()}>Resend ↗</button>
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
              {FIXTURE_ENQUIRIES.filter(e => e.status === 'in_discussion').map(enquiry => (
                <div key={enquiry.id} className={styles.pipelineCard}>
                  <div className={styles.pipelineHeader}>
                    <div>
                      <div className={styles.pipelineClient}>{enquiry.client_name}</div>
                      <div className={styles.pipelineProject}>{enquiry.project_type}</div>
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
            
            <div className={styles.waTemplateSection}>
              <span className={styles.waSectionTitle}>Send via WhatsApp:</span>
              <div className={styles.waTemplateGrid}>
                {selectedReceipt.payment_status === 'pending_payment' && (
                  <button 
                    className={styles.waTemplateBtn}
                    onClick={() => {
                      if (!merchant) return;
                      const url = buildOrderConfirmedLink({
                        phone: selectedReceipt.buyer_phone ?? '',
                        buyerName: selectedReceipt.buyer_name,
                        sealId: selectedReceipt.seal_id,
                        storeName: merchant.store_name,
                        total: selectedReceipt.total
                      });
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    Order Confirmed ↗
                  </button>
                )}
                {(selectedReceipt.shipment_status === 'packed' || selectedReceipt.shipment_status === 'shipped') && (
                  <button 
                    className={styles.waTemplateBtn}
                    onClick={() => {
                      if (!merchant) return;
                      const url = buildItemShippedLink({
                        phone: selectedReceipt.buyer_phone ?? '',
                        buyerName: selectedReceipt.buyer_name,
                        sealId: selectedReceipt.seal_id,
                        storeName: merchant.store_name,
                      });
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    Item Shipped ↗
                  </button>
                )}
                <button className={styles.waTemplateBtn} onClick={openCustomMsg}>
                  Custom ↗
                </button>
              </div>
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

      <PopupModal
        open={customMsgOpen}
        onClose={() => setCustomMsgOpen(false)}
        title="Custom Message"
      >
        <div className={styles.customMsgForm}>
          <p className={styles.customMsgHint}>Send a custom message to {selectedReceipt?.buyer_name}:</p>
          <textarea
            className={styles.customMsgTextarea}
            rows={4}
            value={customMsgBody}
            onChange={(e) => setCustomMsgBody(e.target.value)}
            autoFocus
          />
          <button className={styles.sendMsgBtn} onClick={sendCustomMsg}>
            Open WhatsApp
          </button>
        </div>
      </PopupModal>
    </div>
  );
}
