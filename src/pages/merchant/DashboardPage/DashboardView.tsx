import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { m, AnimatePresence, staggerContainer, staggerChild } from '@/lib/motion';
import {
  Share2, ExternalLink, Copy, MessageCircle, Instagram,
  AlertTriangle, CheckCircle, TrendingUp,
} from 'lucide-react';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { useUIStore } from '@/lib/store/ui.store';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { useArchiveStore } from '@/lib/store/archive.store';
import { formatCurrencyFull, formatDate } from '@/lib/utils/format';
import type { Product } from '@/lib/types';
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

function Countdown({ targetDate, onFinish, isUrgent }: { targetDate: string; onFinish?: () => void; isUrgent?: boolean }) {
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
    <div className={`${styles.dropCountdown} ${isUrgent ? styles.dropCountdownUrgent : ''}`}>
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
  const { products, lastSoldOutProductId, clearLastSoldOutProduct } = useArchiveStore();
  const [shareOpen, setShareOpen] = useState(false);
  const [devPaused, setDevPaused] = useState(false);
  const [devMenuOpen, setDevMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [soldOutNotification, setSoldOutNotification] = useState<Product | null>(null);

  // Simulate loading (Phase 3C)
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Sold out listener
  useEffect(() => {
    if (lastSoldOutProductId) {
      const p = products.find(x => x.id === lastSoldOutProductId);
      if (p) {
        setSoldOutNotification(p);
        const timer = setTimeout(() => {
          setSoldOutNotification(null);
          clearLastSoldOutProduct();
        }, 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [lastSoldOutProductId, products, clearLastSoldOutProduct]);

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

    const lastCompletedDrop = [...FIXTURE_DROPS]
      .filter(d => d.merchant_id === merchant.id && d.status === 'completed')
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())[0] ?? null;

    const dropState = activeDrop 
      ? (activeDrop.status === 'live' || Date.now() >= new Date(activeDrop.scheduled_at).getTime() ? 'live' : 'pre')
      : (lastCompletedDrop ? 'post' : 'none');

    const dropTimeLeft = activeDrop ? new Date(activeDrop.scheduled_at).getTime() - Date.now() : Infinity;
    const isUrgent = dropState === 'pre' && dropTimeLeft > 0 && dropTimeLeft < 86400000;

    const today = new Date().toDateString();
    const todayPaidReceipts = FIXTURE_RECEIPTS.filter(
      r => r.merchant_id === merchant.id && r.payment_status === 'paid' && new Date(r.updated_at).toDateString() === today
    );

    const revenueToday = todayPaidReceipts.reduce((acc, r) => acc + r.total, 0);
    const topItemToday = todayPaidReceipts.flatMap(r => r.line_items).sort((a, b) => b.unit_price - a.unit_price)[0]?.name ?? '—';
    const uniqueBuyersToday = new Set(todayPaidReceipts.map(r => r.buyer_name)).size;

    // Inventory health
    const lowStockItems = products.filter(p => p.stock_level !== null && p.stock_level > 0 && p.stock_level <= 3).length;

    return (
      <>
        {/* ── FEATURE: DROP STATUS ── */}
        <m.section className={styles.featureSection} variants={staggerChild}>
          <div className={`${styles.featureCard} ${isUrgent ? styles.dropUrgent : ''}`}>
            <div className={styles.featureAccent} />
            {dropState === 'none' ? (
              <div className="empty-state" style={{ background: 'transparent', border: 'none', padding: 0, alignItems: 'flex-start', textAlign: 'left' }}>
                <span className={styles.vitalTitle}>Inventory</span>
                <h2 className={styles.featureTitle} style={{ marginBottom: 12 }}>Next drop awaiting plan</h2>
                <p className={styles.vitalSub}>Curate your next collection to drive engagement.</p>
              </div>
            ) : dropState === 'post' ? (
              <>
                <span className={styles.vitalTitle}>Recent Release</span>
                <h2 className={styles.featureTitle}>{lastCompletedDrop?.label}</h2>
                <div className={styles.dropMetrics} style={{ marginTop: 24 }}>
                  <span className={styles.dropMetric}>{formatCurrencyFull(1420000)} revenue</span>
                  <span className={styles.dropMetric}>31 orders total</span>
                </div>
              </>
            ) : (
              <>
                <span className={styles.vitalTitle}>Live Production</span>
                <h2 className={styles.featureTitle}>{activeDrop?.label}</h2>
                <div className={`${styles.dropStatus} ${dropState === 'live' ? styles.dropLive : ''}`} style={{ marginTop: 8 }}>
                  {dropState === 'live' ? <><span className={styles.pulseDot} /> COLLECTING ORDERS</> : isUrgent ? 'RELEASE IMMINENT' : `Scheduled for ${formatDate(activeDrop!.scheduled_at, 'relative')}`}
                </div>
                {dropState === 'pre' && (
                  <div className={styles.countdownOverlay}>
                    <Countdown targetDate={activeDrop!.scheduled_at} isUrgent={isUrgent} />
                  </div>
                )}
                <div className={styles.dropMetrics} style={{ marginTop: 24 }}>
                  <span className={styles.dropMetric}>{activeDrop?.product_ids.length} items staged</span>
                  {dropState === 'live' && (
                    <span className={styles.dropMetric}>14 orders this session</span>
                  )}
                </div>
              </>
            )}
          </div>
        </m.section>

        {/* ── VITALS SPREAD ── */}
        <m.section className={styles.vitalsSpread} variants={staggerChild}>
          <div className={styles.heroVital}>
            <span className={styles.vitalTitle}>Today's Volume</span>
            <div className={styles.vitalDisplay}>{formatCurrencyFull(revenueToday)}</div>
            <p className={styles.vitalSub} style={{ marginTop: 8 }}>{uniqueBuyersToday} unique buyers · +23% vs prev.</p>
          </div>
          <div className={styles.vitalCard}>
            <span className={styles.vitalTitle}>Best Seller</span>
            <div className={styles.vitalDisplay} style={{ fontSize: 24 }}>{topItemToday}</div>
          </div>
          <div className={styles.vitalCard}>
            <span className={styles.vitalTitle}>Stock Alerts</span>
            <div className={styles.vitalDisplay} style={{ fontSize: 24 }}>{lowStockItems} low stock</div>
          </div>
        </m.section>

        {/* ── DIRECTORY: ACTIONS ── */}
        <m.nav className={styles.directory} variants={staggerChild}>
          {[
            {
              show: dropState === 'pre',
              label: 'Go Live',
              sub: 'Publish drop to your public store',
              onClick: () => {}
            },
            {
              show: dropState === 'live',
              label: 'Fulfillment',
              sub: 'Handle 14 active orders',
              onClick: () => navigate('/ledger')
            },
            {
              show: true,
              label: 'Archive',
              sub: `Manage your full inventory (${products.length} items)`,
              onClick: () => navigate('/archive')
            },
            {
              show: true,
              label: 'View Store',
              sub: 'Customer-facing experience',
              onClick: () => window.open(`https://${storeUrl}`, '_blank')
            }
          ].filter(i => i.show).map((item, idx) => (
            <button key={item.label} className={styles.directoryItem} onClick={item.onClick}>
              <span className={styles.directoryIndex}>{(idx + 1).toString().padStart(2, '0')}</span>
              <div className={styles.directoryContent}>
                <span className={styles.directoryLabel}>{item.label}</span>
                <p className={styles.directorySub}>{item.sub}</p>
              </div>
              <span className={styles.directoryArrow}>→</span>
            </button>
          ))}
        </m.nav>

        {/* ── SIDEBAR: ACTIVITY ── */}
        <m.aside className={styles.sidebar} variants={staggerChild}>
          <h3 className={styles.sidebarTitle}>The Journal</h3>
          <div className={styles.sidebarList}>
            {FIXTURE_RECEIPTS.filter(r => r.merchant_id === merchant.id).slice(0, 6).map(r => (
              <div key={r.id} className={styles.sidebarEntry}>
                <p className={styles.sidebarText}>
                  <Link to={`/ledger?tab=buyers&buyer=${r.buyer_name}`} className={styles.sidebarLink}>{r.buyer_name}</Link>
                  {' acquired '}
                  {r.line_items[0] ? (
                    <Link to={`/archive?focus=${r.line_items[0].product_id}`} className={styles.sidebarLink}>{r.line_items[0].name}</Link>
                  ) : (
                    'a new piece'
                  )}
                  {'.'}
                </p>
                <span className={styles.sidebarMeta}>{formatDate(r.updated_at, 'relative')}</span>
              </div>
            ))}
          </div>
        </m.aside>
      </>
    );
  };

  const renderVendor = () => {
    const activeWindow = FIXTURE_WINDOWS.find(
      w => w.merchant_id === merchant.id && w.status === 'open'
    ) ?? null;
    const nextWindow = FIXTURE_WINDOWS
      .filter(w => w.merchant_id === merchant.id && w.status === 'upcoming')
      .sort((a, b) => new Date(a.opens_at).getTime() - new Date(b.opens_at).getTime())[0] ?? null;
    const windowState = activeWindow ? 'open' : nextWindow ? 'closed' : 'dormant';

    const windowTimeLeft = activeWindow ? new Date(activeWindow.closes_at).getTime() - Date.now() : Infinity;
    const isClosingSoon = windowState === 'open' && windowTimeLeft > 0 && windowTimeLeft < 7200000; // < 2h

    return (
      <>
        {/* ── FEATURE: WINDOW STATE ── */}
        <m.section className={styles.featureSection} variants={staggerChild}>
          <div className={`${styles.featureCard} ${windowState === 'open' ? (isClosingSoon ? styles.windowClosingSoon : styles.windowOpen) : ''}`}>
            <div className={styles.featureAccent} />
            <span className={styles.vitalTitle}>Order Window</span>
            <h2 className={styles.featureTitle}>
              {windowState === 'open' ? 'Currently Accepting Orders' : windowState === 'closed' ? 'Window Closed' : 'No Window Scheduled'}
            </h2>
            <div className={styles.dropStatus} style={{ marginTop: 8 }}>
              {windowState === 'open' && (isClosingSoon ? `● CLOSING IMMINENT · ${formatDate(activeWindow!.closes_at, 'relative')}` : `● OPEN · Closes ${formatDate(activeWindow!.closes_at, 'relative')}`)}
              {windowState === 'closed' && `● NEXT SESSION: ${formatDate(nextWindow!.opens_at, 'long')}`}
            </div>
            <div className={styles.dropMetrics} style={{ marginTop: 24 }}>
              {windowState === 'open' && (
                <>
                  <span className={styles.dropMetric}>12 items active</span>
                  <span className={styles.dropMetric}>14 orders collected</span>
                </>
              )}
              {windowState === 'closed' && <span className={styles.dropMetric}>31 orders total in last session</span>}
            </div>
          </div>
        </m.section>

        {/* ── VITALS SPREAD ── */}
        <m.section className={styles.vitalsSpread} variants={staggerChild}>
          <div className={styles.heroVital}>
            <span className={styles.vitalTitle}>Active Fulfillment</span>
            <div className={styles.vitalDisplay}>42% Complete</div>
            <p className={styles.vitalSub} style={{ marginTop: 8 }}>6 of 14 orders processed · 8 pickup · 6 delivery</p>
          </div>
          {windowState === 'open' && (
            <div className={styles.vitalCard}>
              <span className={styles.vitalTitle}>High Demand</span>
              <div className={styles.vitalDisplay} style={{ fontSize: 24 }}>Small Chops</div>
              <p className={styles.vitalSub}>Sold out</p>
            </div>
          )}
        </m.section>

        {/* ── DIRECTORY: ACTIONS ── */}
        <m.nav className={styles.directory} variants={staggerChild}>
          {[
            {
              show: windowState === 'open',
              label: 'Close Window',
              sub: 'Stop taking new orders early',
              onClick: () => {}
            },
            {
              show: windowState !== 'open',
              label: 'Schedule Window',
              sub: 'Set your next availability',
              onClick: () => navigate('/schedule')
            },
            {
              show: true,
              label: 'Orders',
              sub: 'Manage active fulfillment list',
              onClick: () => navigate('/ledger')
            },
            {
              show: true,
              label: 'View Menu',
              sub: 'Public storefront experience',
              onClick: () => window.open(`https://${storeUrl}`, '_blank')
            }
          ].filter(i => i.show).map((item, idx) => (
            <button key={item.label} className={styles.directoryItem} onClick={item.onClick}>
              <span className={styles.directoryIndex}>{(idx + 1).toString().padStart(2, '0')}</span>
              <div className={styles.directoryContent}>
                <span className={styles.directoryLabel}>{item.label}</span>
                <p className={styles.directorySub}>{item.sub}</p>
              </div>
              <span className={styles.directoryArrow}>→</span>
            </button>
          ))}
        </m.nav>

        {/* ── SIDEBAR: ACTIVITY ── */}
        <m.aside className={styles.sidebar} variants={staggerChild}>
          <h3 className={styles.sidebarTitle}>Order Feed</h3>
          <div className={styles.sidebarList}>
            {FIXTURE_RECEIPTS.filter(r => r.merchant_id === merchant.id).slice(0, 6).map(r => (
              <div key={r.id} className={styles.sidebarEntry}>
                <p className={styles.sidebarText}>
                  <span className={styles.sidebarLink}>{r.buyer_name}</span>
                  {' placed an order for '}
                  <strong>{r.line_items.length} items</strong>
                  {'.'}
                </p>
                <span className={styles.sidebarMeta}>{formatDate(r.updated_at, 'relative')}</span>
              </div>
            ))}
          </div>
        </m.aside>
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

    return (
      <>
        {/* ── FEATURE: TODAY'S SCHEDULE ── */}
        <m.section className={styles.featureSection} variants={staggerChild}>
          <div className={styles.featureCard}>
            <div className={styles.featureAccent} />
            <span className={styles.vitalTitle}>Daily Schedule</span>
            <h2 className={styles.featureTitle}>
              {todaysBookings.length > 0 ? `${todaysBookings.length} confirmed appointments` : 'Clear Schedule'}
            </h2>
            <div className={styles.appointmentStrip} style={{ marginTop: 24 }}>
              {todaysBookings.slice(0, 3).map(b => (
                <div key={b.id} className={styles.appointmentRow} onClick={() => navigate(`/bookings?id=${b.id}`)}>
                  <span className={styles.apptTime}>
                    {new Date(b.scheduled_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                  <div className={styles.apptInfo}>
                    <span className={styles.apptService}>{b.service_name}</span>
                    <span className={styles.apptClient}>{b.buyer_name}</span>
                  </div>
                </div>
              ))}
              {todaysBookings.length > 3 && (
                <p className={styles.vitalSub}>+ {todaysBookings.length - 3} more today</p>
              )}
            </div>
          </div>
        </m.section>

        {/* ── VITALS SPREAD ── */}
        <m.section className={styles.vitalsSpread} variants={staggerChild}>
          <div className={styles.heroVital}>
            <span className={styles.vitalTitle}>Yield this week</span>
            <div className={styles.vitalDisplay}>85% Fill Rate</div>
            <p className={styles.vitalSub} style={{ marginTop: 8 }}>High demand for morning slots.</p>
          </div>
          <div className={styles.vitalCard}>
            <span className={styles.vitalTitle}>Revenue</span>
            <div className={styles.vitalDisplay} style={{ fontSize: 24 }}>₦12,500</div>
            <p className={styles.vitalSub}>Confirmed deposits</p>
          </div>
        </m.section>

        {/* ── DIRECTORY: ACTIONS ── */}
        <m.nav className={styles.directory} variants={staggerChild}>
          {[
            {
              label: 'Calendar',
              sub: 'Full schedule management',
              onClick: () => navigate('/bookings')
            },
            {
              show: pendingConfirmation > 0,
              label: `Requests (${pendingConfirmation})`,
              sub: 'Review new booking requests',
              onClick: () => navigate('/bookings?tab=pending'),
              isAccent: true
            },
            {
              label: 'Terminal',
              sub: 'Record walk-in bookings',
              onClick: () => navigate('/terminal')
            },
            {
              label: 'Settings',
              sub: 'Availability & rules',
              onClick: () => navigate('/settings')
            }
          ].filter(i => i.show !== false).map((item, idx) => (
            <button key={item.label} className={styles.directoryItem} onClick={item.onClick}>
              <span className={styles.directoryIndex}>{(idx + 1).toString().padStart(2, '0')}</span>
              <div className={styles.directoryContent}>
                <span className={styles.directoryLabel} style={item.isAccent ? { color: 'var(--color-accent)' } : undefined}>
                  {item.label}
                </span>
                <p className={styles.directorySub}>{item.sub}</p>
              </div>
              <span className={styles.directoryArrow}>→</span>
            </button>
          ))}
        </m.nav>

        {/* ── SIDEBAR: ACTIVITY ── */}
        <m.aside className={styles.sidebar} variants={staggerChild}>
          <h3 className={styles.sidebarTitle}>Queue Notes</h3>
          <div className={styles.sidebarList}>
            <div className={styles.sidebarEntry}>
              <p className={styles.sidebarText}>
                There are <strong>{pendingConfirmation}</strong> bookings currently awaiting your confirmation.
              </p>
            </div>
            <div className={styles.sidebarEntry}>
              <p className={styles.sidebarText}>
                <strong>{unpaidDeposits}</strong> clients have not yet fulfilled their deposit requirements.
              </p>
            </div>
          </div>
        </m.aside>
      </>
    );
  };

  const renderDigital = () => {
    return (
      <>
        {/* ── FEATURE: EARNINGS ── */}
        <m.section className={styles.featureSection} variants={staggerChild}>
          <div className={styles.featureCard}>
            <div className={styles.featureAccent} />
            <span className={styles.vitalTitle}>Yield Today</span>
            <h2 className={styles.featureTitle}>₦47,500</h2>
            <div className={styles.trendRow} style={{ marginTop: 12 }}>
              <span className={styles.trendUp}><TrendingUp size={14} /> +₦12,000</span>
              <span className={styles.vitalSub}>since yesterday</span>
            </div>
            <div className={styles.dropMetrics} style={{ marginTop: 24 }}>
              <span className={styles.dropMetric}>3 downloads today</span>
              <span className={styles.dropMetric}>2 new buyers</span>
            </div>
          </div>
        </m.section>

        {/* ── VITALS SPREAD ── */}
        <m.section className={styles.vitalsSpread} variants={staggerChild}>
          <div className={styles.heroVital}>
            <span className={styles.vitalTitle}>Top Geography</span>
            <div className={styles.vitalDisplay}>United Kingdom</div>
            <p className={styles.vitalSub} style={{ marginTop: 8 }}>22% of total lifetime sales.</p>
          </div>
          <div className={styles.vitalCard}>
            <span className={styles.vitalTitle}>Retention</span>
            <div className={styles.vitalDisplay} style={{ fontSize: 24 }}>14%</div>
            <p className={styles.vitalSub}>Repeat buyers this month</p>
          </div>
        </m.section>

        {/* ── DIRECTORY: ACTIONS ── */}
        <m.nav className={styles.directory} variants={staggerChild}>
          {[
            {
              label: 'Upload',
              sub: 'Mint new digital asset',
              onClick: () => {}
            },
            {
              label: 'Catalogue',
              sub: 'Manage digital listings',
              onClick: () => navigate('/catalogue')
            },
            {
              label: 'Public Store',
              sub: 'Customer experience',
              onClick: () => window.open(`https://${storeUrl}`, '_blank')
            }
          ].map((item, idx) => (
            <button key={item.label} className={styles.directoryItem} onClick={item.onClick}>
              <span className={styles.directoryIndex}>{(idx + 1).toString().padStart(2, '0')}</span>
              <div className={styles.directoryContent}>
                <span className={styles.directoryLabel}>{item.label}</span>
                <p className={styles.directorySub}>{item.sub}</p>
              </div>
              <span className={styles.directoryArrow}>→</span>
            </button>
          ))}
        </m.nav>

        {/* ── SIDEBAR: ACTIVITY ── */}
        <m.aside className={styles.sidebar} variants={staggerChild}>
          <h3 className={styles.sidebarTitle}>Global Analytics</h3>
          <div className={styles.sidebarList}>
            <div className={styles.sidebarEntry}>
              <p className={styles.sidebarText}>
                62% of your downloads today originated from <strong>outside Nigeria</strong>.
              </p>
            </div>
            <div className={styles.sidebarEntry}>
              <p className={styles.sidebarText}>
                Instagram referral traffic has increased by <strong>12%</strong> this week.
              </p>
            </div>
          </div>
        </m.aside>
      </>
    );
  };

  const renderStudio = () => {
    const pipelineValue = FIXTURE_ENQUIRIES.filter(e => e.status !== 'declined' && e.status !== 'completed').reduce((acc, e) => acc + (e.package_value || 0), 0);
    const pendingDepositsCount = FIXTURE_ENQUIRIES.filter(e => e.status === 'active_project' && (e.deposit_paid || 0) < (e.package_value || 0)).length;
    const outstandingDepositValue = FIXTURE_ENQUIRIES.filter(e => e.status === 'active_project' && (e.deposit_paid || 0) < (e.package_value || 0)).reduce((acc, e) => acc + ((e.package_value || 0) - (e.deposit_paid || 0)), 0);

    const oldestNew = FIXTURE_ENQUIRIES.filter(e => e.status === 'new').sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
    const waitingHours = oldestNew ? Math.floor((Date.now() - new Date(oldestNew.created_at).getTime()) / 3600000) : 0;

    return (
      <>
        {/* ── FEATURE: PIPELINE ── */}
        <m.section className={styles.featureSection} variants={staggerChild}>
          <div className={styles.featureCard}>
            <div className={styles.featureAccent} />
            <span className={styles.vitalTitle}>Active Pipeline</span>
            <h2 className={styles.featureTitle}>
              {formatCurrencyFull(pipelineValue)} in production
            </h2>
            <div className={styles.dropMetrics} style={{ marginTop: 24 }}>
              <span className={styles.dropMetric}>{pendingDepositsCount} projects pending deposit</span>
              <span className={styles.dropMetric}>{formatCurrencyFull(outstandingDepositValue)} outstanding</span>
            </div>
          </div>
        </m.section>

        {/* ── VITALS SPREAD ── */}
        <m.section className={styles.vitalsSpread} variants={staggerChild}>
          <div className={styles.heroVital}>
            <span className={styles.vitalTitle}>Project Load</span>
            <div className={styles.vitalDisplay}>{FIXTURE_ENQUIRIES.filter(e => e.status === 'active_project').length} Active</div>
            <p className={styles.vitalSub} style={{ marginTop: 8 }}>Optimal capacity reached.</p>
          </div>
          {waitingHours >= 24 && (
            <div className={styles.vitalCard} style={{ background: 'var(--color-gold-dim)' }}>
              <span className={styles.vitalTitle} style={{ color: 'var(--color-gold-text)' }}>Attention</span>
              <div className={styles.vitalDisplay} style={{ fontSize: 24, color: 'var(--color-gold-text)' }}>{waitingHours}h delay</div>
              <p className={styles.vitalSub}>Enquiry awaiting reply</p>
            </div>
          )}
        </m.section>

        {/* ── DIRECTORY: ACTIONS ── */}
        <m.nav className={styles.directory} variants={staggerChild}>
          {[
            {
              label: 'Inbox',
              sub: 'Reply to new enquiries',
              onClick: () => navigate('/bookings'),
              isAccent: FIXTURE_ENQUIRIES.some(e => e.status === 'new')
            },
            {
              label: 'Portfolio',
              sub: 'Manage public case studies',
              onClick: () => navigate('/archive')
            },
            {
              label: 'New Quote',
              sub: 'Generate custom proposal',
              onClick: () => navigate('/terminal')
            }
          ].map((item, idx) => (
            <button key={item.label} className={styles.directoryItem} onClick={item.onClick}>
              <span className={styles.directoryIndex}>{(idx + 1).toString().padStart(2, '0')}</span>
              <div className={styles.directoryContent}>
                <span className={styles.directoryLabel} style={item.isAccent ? { color: 'var(--color-accent)' } : undefined}>
                  {item.label}
                </span>
                <p className={styles.directorySub}>{item.sub}</p>
              </div>
              <span className={styles.directoryArrow}>→</span>
            </button>
          ))}
        </m.nav>

        {/* ── SIDEBAR: ACTIVITY ── */}
        <m.aside className={styles.sidebar} variants={staggerChild}>
          <h3 className={styles.sidebarTitle}>Interest Log</h3>
          <div className={styles.sidebarList}>
            {FIXTURE_ENQUIRIES.filter(e => e.status === 'new').slice(0, 4).map(e => (
              <div key={e.id} className={styles.sidebarEntry}>
                <p className={styles.sidebarText}>
                  <strong>{e.client_name}</strong>
                  {' inquired about '}
                  <em>{e.project_type}</em>
                  {'.'}
                </p>
                <span className={styles.sidebarMeta}>{formatDate(e.created_at, 'relative')}</span>
              </div>
            ))}
          </div>
        </m.aside>
      </>
    );
  };

  if (isLoading) {
    return (
      <div className={styles.root}>
        <div className={styles.topBar}>
          <div className={styles.greeting}>
            <div className="skeleton skeleton-text" style={{ width: '120px', height: '12px', marginBottom: '16px' }} />
            <div className="skeleton skeleton-text" style={{ width: '320px', height: '64px' }} />
          </div>
        </div>
        <div className={styles.featureSection}>
          <div className="skeleton" style={{ width: '100%', height: '240px', borderRadius: 'var(--r-xl)' }} />
        </div>
        <div className={styles.vitalsSpread}>
          <div className="skeleton" style={{ width: '100%', height: '160px', borderRadius: 'var(--r-lg)' }} />
          <div className="skeleton" style={{ width: '100%', height: '160px', borderRadius: 'var(--r-lg)' }} />
        </div>
        <div className={styles.directory}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ width: '100%', height: '80px', marginBottom: '12px', borderRadius: 'var(--r-sm)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <m.div 
      className={styles.root}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <AnimatePresence>
        {soldOutNotification && (
          <m.div 
            className={styles.soldOutTile}
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className={styles.soldOutIcon}>
              <AlertTriangle size={20} />
            </div>
            <div className={styles.soldOutInfo}>
              <p className={styles.soldOutLabel}>Item Sold Out</p>
              <h3 className={styles.soldOutName}>{soldOutNotification.name}</h3>
              <p className={styles.soldOutUnits}>All units have been claimed.</p>
            </div>
            <CheckCircle size={20} style={{ color: 'var(--color-success-text)' }} />
          </m.div>
        )}
      </AnimatePresence>

      {/* ── MASTHEAD ── */}
      <m.header className={styles.topBar} variants={staggerChild}>
        <div className={styles.greeting}>
          <span className={styles.greetingTime}>
            {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h1 className={styles.mastheadTitle}>
            {merchant.store_name}
          </h1>
        </div>
        <div className={styles.topBarActions}>
          <button
            className={styles.shareBtn}
            onClick={() => setShareOpen(true)}
            aria-label="Share store"
          >
            <Share2 size={12} aria-hidden="true" />
            Share Journal
          </button>
        </div>
      </m.header>

      {/* ── DASHBOARD CONTENT ── */}
      {st.isCollector && renderCollector()}
      {st.isVendor && renderVendor()}
      {st.isHost && renderHost()}
      {st.isDigital && renderDigital()}
      {st.isStudio && renderStudio()}

      {/* ── Share Drawer ── */}
      <BaseDrawer open={shareOpen} onClose={() => setShareOpen(false)} title="Share Store">
        <div className={styles.shareDrawerContent}>
          <div className={styles.shareUrlBox}>
            <span className={styles.shareUrl}>{storeUrl}</span>
            <button className={styles.copyBtn} onClick={handleCopy} aria-label="Copy store URL">
              Copy URL
            </button>
          </div>
          <div className={styles.shareOptions}>
            {[
              {
                icon: <MessageCircle size={18} style={{ color: 'var(--color-whatsapp)' }} />,
                label: 'WhatsApp',
                action: () => { window.open(`https://wa.me/?text=Shop%20my%20store%20at%20https%3A%2F%2F${storeUrl}`, '_blank'); },
              },
              {
                icon: <Instagram size={18} style={{ color: 'var(--color-pink)' }} />,
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
    </m.div>
  );
}
