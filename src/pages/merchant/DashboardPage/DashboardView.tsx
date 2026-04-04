import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Share2, ExternalLink, Copy, MessageCircle, Instagram,
  Clock, AlertTriangle, CheckCircle, TrendingUp,
} from 'lucide-react';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { useUIStore } from '@/lib/store/ui.store';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { useArchiveStore } from '@/lib/store/archive.store';
import { formatCurrencyFull, formatDate } from '@/lib/utils/format';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import DropCardGenerator from '@/components/merchant/DropCardGenerator';
import {
  FIXTURE_DROPS,
  FIXTURE_WINDOWS,
  FIXTURE_BOOKINGS,
  FIXTURE_RECEIPTS,
  FIXTURE_ENQUIRIES,
  FIXTURE_MERCHANT,
  FIXTURE_VENDOR_MERCHANT,
  FIXTURE_HOST_MERCHANT,
  FIXTURE_DIGITAL_MERCHANT,
  FIXTURE_STUDIO_MERCHANT,
} from '@/lib/fixtures';
import styles from './DashboardPage.module.css';

// ─── Development Helpers ──────────────────────────────────────────────────────

const DEV_MERCHANTS = [
  { label: 'Collector', merchant: FIXTURE_MERCHANT },
  { label: 'Vendor',    merchant: FIXTURE_VENDOR_MERCHANT },
  { label: 'Host',      merchant: FIXTURE_HOST_MERCHANT },
  { label: 'Digital',   merchant: FIXTURE_DIGITAL_MERCHANT },
  { label: 'Studio',    merchant: FIXTURE_STUDIO_MERCHANT },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calculateTimeLeft = (targetDate: string) => {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
};

// ─── Components ──────────────────────────────────────────────────────────────

function Countdown({ targetDate, onFinish }: { targetDate: string; onFinish?: () => void }) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      const next = calculateTimeLeft(targetDate);
      setTimeLeft(next);
      if (!next && onFinish) onFinish();
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate, onFinish]);

  if (!timeLeft) return null;

  return (
    <div className={styles.dropCountdown}>
      <div className={styles.countdownBlock}>
        <span className={styles.countdownNum}>{String(timeLeft.d).padStart(2, '0')}</span>
        <span className={styles.countdownUnit}>d</span>
      </div>
      <div className={styles.countdownBlock}>
        <span className={styles.countdownNum}>{String(timeLeft.h).padStart(2, '0')}</span>
        <span className={styles.countdownUnit}>h</span>
      </div>
      <div className={styles.countdownBlock}>
        <span className={styles.countdownNum}>{String(timeLeft.m).padStart(2, '0')}</span>
        <span className={styles.countdownUnit}>m</span>
      </div>
      <div className={styles.countdownBlock}>
        <span className={styles.countdownNum}>{String(timeLeft.s).padStart(2, '0')}</span>
        <span className={styles.countdownUnit}>s</span>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const merchant = useMerchantStore((s) => s.merchant);
  const { addToast } = useUIStore();
  const st = useStoreType();
  const { products } = useArchiveStore();
  const [shareOpen, setShareOpen] = useState(false);
  const [devPaused, setDevPaused] = useState(false);
  const [devMenuOpen, setDevMenuOpen] = useState(false);

  const storeUrl = `trovea.store/${merchant.handle}`;

  // ── Handlers ──
  const handleCopy = () => {
    void navigator.clipboard.writeText(`https://${storeUrl}`).catch(() => {});
    addToast('Store link copied.', 'success');
    setShareOpen(false);
  };

  // ── Render Helpers ──

  const renderCollector = () => {
    const activeDrop = FIXTURE_DROPS.find(
      d => d.merchant_id === merchant.id && (d.status === 'scheduled' || d.status === 'live')
    ) ?? null;

    const dropState = !activeDrop ? 'none'
      : activeDrop.status === 'live' || Date.now() >= new Date(activeDrop.scheduled_at).getTime() ? 'live'
      : 'pre';

    const today = new Date().toDateString();
    const todayPaidReceipts = FIXTURE_RECEIPTS.filter(
      r => r.merchant_id === merchant.id && r.payment_status === 'paid' && new Date(r.updated_at).toDateString() === today
    );

    const revenueToday = todayPaidReceipts.reduce((acc, r) => acc + r.total, 0);
    const topItemToday = todayPaidReceipts.flatMap(r => r.line_items).sort((a, b) => b.unit_price - a.unit_price)[0]?.name ?? '—';
    const uniqueBuyersToday = new Set(todayPaidReceipts.map(r => r.buyer_name)).size;

    // Inventory health
    const liveItems = products.filter(p => p.status === 'live').length;
    const lowStockItems = products.filter(p => p.stock_level !== null && p.stock_level > 0 && p.stock_level <= 3).length;
    const stagnantItems = products.filter(p => {
      const created = new Date(p.created_at).getTime();
      const ageDays = (Date.now() - created) / 86400000;
      return ageDays >= 14 && p.status === 'live'; // Simplified stagnant logic
    }).length;

    return (
      <>
        {/* Top Module: Drop Status */}
        <div className={styles.moduleCard}>
          <div className={styles.dropModule}>
            {dropState === 'none' ? (
              <>
                <h2 className={styles.dropLabel}>No drop scheduled</h2>
                <p className={styles.vitalSub}>Plan your next drop to drive sales.</p>
                <button className={styles.shareBtn} onClick={() => navigate('/archive')} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                  Plan a Drop
                </button>
              </>
            ) : (
              <>
                <div className={styles.dropHeader}>
                  <h2 className={styles.dropLabel}>{activeDrop?.label}</h2>
                  <span className={`${styles.dropStatus} ${dropState === 'live' ? styles.dropLive : ''}`}>
                    {dropState === 'live' ? <><span className={styles.pulseDot} /> DROP LIVE</> : `Going live ${formatDate(activeDrop!.scheduled_at, 'relative')}`}
                  </span>
                </div>
                {dropState === 'pre' && <Countdown targetDate={activeDrop!.scheduled_at} />}
                <div className={styles.dropMetrics}>
                  <span className={styles.dropMetric}>{activeDrop?.product_ids.length} items staged</span>
                  {dropState === 'live' && (
                    <>
                      <span className={styles.dropMetric}>14 orders this session</span>
                      <span className={styles.dropMetric}>3 items remaining</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Middle Module: Inventory Health */}
        <div className={styles.moduleCard}>
          <span className={styles.sectionTitle}>Inventory Health</span>
          <div className={styles.inventoryStrip}>
            <div className={styles.inventoryMetric}>
              <span className={styles.inventoryValue}>{liveItems}</span>
              <span className={styles.inventoryLabel}>live items</span>
            </div>
            <div className={styles.inventoryMetric}>
              <span className={styles.inventoryValue}>{lowStockItems}</span>
              <span className={styles.inventoryLabel}>≤3 stock</span>
            </div>
            <div className={styles.inventoryMetric}>
              <span className={styles.inventoryValue}>{stagnantItems}</span>
              <span className={styles.inventoryLabel}>14+ days, no sale</span>
            </div>
          </div>
        </div>

        {/* Vitals */}
        <div className={styles.vitalsGrid}>
          <div className={styles.vitalCard}>
            <span className={styles.vitalLabel}>Revenue Today</span>
            <span className={styles.vitalValue}>{formatCurrencyFull(revenueToday)}</span>
            <span className={styles.vitalSub}>+23% vs yesterday</span>
          </div>
          <div className={styles.vitalCard}>
            <span className={styles.vitalLabel}>Top Item Today</span>
            <span className={styles.vitalValue} style={{ fontSize: 18 }}>{topItemToday}</span>
          </div>
          <div className={styles.vitalCard}>
            <span className={styles.vitalLabel}>Unique Buyers</span>
            <span className={styles.vitalValue}>{uniqueBuyersToday}</span>
          </div>
        </div>

        {/* Action Desk */}
        <div className={styles.actionDesk}>
          {dropState === 'pre' && (
            <>
              <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => {}}>
                <span className={styles.actionBtnLabel}>Set Drop Live</span>
                <span className={styles.actionBtnSub}>Go public now</span>
              </button>
              <button className={styles.actionBtn} onClick={() => navigate('/archive')}>
                <span className={styles.actionBtnLabel}>Manage Items</span>
                <span className={styles.actionBtnSub}>Edit stage</span>
              </button>
            </>
          )}
          {dropState === 'live' && (
            <>
              <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => navigate('/ledger')}>
                <span className={styles.actionBtnLabel}>View Pre-orders</span>
                <span className={styles.actionBtnSub}>Handle fulfilment</span>
              </button>
              <button className={styles.actionBtn} onClick={() => navigate('/terminal')}>
                <span className={styles.actionBtnLabel}>Terminal</span>
                <span className={styles.actionBtnSub}>Record a sale</span>
              </button>
            </>
          )}
          {dropState === 'none' && (
            <>
              <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => navigate('/archive')}>
                <span className={styles.actionBtnLabel}>Plan Drop</span>
                <span className={styles.actionBtnSub}>Stage new items</span>
              </button>
              <button className={styles.actionBtn} onClick={() => navigate('/archive')}>
                <span className={styles.actionBtnLabel}>Add Item</span>
                <span className={styles.actionBtnSub}>Single upload</span>
              </button>
            </>
          )}
          <button className={styles.actionBtn} onClick={() => window.open(`https://${storeUrl}`, '_blank')}>
            <span className={styles.actionBtnLabel}>View Store</span>
            <span className={styles.actionBtnSub}>Customer view</span>
          </button>
        </div>

        {/* Activity Log */}
        <div className={styles.moduleCard}>
          <span className={styles.sectionTitle}>Recent Activity</span>
          <div className={styles.activityLog}>
            {FIXTURE_RECEIPTS.filter(r => r.merchant_id === merchant.id).slice(0, 5).map(r => (
              <div key={r.id} className={styles.activityEntry}>
                <div className={`${styles.pulseDot} ${r.payment_status === 'paid' ? styles.statusPaid : ''}`} style={{ backgroundColor: r.payment_status === 'paid' ? '#2ECB75' : '#C9A84C' }} />
                <span>
                  <Link to={`/ledger?tab=buyers&buyer=${r.buyer_name}`} className={styles.activityLink}>{r.buyer_name}</Link>
                  {' bought '}
                  {r.line_items[0] ? (
                    <Link to={`/archive?focus=${r.line_items[0].product_id}`} className={styles.activityLink}>{r.line_items[0].name}</Link>
                  ) : (
                    'an item'
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  const renderVendor = () => {
    const activeWindow = FIXTURE_WINDOWS.find(
      w => w.merchant_id === merchant.id && w.status === 'open'
    ) ?? null;
    const nextWindow = FIXTURE_WINDOWS
      .filter(w => w.merchant_id === merchant.id && w.status === 'scheduled')
      .sort((a, b) => new Date(a.opens_at).getTime() - new Date(b.opens_at).getTime())[0] ?? null;
    const windowState = activeWindow ? 'open' : nextWindow ? 'closed' : 'dormant';

    return (
      <>
        {/* Top Module: Window State Banner */}
        <div className={`${styles.windowBanner} ${windowState === 'open' ? styles.windowOpen : windowState === 'closed' ? styles.windowClosed : styles.windowDormant}`}>
          <span className={styles.windowStatusLine}>
            {windowState === 'open' && `● WINDOW OPEN · Closes ${formatDate(activeWindow!.closes_at, 'relative')}`}
            {windowState === 'closed' && `● CLOSED · Next window: ${formatDate(nextWindow!.opens_at, 'long')}`}
            {windowState === 'dormant' && 'No window scheduled'}
          </span>
          <span className={styles.windowSub}>
            {windowState === 'open' && '12 items active · 14 orders so far'}
            {windowState === 'closed' && 'Prepare your menu for the next window'}
            {windowState === 'dormant' && 'Create a window to start taking orders'}
          </span>
        </div>

        {/* Middle Module: Per-Item Demand Bar (Open only) */}
        {windowState === 'open' && (
          <div className={styles.moduleCard}>
            <span className={styles.sectionTitle}>Per-Item Demand</span>
            <div className={styles.demandBars}>
              {[
                { name: 'Jollof Rice', count: 8, cap: 20 },
                { name: 'Small Chops', count: 20, cap: 20 },
                { name: 'Peppered Snail', count: 4, cap: 15 }
              ].map(item => {
                const pct = (item.count / item.cap) * 100;
                const isSoldOut = item.count === item.cap;
                const isGold = pct >= 80 && !isSoldOut;
                return (
                  <div key={item.name} className={styles.demandRow}>
                    <div className={styles.demandHeader}>
                      <span className={styles.demandName}>{item.name}</span>
                      <span className={styles.demandCount}>
                        {isSoldOut ? 'SOLD OUT' : `${item.count}/${item.cap} orders`}
                      </span>
                    </div>
                    <div className={styles.demandBar}>
                      <div 
                        className={`${styles.demandBarFill} ${isGold ? styles.demandBarGold : ''} ${isSoldOut ? styles.demandSoldOut : ''}`} 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vitals */}
        <div className={styles.vitalsGrid}>
          <div className={styles.vitalCard}>
            <span className={styles.vitalLabel}>Active Orders</span>
            <span className={styles.vitalValue}>14</span>
            <span className={styles.vitalSub}>8 for pickup · 6 for delivery</span>
          </div>
          <div className={styles.vitalCard}>
            <span className={styles.vitalLabel}>Fulfilment</span>
            <span className={styles.vitalValue}>42%</span>
            <span className={styles.vitalSub}>6/14 completed</span>
          </div>
          <div className={styles.vitalCard}>
            <span className={styles.vitalLabel}>Sold Out</span>
            <span className={styles.vitalValue}>1</span>
            <span className={styles.vitalSub}>Small Chops</span>
          </div>
        </div>

        {/* Action Desk */}
        <div className={styles.actionDesk}>
          {windowState === 'open' ? (
            <>
              <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => {}}>
                <span className={styles.actionBtnLabel}>Close Window Early</span>
                <span className={styles.actionBtnSub}>Stop taking orders</span>
              </button>
              <button className={styles.actionBtn} onClick={() => navigate('/ledger')}>
                <span className={styles.actionBtnLabel}>Manage Pre-orders</span>
                <span className={styles.actionBtnSub}>View list</span>
              </button>
            </>
          ) : windowState === 'closed' ? (
            <>
              <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => navigate('/schedule')}>
                <span className={styles.actionBtnLabel}>Schedule Next Window</span>
                <span className={styles.actionBtnSub}>Plan for next week</span>
              </button>
              <button className={styles.actionBtn} onClick={() => {}}>
                <span className={styles.actionBtnLabel}>View Last Summary</span>
                <span className={styles.actionBtnSub}>31 orders total</span>
              </button>
            </>
          ) : (
            <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => navigate('/schedule')}>
              <span className={styles.actionBtnLabel}>Create Window</span>
              <span className={styles.actionBtnSub}>Open for orders</span>
            </button>
          )}
          <button className={styles.actionBtn} onClick={() => window.open(`https://${storeUrl}`, '_blank')}>
            <span className={styles.actionBtnLabel}>View Menu</span>
            <span className={styles.actionBtnSub}>Customer view</span>
          </button>
        </div>
      </>
    );
  };

  const renderHost = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysBookings = FIXTURE_BOOKINGS
      .filter(b => b.merchant_id === merchant.id && b.scheduled_at.startsWith(todayStr) && b.status === 'confirmed')
      .sort((a,b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    const pendingConfirmation = FIXTURE_BOOKINGS.filter(b => b.merchant_id === merchant.id && b.status === 'pending').length;
    const unpaidDeposits = 1; // Mocked
    const upcomingNoDeposit = 0; // Mocked

    return (
      <>
        {/* Top Module: Today's Appointments */}
        <div className={styles.moduleCard}>
          <span className={styles.sectionTitle}>Today's Schedule</span>
          {todaysBookings.length > 0 ? (
            <div className={styles.appointmentStrip}>
              {todaysBookings.map(b => (
                <div key={b.id} className={styles.appointmentRow} onClick={() => navigate(`/bookings?id=${b.id}`)}>
                  <span className={styles.apptTime}>
                    {new Date(b.scheduled_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                  <div className={styles.apptInfo}>
                    <span className={styles.apptService}>{b.service_name}</span>
                    <span className={styles.apptClient}>{b.buyer_name}</span>
                  </div>
                  <div className={`${styles.apptStatus} ${b.deposit_paid > 0 ? styles.statusPaid : styles.statusAwaited}`}>
                    {b.deposit_paid > 0 ? <><CheckCircle size={10} /> Deposit paid</> : <><Clock size={10} /> Deposit awaited</>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.vitalSub}>No appointments today — your schedule is clear.</p>
          )}
        </div>

        {/* Middle Module: Pending Actions */}
        <div className={styles.moduleCard}>
          <span className={styles.sectionTitle}>Pending Actions</span>
          <div className={styles.pendingActions}>
            <div className={styles.pendingRow} onClick={() => navigate('/bookings?tab=pending')}>
              <span><span className={styles.pendingCount}>{pendingConfirmation}</span> Bookings awaiting confirmation</span>
              <span className={styles.pendingLink}>Review ›</span>
            </div>
            <div className={styles.pendingRow} onClick={() => navigate('/bookings?tab=pending')}>
              <span><span className={styles.pendingCount}>{unpaidDeposits}</span> Deposits requested but unpaid</span>
              <span className={styles.pendingLink}>Chase ›</span>
            </div>
            <div className={styles.pendingRow}>
              <span><span className={styles.pendingCount} style={{ backgroundColor: '#2ECB75' }}>{upcomingNoDeposit}</span> Upcoming without deposit (&lt;48h)</span>
              <span className={styles.pendingLink} style={{ color: '#2ECB75' }}>✓ All clear</span>
            </div>
          </div>
          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--color-fg-muted)' }}>
            Next available: Thu 10am · <button onClick={() => { handleCopy(); }} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', padding: 0 }}>Copy booking link</button>
          </div>
        </div>

        {/* Vitals */}
        <div className={styles.vitalsGrid}>
          <div className={styles.vitalCard}>
            <span className={styles.vitalLabel}>Revenue today</span>
            <span className={styles.vitalValue}>₦12,500</span>
            <span className={styles.vitalSub}>from confirmed deposits</span>
          </div>
          <div className={styles.vitalCard}>
            <span className={styles.vitalLabel}>Bookings</span>
            <span className={styles.vitalValue}>4</span>
            <span className={styles.vitalSub}>today</span>
          </div>
          <div className={styles.vitalCard}>
            <span className={styles.vitalLabel}>Fill Rate</span>
            <span className={styles.vitalValue}>85%</span>
            <span className={styles.vitalSub}>this week</span>
          </div>
        </div>

        {/* Action Desk */}
        <div className={styles.actionDesk}>
          {pendingConfirmation > 0 ? (
            <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => navigate('/bookings?tab=pending')}>
              <span className={styles.actionBtnLabel}>Review Pending</span>
              <span className={styles.actionBtnSub}>{pendingConfirmation} new requests</span>
            </button>
          ) : (
            <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => navigate('/bookings')}>
              <span className={styles.actionBtnLabel}>View Schedule</span>
              <span className={styles.actionBtnSub}>Check calendar</span>
            </button>
          )}
          <button className={styles.actionBtn} onClick={() => navigate('/terminal')}>
            <span className={styles.actionBtnLabel}>Terminal</span>
            <span className={styles.actionBtnSub}>Manual booking</span>
          </button>
        </div>
      </>
    );
  };

  const renderDigital = () => {
    return (
      <>
        {/* Top Module: Earnings Ticker */}
        <div className={styles.moduleCard}>
          <div className={styles.earningsTicker}>
            <span className={styles.sectionTitle}>Earnings Today</span>
            <h2 className={styles.earningsHeadline}>₦47,500</h2>
            <div className={styles.trendRow}>
              <span className={styles.trendUp}><TrendingUp size={14} /> ₦12,000</span>
              <span className={styles.vitalSub}>vs yesterday</span>
            </div>
            <span className={styles.earningsSub}>3 downloads · 2 new buyers</span>
          </div>
        </div>

        {/* Middle Module: Catalogue Health */}
        <div className={styles.moduleCard}>
          <span className={styles.sectionTitle}>Catalogue Health</span>
          <div className={styles.catalogueHealth}>
            {[
              { name: 'Brand Starter Kit', downloads: 47, revenue: 564000, flag: null, live: true },
              { name: 'Lightroom Preset Pack', downloads: 12, revenue: 54000, flag: '0 downloads in 14 days', live: false },
              { name: 'Notion Dashboard', downloads: 8, revenue: 60000, flag: null, live: true },
              { name: 'Social Kit (Free)', downloads: 23, revenue: 0, flag: 'No preview asset', live: false, free: true }
            ].map(p => (
              <div key={p.name} className={styles.healthRow}>
                <span className={styles.healthName}>{p.name}</span>
                <span className={styles.healthStat}>{p.downloads} {p.free ? 'claims' : 'dl'}</span>
                <span className={styles.healthStat}>{p.free ? 'Free' : formatCurrencyFull(p.revenue)}</span>
                {p.flag ? (
                  <span className={styles.healthFlag}><AlertTriangle size={10} /> {p.flag}</span>
                ) : (
                  <span className={styles.vitalDelta} style={{ color: '#2ECB75', fontSize: 10 }}>● Live</span>
                )}
              </div>
            ))}
          </div>
          <p style={{ marginTop: 16, fontSize: 12, color: 'var(--color-fg-ghost)' }}>
            62% of downloads today are from outside Nigeria.
          </p>
        </div>

        {/* Vitals */}
        <div className={styles.vitalsGrid}>
          <div className={styles.vitalCard}>
            <span className={styles.vitalLabel}>Top Geography</span>
            <span className={styles.vitalValue}>UK</span>
            <span className={styles.vitalSub}>22% of sales</span>
          </div>
          <div className={styles.vitalCard}>
            <span className={styles.vitalLabel}>Repeat Buyers</span>
            <span className={styles.vitalValue}>14%</span>
            <span className={styles.vitalSub}>this month</span>
          </div>
        </div>

        {/* Action Desk */}
        <div className={styles.actionDesk}>
          <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => {}}>
            <span className={styles.actionBtnLabel}>Upload Product</span>
            <span className={styles.actionBtnSub}>New digital asset</span>
          </button>
          <button className={styles.actionBtn} onClick={() => navigate('/catalogue')}>
            <span className={styles.actionBtnLabel}>View Catalogue</span>
            <span className={styles.actionBtnSub}>Manage listings</span>
          </button>
        </div>
      </>
    );
  };

  const renderStudio = () => {
    const pipelineValue = FIXTURE_ENQUIRIES.filter(e => e.status !== 'declined' && e.status !== 'completed').reduce((acc, e) => acc + (e.package_value || 0), 0);
    const pendingDepositsCount = FIXTURE_ENQUIRIES.filter(e => e.status === 'active_project' && (e.deposit_paid || 0) < (e.package_value || 0)).length;
    const outstandingDepositValue = FIXTURE_ENQUIRIES.filter(e => e.status === 'active_project' && (e.deposit_paid || 0) < (e.package_value || 0)).reduce((acc, e) => acc + ((e.package_value || 0) - (e.deposit_paid || 0)), 0);

    const stages = [
      { id: 'new', label: 'New Enquiries', color: '#C9A84C' },
      { id: 'in_discussion', label: 'In Discussion', color: 'var(--color-accent)' },
      { id: 'active_project', label: 'Active Projects', color: '#2ECB75' }
    ];

    const oldestNew = FIXTURE_ENQUIRIES.filter(e => e.status === 'new').sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
    const waitingHours = oldestNew ? Math.floor((Date.now() - new Date(oldestNew.created_at).getTime()) / 3600000) : 0;

    return (
      <>
        {/* Top Module: Pending Value */}
        <div className={styles.pendingValue}>
          <span className={styles.sectionTitle}>Pipeline Status</span>
          <h2 className={styles.pipelineValue}>{formatCurrencyFull(pipelineValue)} in active pipeline</h2>
          <span className={styles.outstandingText}>
            {pendingDepositsCount} projects pending deposit ({formatCurrencyFull(outstandingDepositValue)} outstanding)
          </span>
        </div>

        {/* Middle Module: Pipeline */}
        <div className={styles.pipeline}>
          {stages.map(stage => {
            const items = FIXTURE_ENQUIRIES.filter(e => e.status === stage.id);
            return (
              <div key={stage.id} className={styles.pipelineColumn}>
                <h3 className={styles.pipelineColumnTitle}>{stage.label} ({items.length})</h3>
                {items.map(e => (
                  <div key={e.id} className={styles.pipelineCard} onClick={() => navigate(`/bookings?enquiry=${e.id}`)}>
                    <span className={styles.pipelineClient}>{e.client_name}</span>
                    <span className={styles.pipelineProject}>{e.project_type}</span>
                    {e.package_value && <span className={styles.pipelinePrice}>{formatCurrencyFull(e.package_value)}</span>}
                    <div className={styles.pipelineMeta}>
                      <span>{formatDate(e.created_at, 'relative')}</span>
                      {e.status === 'active_project' && (
                        <span style={{ color: (e.deposit_paid || 0) >= (e.package_value || 0) / 2 ? '#2ECB75' : '#C9A84C' }}>
                          Deposit: { (e.deposit_paid || 0) >= (e.package_value || 0) / 2 ? '✓ Paid' : '⚡ Awaited' }
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Response Timer Alert */}
        {waitingHours >= 24 && (
          <div className={styles.responseTimer}>
            <Clock size={14} />
            <span>⏱ 1 enquiry awaiting reply — {waitingHours} hours</span>
          </div>
        )}

        {/* Action Desk */}
        <div className={styles.actionDesk}>
          {FIXTURE_ENQUIRIES.some(e => e.status === 'new') ? (
            <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => navigate('/bookings')}>
              <span className={styles.actionBtnLabel}>Reply to Enquiry</span>
              <span className={styles.actionBtnSub}>1 unread message</span>
            </button>
          ) : (
            <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => navigate('/archive')}>
              <span className={styles.actionBtnLabel}>View Portfolio</span>
              <span className={styles.actionBtnSub}>Public display</span>
            </button>
          )}
          <button className={styles.actionBtn} onClick={() => navigate('/archive')}>
            <span className={styles.actionBtnLabel}>Upload to Portfolio</span>
            <span className={styles.actionBtnSub}>Add new work</span>
          </button>
        </div>
      </>
    );
  };

  return (
    <div className={styles.root}>

      {/* ── Top Bar (Slot 1: Header) ── */}
      <div className={styles.topBar}>
        <div className={styles.greeting}>
          <span className={styles.greetingTime}>
            {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h1 className={styles.greetingName}>
            {merchant.store_name}
          </h1>
        </div>
        <div className={styles.topBarActions}>
          <button
            className={styles.shareBtn}
            onClick={() => setShareOpen(true)}
            aria-label="Share store"
          >
            <Share2 size={14} aria-hidden="true" />
            Share Store
          </button>
        </div>
      </div>

      {/* ── DASHBOARD SLOTS 2-5 ── */}
      {st.isCollector && renderCollector()}
      {st.isVendor && renderVendor()}
      {st.isHost && renderHost()}
      {st.isDigital && renderDigital()}
      {st.isStudio && renderStudio()}

      {/* ── Share Drawer ── */}
      <BaseDrawer open={shareOpen} onClose={() => setShareOpen(false)} title="Share Your Store">
        <div className={styles.shareDrawerContent}>
          <div className={styles.shareUrlBox}>
            <span className={styles.shareUrl}>{storeUrl}</span>
            <button className={styles.copyBtn} onClick={handleCopy} aria-label="Copy store link">
              Copy
            </button>
          </div>
          <div className={styles.shareOptions}>
            {[
              {
                icon: <MessageCircle size={18} style={{ color: '#25D366' }} />,
                label: 'WhatsApp',
                action: () => { window.open(`https://wa.me/?text=Shop%20my%20store%20at%20https%3A%2F%2F${storeUrl}`, '_blank'); },
              },
              {
                icon: <Instagram size={18} style={{ color: '#E1306C' }} />,
                label: 'Instagram',
                action: handleCopy,
              },
              {
                icon: <Copy size={18} style={{ color: 'var(--color-fg-muted)' }} />,
                label: 'Copy',
                action: handleCopy,
              },
              {
                icon: <ExternalLink size={18} style={{ color: 'var(--color-fg-muted)' }} />,
                label: 'Open',
                action: () => navigate(`/store/${merchant.handle}`),
              },
            ].map((opt) => (
              <button
                key={opt.label}
                className={styles.shareOption}
                onClick={opt.action}
                aria-label={opt.label}
              >
                <div className={styles.shareOptionIcon} aria-hidden="true">
                  {opt.icon}
                </div>
                {opt.label}
              </button>
            ))}
          </div>
          <div style={{ height: 1, background: 'var(--color-border-dim)', margin: '8px 0' }} />
          <DropCardGenerator merchant={merchant} />
        </div>
      </BaseDrawer>

      {/* ── Dev Switcher (DEV only) ── */}
      {import.meta.env.DEV && (
        <div className={styles.devContainer}>
          <div className={styles.devDropdown}>
            {devMenuOpen && (
              <div className={styles.devMenu}>
                <span className={styles.devLabel}>Store Type</span>
                {DEV_MERCHANTS.map((m) => (
                  <button
                    key={m.label}
                    className={`${styles.devMenuItem} ${merchant.id === m.merchant.id ? styles.devMenuItemActive : ''}`}
                    onClick={() => {
                      useMerchantStore.getState().setMerchant(m.merchant);
                      addToast(`Switched to ${m.label}`, 'info');
                      setDevMenuOpen(false);
                    }}
                  >
                    {m.label}
                  </button>
                ))}
                <div className={styles.devMenuDivider} />
                <button
                  className={`${styles.devMenuItem} ${devPaused ? styles.devMenuItemPaused : ''}`}
                  onClick={() => setDevPaused((p) => !p)}
                >
                  {devPaused ? '● Store PAUSED' : '○ Store Active'}
                </button>
              </div>
            )}
            <button
              className={styles.devToggle}
              onClick={() => setDevMenuOpen((o) => !o)}
              aria-label="Dev tools"
            >
              {DEV_MERCHANTS.find((m) => m.merchant.id === merchant.id)?.label ?? 'DEV'}
              {' ▾'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
