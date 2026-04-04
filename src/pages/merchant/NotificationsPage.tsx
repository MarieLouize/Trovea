import { useState, useMemo } from 'react';
import { m, AnimatePresence } from '@/lib/motion';
import {
  Receipt, Star, CheckCircle, Truck, Bell, Check
} from 'lucide-react';
import { useLedgerStore } from '@/lib/store/ledger.store';
import { FIXTURE_CLAIMS } from '@/lib/fixtures';
import { formatCurrencyFull, formatRelativeDate, formatDate } from '@/lib/utils/format';
import styles from './NotificationsPage.module.css';

type NotifType = 'receipt' | 'claim' | 'payment' | 'shipping' | 'system';
type NotifFilter = 'all' | 'unread' | 'receipt' | 'claim';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  subtitle: string;
  amount?: number;
  timestamp: string; // ISO string format
  unread: boolean;
  linkedId?: string;
}

// Derive notifications from fixture data
function deriveNotifications(
  receipts: ReturnType<typeof useLedgerStore.getState>['receipts']
): Notification[] {
  const notifs: Notification[] = [];

  // From receipts — pending ones are "new"
  for (const r of receipts) {
    if (r.payment_status === 'pending_payment') {
      notifs.push({
        id: `notif-receipt-${r.id}`,
        type: 'receipt',
        title: 'New receipt created',
        subtitle: `${r.buyer_name} — ${r.line_items[0]?.name ?? 'Unknown item'}`,
        amount: r.total,
        timestamp: r.created_at,
        unread: new Date(r.created_at).getTime() > Date.now() - 48 * 60 * 60 * 1000,
        linkedId: r.id,
      });
    }
    // Payment confirmations
    if (r.payment_status === 'paid') {
      notifs.push({
        id: `notif-paid-${r.id}`,
        type: 'payment',
        title: 'Payment confirmed',
        subtitle: `${r.buyer_name} paid for ${r.line_items[0]?.name ?? 'order'}`,
        amount: r.total,
        timestamp: r.log.find((l) => l.event.startsWith('Payment'))?.timestamp ?? r.updated_at,
        unread: false,
        linkedId: r.id,
      });
    }
    // Shipment updates
    if (r.shipment_status === 'shipped') {
      notifs.push({
        id: `notif-shipped-${r.id}`,
        type: 'shipping',
        title: 'Order marked as shipped',
        subtitle: `${r.buyer_name}'s order is in transit`,
        timestamp: r.log.find((l) => l.event.includes('Shipped'))?.timestamp ?? r.updated_at,
        unread: false,
        linkedId: r.id,
      });
    }
  }

  // From claims
  for (const c of FIXTURE_CLAIMS) {
    if (c.status === 'pending') {
      notifs.push({
        id: `notif-claim-${c.id}`,
        type: 'claim',
        title: 'New claim request',
        subtitle: `${c.buyer_name} claimed a product`,
        timestamp: c.created_at,
        unread: new Date(c.created_at).getTime() > Date.now() - 72 * 60 * 60 * 1000,
        linkedId: c.product_id,
      });
    }
  }

  // System notification
  notifs.push({
    id: 'notif-system-welcome',
    type: 'system',
    title: 'Welcome to Trove\'a',
    subtitle: 'Your archive is live. Start adding items to your store.',
    timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    unread: false,
  });

  return notifs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function groupByDate(notifs: Notification[]): { label: string; items: Notification[] }[] {
  const groups: Record<string, Notification[]> = {};
  const now = Date.now();

  for (const n of notifs) {
    const d = new Date(n.timestamp);
    const dayDiff = Math.floor((now - d.getTime()) / 86400000);

    let label: string;
    if (dayDiff === 0) label = 'Today';
    else if (dayDiff === 1) label = 'Yesterday';
    else if (dayDiff < 7) label = `${dayDiff} days ago`;
    else label = formatDate(d, 'short');

    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }

  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

const ICON_MAP: Record<NotifType, { icon: React.ReactNode; cls: string }> = {
  receipt: { icon: <Receipt size={18} aria-hidden="true" />, cls: styles.notifIconReceipt },
  claim: { icon: <Star size={18} aria-hidden="true" />, cls: styles.notifIconClaim },
  payment: { icon: <CheckCircle size={18} aria-hidden="true" />, cls: styles.notifIconPayment },
  shipping: { icon: <Truck size={18} aria-hidden="true" />, cls: styles.notifIconShipping },
  system: { icon: <Bell size={18} aria-hidden="true" />, cls: styles.notifIconSystem },
};

export default function NotificationsPage() {
  const { receipts } = useLedgerStore();
  const [filter, setFilter] = useState<NotifFilter>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const allNotifs = useMemo(() => deriveNotifications(receipts), [receipts]);

  const filtered = allNotifs.filter((n) => {
    const isUnread = n.unread && !readIds.has(n.id);
    if (filter === 'unread') return isUnread;
    if (filter === 'receipt') return n.type === 'receipt';
    if (filter === 'claim') return n.type === 'claim';
    return true;
  });

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const unreadCount = allNotifs.filter((n) => n.unread && !readIds.has(n.id)).length;

  const markAllRead = () => {
    setReadIds(new Set(allNotifs.filter((n) => n.unread).map((n) => n.id)));
  };

  const markRead = (id: string) => {
    setReadIds((prev) => new Set([...prev, id]));
  };

  const filters: { key: NotifFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'receipt', label: 'Receipts' },
    { key: 'claim', label: 'Claims' },
  ];

  return (
    <div className={styles.root}>
      {/* Header */}
      <m.div
        className={styles.pageHeader}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className={styles.headerLeft}>
          <span className={styles.eyebrow}>Notifications</span>
          <h1 className={styles.headline}>
            Alerts
            {unreadCount > 0 && (
              <span style={{
                marginLeft: 'var(--space-3)',
                fontSize: '14px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-accent)',
                verticalAlign: 'middle',
              }}>
                {unreadCount}
              </span>
            )}
          </h1>
        </div>
        {unreadCount > 0 && (
          <button className={styles.markAllBtn} onClick={markAllRead} aria-label="Mark all as read">
            <Check size={11} aria-hidden="true" />
            Mark all read
          </button>
        )}
      </m.div>

      {/* Filter tabs */}
      <m.div
        className={styles.filterRow}
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
          </button>
        ))}
      </m.div>

      {/* Notification list */}
      <AnimatePresence mode="wait">
        {grouped.length === 0 ? (
          <m.div
            key="empty"
            className={styles.empty}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className={styles.emptyIcon} aria-hidden="true">
              <Bell size={26} />
            </div>
            <p className={styles.emptyTitle}>All clear</p>
            <p className={styles.emptyBody}>
              {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
            </p>
          </m.div>
        ) : (
          <m.div
            key="list"
            className={styles.notifList}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {grouped.map((group) => (
              <div key={group.label} className={styles.dateGroup}>
                <span className={styles.dateLabel}>{group.label}</span>
                {group.items.map((notif, i) => {
                  const isUnread = notif.unread && !readIds.has(notif.id);
                  const { icon, cls } = ICON_MAP[notif.type];

                  return (
                    <m.div
                      key={notif.id}
                      className={styles.notifCard}
                      data-unread={isUnread}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: i * 0.05 }}
                      onClick={() => markRead(notif.id)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${notif.title}: ${notif.subtitle}`}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') markRead(notif.id); }}
                    >
                      <div className={styles.notifInner}>
                        <div className={`${styles.notifIconWrap} ${cls}`}>
                          {icon}
                        </div>
                        <div className={styles.notifBody}>
                          <div className={styles.notifTitle}>{notif.title}</div>
                          <div className={styles.notifSubtitle}>{notif.subtitle}</div>
                          {/* FIX APPLIED BELOW: wrapped in new Date() */}
                          <div className={styles.notifTime}>{formatRelativeDate(new Date(notif.timestamp))}</div>
                        </div>
                        {notif.amount !== undefined && (
                          <span className={styles.notifAmount}>{formatCurrencyFull(notif.amount)}</span>
                        )}
                        {isUnread && <div className={styles.notifUnreadDot} aria-label="Unread" />}
                      </div>
                    </m.div>
                  );
                })}
              </div>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
