import { Link } from 'react-router-dom';
import { m } from '@/lib/motion';
import { Store, Receipt, Flag, BookMarked } from 'lucide-react';
import { useAdminStore } from '@/lib/store/admin.store';
import { DEV_MERCHANTS } from '@/lib/store/merchant.store';
import { FIXTURE_RECEIPTS, FIXTURE_REPORTS, FIXTURE_CLAIMS, FIXTURE_ADMIN_LOG } from '@/lib/fixtures';
import { formatRelativeDate } from '@/lib/utils/format';
import styles from './AdminOverviewPage.module.css';

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

export default function AdminOverviewPage() {
  const { reportStatuses, adminLog } = useAdminStore();

  const pendingReports = FIXTURE_REPORTS.filter(
    (r) => (reportStatuses[r.id] ?? r.status) === 'pending',
  );

  const activeClaims = FIXTURE_CLAIMS.filter((c) => c.status === 'pending').length;

  const sortedPendingReports = [...pendingReports].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3),
  );

  const recentLog = [...adminLog]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const statCards = [
    {
      icon: <Store size={18} />,
      label: 'Total Stores',
      value: String(DEV_MERCHANTS.length),
      sub: 'All store types',
      colorClass: styles.iconBlue,
    },
    {
      icon: <Receipt size={18} />,
      label: 'Total Receipts',
      value: String(FIXTURE_RECEIPTS.length),
      sub: 'Across all stores',
      colorClass: styles.iconGold,
    },
    {
      icon: <Flag size={18} />,
      label: 'Pending Reports',
      value: String(pendingReports.length),
      sub: pendingReports.length > 0 ? 'Needs review' : 'All clear',
      colorClass: pendingReports.length > 0 ? styles.iconRed : styles.iconGreen,
    },
    {
      icon: <BookMarked size={18} />,
      label: 'Active Claims',
      value: String(activeClaims),
      sub: 'Awaiting confirmation',
      colorClass: styles.iconGold,
    },
  ];

  const merchantName = (merchantId: string | null) => {
    if (!merchantId) return '—';
    return DEV_MERCHANTS.find((m) => m.id === merchantId)?.store_name ?? merchantId;
  };

  const initialLog = FIXTURE_ADMIN_LOG.slice(0, 2);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Overview</h1>
          <p className={styles.pageSubtitle}>Platform health at a glance</p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className={styles.statGrid}>
        {statCards.map((card, i) => (
          <m.div
            key={card.label}
            className={styles.statCard}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.07 }}
          >
            <div className={`${styles.statIcon} ${card.colorClass}`}>{card.icon}</div>
            <span className={styles.statValue}>{card.value}</span>
            <span className={styles.statLabel}>{card.label}</span>
            <span className={styles.statSub}>{card.sub}</span>
          </m.div>
        ))}
      </div>

      {/* ── Two-column ── */}
      <div className={styles.twoCol}>

        {/* Recent admin activity */}
        <div>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
          <div className={styles.activityCard}>
            {recentLog.length === 0 && initialLog.length === 0 ? (
              <p className={styles.emptyNote}>No admin actions yet.</p>
            ) : (
              <ul className={styles.logList} role="list">
                {recentLog.map((entry) => (
                  <li key={entry.id} className={styles.logRow} role="listitem">
                    <div className={styles.logDot} aria-hidden="true" />
                    <div className={styles.logBody}>
                      <p className={styles.logAction}>{entry.action}</p>
                      <p className={styles.logMeta}>
                        {merchantName(entry.target_merchant_id)}
                        <span className={styles.logTime}>{formatRelativeDate(entry.created_at)}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/admin/suspensions" className={styles.viewAllLink}>
              View full log →
            </Link>
          </div>
        </div>

        {/* Pending reports */}
        <div>
          <div className={styles.sectionTitleRow}>
            <h2 className={styles.sectionTitle}>Pending Reports</h2>
            <Link to="/admin/reports" className={styles.viewAllLink}>
              View all →
            </Link>
          </div>
          <div className={styles.activityCard}>
            {sortedPendingReports.length === 0 ? (
              <p className={styles.emptyNote}>No pending reports.</p>
            ) : (
              <ul className={styles.logList} role="list">
                {sortedPendingReports.slice(0, 4).map((report) => (
                  <li key={report.id} className={styles.reportRow} role="listitem">
                    <span className={`${styles.priorityPill} ${styles[`priority_${report.priority}`]}`}>
                      {report.priority.toUpperCase()}
                    </span>
                    <div className={styles.logBody}>
                      <p className={styles.logAction}>{report.reported_store_name}</p>
                      <p className={styles.logMeta}>
                        {report.category.replace(/_/g, ' ')}
                        <span className={styles.logTime}>{formatRelativeDate(report.created_at)}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
