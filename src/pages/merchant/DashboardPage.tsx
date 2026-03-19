import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from '@/lib/motion';
import {
  Bell, Share2, DollarSign, BookOpen, Package,
  Archive, Terminal, Check, ChevronDown,
  Copy, MessageCircle, Instagram, ExternalLink
} from 'lucide-react';
import { FIXTURE_MERCHANT } from '@/lib/fixtures';
import { useLedgerStore } from '@/lib/store/ledger.store';
import { useUIStore } from '@/lib/store/ui.store';
import { useGuideStore } from '@/lib/store/guide.store';
import { formatCurrencyFull } from '@/lib/utils/format';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import GuideMarker from '@/components/primitives/GuideMarker/GuideMarker';
import styles from './DashboardPage.module.css';

const isMorning = new Date().getHours() < 11;

const ACTIVITY = [
  { id: 'a1', type: 'sale' as const, text: '<span>Adaeze Okonkwo</span> paid for Vintage Linen Midi Dress', time: '3h ago', amount: '₦18,500' },
  { id: 'a2', type: 'pending' as const, text: '<span>Chisom Eze</span> receipt pending — Ankara Set Drop 03', time: '5h ago', amount: '₦80,000' },
  { id: 'a3', type: 'sale' as const, text: '<span>Amara Obi</span> paid — Linen Co-ord + Satin Blouse', time: '8h ago', amount: '₦37,000' },
  { id: 'a4', type: 'sale' as const, text: '<span>Ngozi Abara</span> bought 2× Vintage Bucket Bags', time: '1d ago', amount: '₦30,000' },
  { id: 'a5', type: 'pending' as const, text: '<span>Bimpe Afolabi</span> receipt pending', time: '1d ago', amount: '₦44,500' },
  { id: 'a6', type: 'system' as const, text: 'Ankara Set Drop 03 is trending — 4 claims today', time: '2d ago', amount: '' },
  { id: 'a7', type: 'sale' as const, text: '<span>Damilola Akintunde</span> paid — Sandals + Crossbody', time: '2d ago', amount: '₦30,500' },
  { id: 'a8', type: 'sale' as const, text: '<span>Sade Olaniyi</span> paid — Adire Dress + Raffia Tote', time: '3d ago', amount: '₦24,750' },
  { id: 'a9', type: 'system' as const, text: 'Store visited 47 times this week', time: '4d ago', amount: '' },
  { id: 'a10', type: 'pending' as const, text: '<span>Tunde Ogunwale</span> receipt pending', time: '5d ago', amount: '₦78,000' },
];

const CHECKLIST_ITEMS = [
  { id: 'c1', label: 'Add your first item to the archive', done: true },
  { id: 'c2', label: 'Customise your storefront in the Architect', done: true },
  { id: 'c3', label: 'Share your store link with a customer', done: false },
  { id: 'c4', label: 'Issue your first receipt via Terminal', done: false },
  { id: 'c5', label: 'Set up your WhatsApp template', done: false },
];

