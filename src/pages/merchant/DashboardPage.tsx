import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from '@/lib/motion';
import {
  Bell, Share2, DollarSign, BookOpen, Package,
  Archive, Terminal, Check, ChevronDown,
  Copy, MessageCircle, Instagram, ExternalLink,
  Calendar, BookMarked, LayoutGrid,
} from 'lucide-react';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { useLedgerStore } from '@/lib/store/ledger.store';
import { useUIStore } from '@/lib/store/ui.store';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { formatCurrencyFull } from '@/lib/utils/format';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import DropCardGenerator from '@/components/merchant/DropCardGenerator';
import styles from './DashboardPage.module.css';

const isMorning = new Date().getHours() < 11;

// ─── Activation checklists (3 items per type) ──────────────────────────────

type CheckItem = { id: string; label: string; done: boolean };

const CHECKLISTS: Record<string, CheckItem[]> = {
  collector: [
    { id: 'c1', label: 'Add your first item to the archive', done: true },
    { id: 'c2', label: 'Share your store link with a customer', done: false },
    { id: 'c3', label: 'Issue your first receipt via Terminal', done: false },
  ],
  vendor: [
    { id: 'c1', label: 'Add your first menu item', done: false },
    { id: 'c2', label: 'Enable checkout for online orders', done: false },
    { id: 'c3', label: 'Share your menu link with a customer', done: false },
  ],
  host: [
    { id: 'c1', label: 'Add your first service', done: false },
    { id: 'c2', label: 'Set your availability schedule', done: false },
    { id: 'c3', label: 'Enable deposits on bookings', done: false },
  ],
  digital_creator: [
    { id: 'c1', label: 'Upload your first product', done: false },
    { id: 'c2', label: 'Set download delivery links', done: false },
    { id: 'c3', label: 'Share your catalogue with followers', done: false },
  ],
  studio: [
    { id: 'c1', label: 'Add your first package', done: false },
    { id: 'c2', label: 'Set up your booking intake form', done: false },
    { id: 'c3', label: 'Enable deposits on packages', done: false },
  ],
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const merchant = useMerchantStore((s) => s.merchant);
  const { receipts } = useLedgerStore();
  const { addToast } = useUIStore();
  const st = useStoreType();
  const [shareOpen, setShareOpen] = useState(false);
  const [checklist, setChecklist] = useState<CheckItem[]>(() => CHECKLISTS[st.type] ?? CHECKLISTS.collector);
  const [visibleActivity, setVisibleActivity] = useState(5);

  // Reset checklist when store type changes (dev switcher)
  useEffect(() => {
    setChecklist(CHECKLISTS[st.type] ?? CHECKLISTS.collector);
    setVisibleActivity(5);
  }, [st.type]);

  // ── Ledger-derived vitals (Collector only) ──
  const pendingReceipts = receipts.filter((r) => r.payment_status === 'pending_payment');
  const pendingCount = pendingReceipts.length;
  const pendingTotal = pendingReceipts.reduce((s, r) => s + r.total, 0);
  const todayRevenue = receipts
    .filter((r) => r.payment_status === 'paid' && new Date(r.updated_at).toDateString() === new Date().toDateString())
    .reduce((s, r) => s + r.total, 0);

  // ── Derived ──
  const storeUrl = `trovea.store/${merchant.handle}`;
  const completedCount = checklist.filter((c) => c.done).length;
  const checklistPct = Math.round((completedCount / checklist.length) * 100);

  // ── Vitals per type (2 cards) ──
  const vitals = st.isCollector
    ? [
        {
          icon: <DollarSign size={16} />, iconClass: styles.maroon,
          label: "Today's Revenue",
          value: todayRevenue > 0 ? formatCurrencyFull(todayRevenue) : '₦0',
          delta: '+23% vs yesterday', deltaClass: styles.up,
        },
        {
          icon: <BookOpen size={16} />, iconClass: styles.gold,
          label: 'Pending Receipts',
          value: String(pendingCount),
          delta: pendingTotal > 0 ? formatCurrencyFull(pendingTotal) : 'All clear',
          deltaClass: pendingCount > 0 ? styles.warn : styles.up,
        },
      ]
    : st.isVendor
    ? [
        {
          icon: <Package size={16} />, iconClass: styles.maroon,
          label: "Today's Orders", value: '—',
          delta: 'No orders yet', deltaClass: styles.neutral,
        },
        {
          icon: <DollarSign size={16} />, iconClass: styles.gold,
          label: 'Pending Orders', value: '0',
          delta: 'All clear', deltaClass: styles.up,
        },
      ]
    : st.isHost
    ? [
        {
          icon: <Calendar size={16} />, iconClass: styles.maroon,
          label: 'Upcoming Bookings', value: '—',
          delta: 'No bookings yet', deltaClass: styles.neutral,
        },
        {
          icon: <DollarSign size={16} />, iconClass: styles.gold,
          label: 'Pending Deposits', value: '0',
          delta: 'All clear', deltaClass: styles.up,
        },
      ]
    : st.isDigital
    ? [
        {
          icon: <Package size={16} />, iconClass: styles.maroon,
          label: 'Total Downloads', value: '—',
          delta: 'No sales yet', deltaClass: styles.neutral,
        },
        {
          icon: <DollarSign size={16} />, iconClass: styles.gold,
          label: 'Revenue This Month', value: '₦0',
          delta: 'Publish a product', deltaClass: styles.neutral,
        },
      ]
    : [
        {
          icon: <BookMarked size={16} />, iconClass: styles.maroon,
          label: 'Active Projects', value: '—',
          delta: 'No projects yet', deltaClass: styles.neutral,
        },
        {
          icon: <DollarSign size={16} />, iconClass: styles.gold,
          label: 'Pending Invoices', value: '0',
          delta: 'All clear', deltaClass: styles.up,
        },
      ];

  // ── Action desk per type (4 tiles) ──
  const actionDesk = st.isCollector
    ? [
        { to: '/terminal',               icon: <Terminal size={16} />,    iconClass: styles.maroon,  label: 'New Sale',          sub: 'Issue a receipt' },
        { to: '/archive',                icon: <Archive size={16} />,     iconClass: styles.gold,    label: st.archiveLabel,     sub: 'Manage inventory' },
        { to: '/ledger',                 icon: <BookOpen size={16} />,    iconClass: styles.green,   label: 'Ledger',            sub: `${pendingCount} pending` },
        { to: `/store/${merchant.handle}`, icon: <ExternalLink size={16} />, iconClass: styles.neutral, label: 'Storefront',      sub: 'Public view' },
      ]
    : st.isVendor
    ? [
        { to: '/terminal',               icon: <Terminal size={16} />,    iconClass: styles.maroon,  label: 'New Order',         sub: 'Issue a receipt' },
        { to: '/archive',                icon: <Archive size={16} />,     iconClass: styles.gold,    label: st.archiveLabel,     sub: 'Manage menu' },
        { to: '/schedule',               icon: <Calendar size={16} />,    iconClass: styles.green,   label: 'Schedule',          sub: 'View timeline' },
        { to: `/store/${merchant.handle}`, icon: <ExternalLink size={16} />, iconClass: styles.neutral, label: 'Storefront',      sub: 'Public view' },
      ]
    : st.isHost
    ? [
        { to: '/terminal',               icon: <Terminal size={16} />,    iconClass: styles.maroon,  label: 'New Booking',       sub: 'Issue a receipt' },
        { to: '/archive',                icon: <Archive size={16} />,     iconClass: styles.gold,    label: st.archiveLabel,     sub: 'Manage services' },
        { to: '/bookings',               icon: <BookMarked size={16} />,  iconClass: styles.green,   label: 'Bookings',          sub: 'View calendar' },
        { to: `/store/${merchant.handle}`, icon: <ExternalLink size={16} />, iconClass: styles.neutral, label: 'Storefront',      sub: 'Public view' },
      ]
    : st.isDigital
    ? [
        { to: '/catalogue',              icon: <LayoutGrid size={16} />,  iconClass: styles.maroon,  label: 'Catalogue',         sub: 'Manage products' },
        { to: '/ledger',                 icon: <BookOpen size={16} />,    iconClass: styles.gold,    label: 'Downloads',         sub: 'Track sales' },
        { to: '/insights',               icon: <Package size={16} />,     iconClass: styles.green,   label: 'Insights',          sub: 'View analytics' },
        { to: `/store/${merchant.handle}`, icon: <ExternalLink size={16} />, iconClass: styles.neutral, label: 'Storefront',      sub: 'Public view' },
      ]
    : [
        { to: '/terminal',               icon: <Terminal size={16} />,    iconClass: styles.maroon,  label: 'New Project',       sub: 'Issue a brief' },
        { to: '/archive',                icon: <Archive size={16} />,     iconClass: styles.gold,    label: st.archiveLabel,     sub: 'Manage packages' },
        { to: '/bookings',               icon: <BookMarked size={16} />,  iconClass: styles.green,   label: 'Bookings',          sub: 'View requests' },
        { to: `/store/${merchant.handle}`, icon: <ExternalLink size={16} />, iconClass: styles.neutral, label: 'Storefront',      sub: 'Public view' },
      ];

  // ── Handlers ──
  const handleCopy = () => {
    void navigator.clipboard.writeText(`https://${storeUrl}`).catch(() => {});
    addToast('Store link copied.', 'success');
    setShareOpen(false);
  };

  const toggleCheck = (id: string) => {
    setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));
  };

  return (
    <div className={styles.root}>

      {/* ── Top Bar ── */}
      <div className={styles.topBar}>
        <div className={styles.greeting}>
          <span className={styles.greetingTime}>
            {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h1 className={styles.greetingName}>
            {isMorning ? 'Good morning, ' : 'Welcome back, '}
            {merchant.display_name.split(' ')[0]}.
          </h1>
        </div>
        <div className={styles.topBarActions}>
          <Link to="/notifications" className={styles.iconBtn} aria-label="Notifications">
            <Bell size={18} aria-hidden="true" />
            {pendingCount > 0 && st.isCollector && (
              <span className={styles.iconBtnBadge} aria-label={`${pendingCount} notifications`}>
                {pendingCount}
              </span>
            )}
          </Link>
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

      {/* ── Morning Brief (Collector + pending only) ── */}
      {isMorning && st.isCollector && pendingCount > 0 && (
        <m.div
          className={styles.morningBrief}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className={styles.morningBriefIcon} aria-hidden="true">
            <span style={{ fontSize: 18 }}>☀️</span>
          </div>
          <div className={styles.morningBriefBody}>
            <span className={styles.morningBriefLabel}>Morning Brief</span>
            <p className={styles.morningBriefText}>
              You have <strong>{pendingCount} pending payment{pendingCount > 1 ? 's' : ''}</strong> totalling{' '}
              <strong>{formatCurrencyFull(pendingTotal)}</strong> — review before your next sale.
            </p>
          </div>
          <Link to="/ledger" className={styles.morningBriefAction} aria-label="Review pending payments">
            Review →
          </Link>
        </m.div>
      )}

      {/* ── Vitals (2 cards, per type) ── */}
      <div className={styles.vitalsSection}>
        <span className={styles.sectionTitle}>Key Metrics</span>
        <div className={styles.vitalsGrid}>
          {vitals.map((v, i) => (
            <m.div
              key={v.label}
              className={styles.vitalCard}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.07 }}
            >
              <div className={`${styles.vitalIcon} ${v.iconClass}`} aria-hidden="true">
                {v.icon}
              </div>
              <span className={styles.vitalLabel}>{v.label}</span>
              <span className={styles.vitalValue}>{v.value}</span>
              <span className={`${styles.vitalDelta} ${v.deltaClass}`}>{v.delta}</span>
            </m.div>
          ))}
        </div>
      </div>

      {/* ── Main two-column grid ── */}
      <div className={styles.mainGrid}>

        {/* Left column: Action Desk + Activity Log */}
        <div>
          <span className={styles.sectionTitle}>Quick Actions</span>
          <div className={styles.actionDesk}>
            {actionDesk.map((tile, i) => (
              <m.div
                key={tile.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: 0.2 + i * 0.06 }}
              >
                <Link to={tile.to} className={styles.actionTile} aria-label={tile.label}>
                  <div className={`${styles.actionTileIcon} ${tile.iconClass}`} aria-hidden="true">
                    {tile.icon}
                  </div>
                  <div>
                    <div className={styles.actionTileLabel}>{tile.label}</div>
                    <div className={styles.actionTileSub}>{tile.sub}</div>
                  </div>
                </Link>
              </m.div>
            ))}
          </div>

          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Recent Activity</span>
          </div>
          <div className={styles.activityCard}>
            {st.isCollector ? (
              <>
                <div className={styles.activityList} role="list">
                  {receipts.slice(0, visibleActivity).map((r, i) => {
                    const isPaid = r.payment_status === 'paid';
                    const dateStr = new Date(r.updated_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
                    return (
                      <m.div
                        key={r.id}
                        className={styles.activityItem}
                        role="listitem"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: i * 0.04 }}
                      >
                        <div className={`${styles.activityDot} ${isPaid ? styles.sale : styles.pending}`} aria-hidden="true" />
                        <div className={styles.activityBody}>
                          <p className={styles.activityText}>
                            <strong>{r.buyer_name}</strong>
                            {isPaid
                              ? ` paid — ${r.line_items[0]?.name ?? 'item'}`
                              : ` receipt pending`}
                          </p>
                          <span className={styles.activityTime}>{dateStr}</span>
                        </div>
                        <span className={styles.activityAmount}>{formatCurrencyFull(r.total)}</span>
                      </m.div>
                    );
                  })}
                </div>
                {visibleActivity < receipts.length && (
                  <button
                    className={styles.loadMoreBtn}
                    onClick={() => setVisibleActivity((v) => Math.min(v + 5, receipts.length))}
                    aria-label="Load more activity"
                  >
                    Load more
                    <ChevronDown size={12} aria-hidden="true" />
                  </button>
                )}
              </>
            ) : (
              <div className={styles.activitySkeleton} aria-label="Activity log coming soon">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={styles.skeletonRow}>
                    <div className={styles.skeletonDot} />
                    <div className={styles.skeletonLines}>
                      <div className={styles.skeletonLine} style={{ width: `${60 + (i % 3) * 12}%` }} />
                      <div className={styles.skeletonLineSub} style={{ width: '40%' }} />
                    </div>
                  </div>
                ))}
                <p className={styles.skeletonHint}>Activity will appear here once you start transacting.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Activation Checklist */}
        <div>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Activation</span>
          </div>
          <div className={styles.checklistCard}>
            <div className={styles.checklistHeader}>
              <h2 className={styles.checklistTitle}>Store Setup</h2>
              <span className={styles.checklistProgress}>{completedCount}/{checklist.length}</span>
            </div>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-valuenow={checklistPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${checklistPct}% complete`}
            >
              <m.div
                className={styles.progressFill}
                initial={{ width: 0 }}
                animate={{ width: `${checklistPct}%` }}
                transition={{ duration: 0.6, ease: [0.34, 1.2, 0.64, 1] }}
              />
            </div>
            <div className={styles.checklistItems} role="list">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={`${styles.checklistItem} ${item.done ? styles.done : ''}`}
                  onClick={() => toggleCheck(item.id)}
                  role="checkbox"
                  aria-checked={item.done}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleCheck(item.id); }}
                >
                  <div className={`${styles.checkMark} ${item.done ? styles.checked : styles.unchecked}`} aria-hidden="true">
                    {item.done && <Check size={12} />}
                  </div>
                  <span className={styles.checklistItemText}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Share Drawer ── */}
      <BaseDrawer open={shareOpen} onClose={() => setShareOpen(false)} title="Share Your Store">
        <div className={styles.shareDrawerContent}>
          <div className={styles.shareUrlBox}>
            <span className={styles.shareUrl}>{storeUrl}</span>
            <button className={styles.copyBtn} onClick={handleCopy} aria-label="Copy store link">
              <Copy size={12} style={{ marginRight: 4 }} aria-hidden="true" />
              Copy
            </button>
          </div>
          <div className={styles.shareOptions}>
            {[
              {
                icon: <MessageCircle size={16} style={{ color: '#25D366' }} />,
                bg: 'rgba(37,211,102,0.12)',
                label: 'WhatsApp',
                action: () => { window.open(`https://wa.me/?text=Shop%20my%20store%20at%20https%3A%2F%2F${storeUrl}`, '_blank'); },
              },
              {
                icon: <Instagram size={16} style={{ color: '#E1306C' }} />,
                bg: 'rgba(225,48,108,0.1)',
                label: 'Instagram',
                action: handleCopy,
              },
              {
                icon: <Copy size={16} style={{ color: 'var(--color-fg-muted)' }} />,
                bg: 'rgba(0,0,0,0.06)',
                label: 'Copy Link',
                action: handleCopy,
              },
              {
                icon: <ExternalLink size={16} style={{ color: 'var(--color-fg-muted)' }} />,
                bg: 'rgba(0,0,0,0.06)',
                label: 'Open Store',
                action: () => navigate(`/store/${merchant.handle}`),
              },
            ].map((opt) => (
              <button
                key={opt.label}
                className={styles.shareOption}
                onClick={opt.action}
                aria-label={opt.label}
              >
                <div className={styles.shareOptionIcon} style={{ background: opt.bg }} aria-hidden="true">
                  {opt.icon}
                </div>
                {opt.label}
              </button>
            ))}
          </div>
          <div className={styles.shareDivider} role="separator" />
          <DropCardGenerator merchant={merchant} />
        </div>
      </BaseDrawer>
    </div>
  );
}
