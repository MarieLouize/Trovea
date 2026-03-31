import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Receipt } from '@/lib/types';
import { DEV_MERCHANTS } from '@/lib/store/merchant.store';
import { FIXTURE_RECEIPTS } from '@/lib/fixtures';
import { formatCurrencyFull, formatDate, formatSealId } from '@/lib/utils/format';
import styles from './AdminReceiptsPage.module.css';

// ─── Constants ───────────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'all';

const PERIOD_TABS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week',  label: 'This Week' },
  { id: 'all',   label: 'All' },
];

const TYPE_LABELS: Record<string, string> = {
  sale: 'Sale', booking: 'Booking', order: 'Order', download: 'Download', project: 'Project',
};

const STATUS_LABELS: Record<string, string> = {
  paid: 'Paid', pending_payment: 'Pending', cancelled: 'Cancelled',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isToday(isoString: string): boolean {
  return new Date(isoString).toDateString() === new Date().toDateString();
}

function isThisWeek(isoString: string): boolean {
  const d = new Date(isoString);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  return d >= weekAgo && d <= now;
}

function filterByPeriod(receipts: Receipt[], period: Period): Receipt[] {
  if (period === 'today') return receipts.filter((r) => isToday(r.created_at));
  if (period === 'week')  return receipts.filter((r) => isThisWeek(r.created_at));
  return receipts;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminReceiptsPage() {
  const [period, setPeriod] = useState<Period>('all');
  const [search, setSearch] = useState('');

  const storeName = (merchantId: string) =>
    DEV_MERCHANTS.find((m) => m.id === merchantId)?.store_name ?? merchantId;

  const periodFiltered = useMemo(() => filterByPeriod(FIXTURE_RECEIPTS, period), [period]);

  const displayReceipts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return periodFiltered;
    return periodFiltered.filter(
      (r) =>
        r.buyer_name.toLowerCase().includes(q) ||
        r.seal_id.toLowerCase().includes(q),
    );
  }, [periodFiltered, search]);

  const paid      = periodFiltered.filter((r) => r.payment_status === 'paid').length;
  const pending   = periodFiltered.filter((r) => r.payment_status === 'pending_payment').length;
  const cancelled = periodFiltered.filter((r) => r.payment_status === 'cancelled').length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Receipts</h1>
          <p className={styles.pageSubtitle}>Read-only — receipts are immutable after issuance</p>
        </div>
      </div>

      {/* Period selector */}
      <div className={styles.periodRow} role="tablist" aria-label="Filter by period">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={period === tab.id}
            className={`${styles.periodTab} ${period === tab.id ? styles.periodTabActive : ''}`}
            onClick={() => setPeriod(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary strip */}
      <div className={styles.summaryStrip}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryNum}>{periodFiltered.length}</span>
          <span className={styles.summaryLabel}>Total</span>
        </div>
        <div className={styles.summaryDivider} aria-hidden="true" />
        <div className={styles.summaryItem}>
          <span className={`${styles.summaryNum} ${styles.paidNum}`}>{paid}</span>
          <span className={styles.summaryLabel}>Paid</span>
        </div>
        <div className={styles.summaryDivider} aria-hidden="true" />
        <div className={styles.summaryItem}>
          <span className={`${styles.summaryNum} ${styles.pendingNum}`}>{pending}</span>
          <span className={styles.summaryLabel}>Pending</span>
        </div>
        <div className={styles.summaryDivider} aria-hidden="true" />
        <div className={styles.summaryItem}>
          <span className={`${styles.summaryNum} ${styles.cancelledNum}`}>{cancelled}</span>
          <span className={styles.summaryLabel}>Cancelled</span>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by buyer name or Seal ID…"
          aria-label="Search receipts"
        />
      </div>

      {/* Receipt table */}
      <div className={styles.table} role="table" aria-label="Receipts">
        <div className={styles.tableHead} role="row">
          <span>Seal ID</span>
          <span>Buyer</span>
          <span>Store</span>
          <span>Amount</span>
          <span>Type</span>
          <span>Status</span>
          <span>Date</span>
        </div>

        <div className={styles.tableBody}>
          {displayReceipts.length === 0 ? (
            <p className={styles.emptyNote}>
              {search ? `No receipts match "${search}".` : 'No receipts in this period.'}
            </p>
          ) : (
            displayReceipts
              .slice()
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((receipt) => (
                <div key={receipt.id} className={styles.tableRow} role="row">
                  <Link
                    to={`/receipt/${receipt.id}`}
                    className={styles.sealLink}
                    aria-label={`View receipt ${receipt.seal_id}`}
                  >
                    {formatSealId(receipt.seal_id)}
                  </Link>
                  <span className={styles.cellBuyer}>{receipt.buyer_name}</span>
                  <span className={styles.cellStore}>{storeName(receipt.merchant_id)}</span>
                  <span className={styles.cellAmount}>{formatCurrencyFull(receipt.total)}</span>
                  <span className={`${styles.typeBadge} ${styles[`type_${receipt.receipt_type}`]}`}>
                    {TYPE_LABELS[receipt.receipt_type] ?? receipt.receipt_type}
                  </span>
                  <span className={`${styles.statusBadge} ${styles[`status_${receipt.payment_status}`]}`}>
                    {STATUS_LABELS[receipt.payment_status] ?? receipt.payment_status}
                  </span>
                  <span className={styles.cellDate}>
                    {formatDate(receipt.created_at, 'short')}
                  </span>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