const PAGE_GUIDES = ['dashboard-vitals', 'dashboard-activity', 'dashboard-checklist'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { receipts } = useLedgerStore();
  const { addToast } = useUIStore();
  const { allComplete } = useGuideStore();
  const [shareOpen, setShareOpen] = useState(false);
  const [checklist, setChecklist] = useState(CHECKLIST_ITEMS);
  const [visibleActivity, setVisibleActivity] = useState(5);
  const [showCompletion, setShowCompletion] = useState(false);

  const pendingCount = receipts.filter(r => r.payment_status === 'pending_payment').length;
  const pendingTotal = receipts
    .filter(r => r.payment_status === 'pending_payment')
    .reduce((s, r) => s + r.total, 0);
  const todayRevenue = receipts
    .filter(r => r.payment_status === 'paid' && new Date(r.updated_at).toDateString() === new Date().toDateString())
    .reduce((s, r) => s + r.total, 0);

  const completedChecklist = checklist.filter(c => c.done).length;
  const checklistPct = Math.round((completedChecklist / checklist.length) * 100);

  const storeUrl = `trovea.store/${FIXTURE_MERCHANT.handle}`;

  // Show completion message when all guides are done
  useEffect(() => {
    if (allComplete(PAGE_GUIDES)) {
      setShowCompletion(true);
      const timer = setTimeout(() => setShowCompletion(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [allComplete(PAGE_GUIDES)]);

  const handleCopy = () => {
    void navigator.clipboard.writeText(`https://${storeUrl}`).catch(() => {});
    addToast('Store link copied.', 'success');
    setShareOpen(false);
  };

  const toggleCheck = (id: string) => {
    setChecklist(prev =>
      prev.map(c => c.id === id ? { ...c, done: !c.done } : c)
    );
  };

  return (
    <div className={styles.root}>
      {/* Page Completion Toast */}
      <AnimatePresence>
        {showCompletion && (
          <m.div
            className={styles.pageCompletion}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <span aria-hidden="true">✦</span> All page features explored
          </m.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.greeting}>
          <span className={styles.greetingTime}>
            {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h1 className={styles.greetingName}>
            {isMorning ? 'Good morning, ' : 'Welcome back, '}
            {FIXTURE_MERCHANT.display_name.split(' ')[0]}.
          </h1>
        </div>
        <div className={styles.topBarActions}>
          <Link to="/notifications" className={styles.iconBtn} aria-label="Notifications">
            <Bell size={18} aria-hidden="true" />
            {pendingCount > 0 && (
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

      {/* Morning Brief */}
      {isMorning && pendingCount > 0 && (
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

      {/* Vitals Grid with Guide Marker */}
      <div className={styles.vitalsSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Key Metrics</span>
          <GuideMarker
            id="dashboard-vitals"
            prompt="Track your store's performance at a glance"
            reward="Understand your daily revenue and pending payments"
            xp={15}
          />
        </div>
        <div className={styles.vitalsGrid}>
          {[
            {
              icon: <DollarSign size={16} />, iconClass: styles.maroon,
              label: 'Today\'s Revenue', value: todayRevenue > 0 ? formatCurrencyFull(todayRevenue) : '₦0',
              delta: '+23% vs yesterday', deltaClass: styles.up,
            },
            {
              icon: <BookOpen size={16} />, iconClass: styles.gold,
              label: 'Receipts', value: String(receipts.length),
              delta: '+3 this week', deltaClass: styles.up,
            },
            {
              icon: <Package size={16} />, iconClass: styles.green,
              label: 'Pending', value: String(pendingCount),
              delta: pendingTotal > 0 ? `${formatCurrencyFull(pendingTotal)}` : 'All clear',
              deltaClass: pendingCount > 0 ? styles.warn : styles.up,
            },
            {
              icon: <Archive size={16} />, iconClass: styles.neutral,
              label: 'Live Items', value: '17',
              delta: '5 sold out', deltaClass: styles.down,
            },
          ].map((v, i) => (
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

      {/* Main grid */}
      <div className={styles.mainGrid}>
        <div>
          {/* Action Desk */}
          <span className={styles.sectionTitle}>Quick Actions</span>
          <div className={styles.actionDesk}>
            {[
              { to: '/terminal', icon: <Terminal size={16} />, iconClass: styles.maroon, label: 'New Sale', sub: 'Issue a receipt' },
              { to: '/archive', icon: <Archive size={16} />, iconClass: styles.gold, label: 'Archive', sub: 'Manage inventory' },
              { to: '/ledger', icon: <BookOpen size={16} />, iconClass: styles.green, label: 'Ledger', sub: `${pendingCount} pending` },
              { to: `/store/${FIXTURE_MERCHANT.handle}`, icon: <ExternalLink size={16} />, iconClass: styles.neutral, label: 'Storefront', sub: 'Public view' },
            ].map((tile, i) => (
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

          {/* Activity Log with Guide Marker */}
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Recent Activity</span>
            <GuideMarker
              id="dashboard-activity"
              prompt="Stay updated on sales and pending payments"
              reward="Monitor your store's pulse in real-time"
              xp={15}
            />
          </div>
          <div className={styles.activityCard}>
            <div className={styles.activityList} role="list">
              {ACTIVITY.slice(0, visibleActivity).map((item, i) => (
                <m.div
                  key={item.id}
                  className={styles.activityItem}
                  role="listitem"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                >
                  <div className={`${styles.activityDot} ${styles[item.type]}`} aria-hidden="true" />
                  <div className={styles.activityBody}>
                    <p
                      className={styles.activityText}
                      dangerouslySetInnerHTML={{ __html: item.text }}
                    />
                    <span className={styles.activityTime}>{item.time}</span>
                  </div>
                  {item.amount && (
                    <span className={styles.activityAmount}>{item.amount}</span>
                  )}
                </m.div>
              ))}
            </div>
            {visibleActivity < ACTIVITY.length && (
              <button
                className={styles.loadMoreBtn}
                onClick={() => setVisibleActivity(v => Math.min(v + 5, ACTIVITY.length))}
                aria-label="Load more activity"
              >
                Load more
                <ChevronDown size={12} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Checklist with Guide Marker */}
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Setup Progress</span>
            <GuideMarker
              id="dashboard-checklist"
              prompt="Complete these steps to set up your store"
              reward="Track your onboarding progress and earn XP"
              xp={20}
            />
          </div>
          <div className={styles.checklistCard}>
            <div className={styles.checklistHeader}>
              <h2 className={styles.checklistTitle}>Store Setup</h2>
              <span className={styles.checklistProgress}>{completedChecklist}/{checklist.length}</span>
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

      {/* Share Drawer */}
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
                action: () => navigate(`/store/${FIXTURE_MERCHANT.handle}`),
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
        </div>
      </BaseDrawer>
    </div>
  );
}