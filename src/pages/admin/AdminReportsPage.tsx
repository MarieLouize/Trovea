import { useState } from 'react';
import { m, AnimatePresence } from '@/lib/motion';
import type { ReportStatus } from '@/lib/types';
import { useAdminStore } from '@/lib/store/admin.store';
import { useUIStore } from '@/lib/store/ui.store';
import { DEV_MERCHANTS } from '@/lib/store/merchant.store';
import { FIXTURE_REPORTS } from '@/lib/fixtures';
import { formatRelativeDate } from '@/lib/utils/format';
import styles from './AdminReportsPage.module.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

const CATEGORY_LABELS: Record<string, string> = {
  counterfeit: 'Counterfeit goods',
  misleading: 'Misleading description',
  suspicious_payment: 'Suspicious payment request',
  unresponsive: 'Seller unresponsive',
  inappropriate: 'Inappropriate content',
  other: 'Other',
};

type FilterTab = 'all' | ReportStatus;
const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'dismissed', label: 'Dismissed' },
];

// ─── Confirmation modal ───────────────────────────────────────────────────────

interface ConfirmSuspendModalProps {
  storeName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmSuspendModal({ storeName, onConfirm, onCancel }: ConfirmSuspendModalProps) {
  return (
    <m.div
      className={styles.modalBackdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={`Suspend ${storeName}`}
    >
      <m.div
        className={styles.modal}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.18, ease: [0.32, 0, 0.16, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={styles.modalTitle}>Suspend {storeName}?</h2>
        <p className={styles.modalBody}>
          This will pause their store. Existing confirmed bookings and holds are unaffected.
          This action is logged in the admin audit trail.
        </p>
        <div className={styles.modalActions}>
          <m.button
            className={styles.modalCancelBtn}
            onClick={onCancel}
            whileTap={{ scale: 0.97 }}
          >
            Cancel
          </m.button>
          <m.button
            className={styles.modalConfirmBtn}
            onClick={onConfirm}
            whileTap={{ scale: 0.97 }}
          >
            Suspend Store
          </m.button>
        </div>
      </m.div>
    </m.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const { reportStatuses, setReportStatus, suspendMerchant, suspendedMerchantIds } = useAdminStore();
  const { addToast } = useUIStore();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [pendingSuspend, setPendingSuspend] = useState<{ merchantId: string; storeName: string } | null>(null);

  // Compute effective status for each report (fixture status + admin overrides)
  const enriched = FIXTURE_REPORTS.map((r) => ({
    ...r,
    effectiveStatus: (reportStatuses[r.id] ?? r.status) as ReportStatus,
  }));

  // Filter by tab
  const filtered = enriched.filter((r) =>
    activeTab === 'all' ? true : r.effectiveStatus === activeTab,
  );

  // Sort pending by priority, rest by date desc
  const sorted = [...filtered].sort((a, b) => {
    if (a.effectiveStatus === 'pending' && b.effectiveStatus === 'pending') {
      return (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleDismiss = (reportId: string, storeName: string) => {
    setReportStatus(reportId, 'dismissed', storeName, `Report on ${storeName} dismissed.`);
    addToast('Report dismissed.', 'success');
  };

  const handleReview = (reportId: string, storeName: string) => {
    setReportStatus(reportId, 'reviewed', storeName, `Report on ${storeName} marked reviewed.`);
    addToast('Report marked reviewed.', 'success');
  };

  const handleSuspendConfirm = () => {
    if (!pendingSuspend) return;
    const report = FIXTURE_REPORTS.find(
      (r) => r.reported_merchant_id === pendingSuspend.merchantId,
    );
    if (report) {
      setReportStatus(report.id, 'actioned', pendingSuspend.storeName, 'Report actioned: store suspended.');
    }
    suspendMerchant(pendingSuspend.merchantId, pendingSuspend.storeName);
    addToast(`${pendingSuspend.storeName} has been suspended.`, 'success');
    setPendingSuspend(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Reports</h1>
          <p className={styles.pageSubtitle}>{FIXTURE_REPORTS.length} total reports</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className={styles.tabRow} role="tablist" aria-label="Filter reports">
        {FILTER_TABS.map((tab) => {
          const count = tab.id === 'all'
            ? enriched.length
            : enriched.filter((r) => r.effectiveStatus === tab.id).length;
          return (
            <m.button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
              whileTap={{ scale: 0.97 }}
            >
              {tab.label}
              <span className={styles.tabCount}>{count}</span>
            </m.button>
          );
        })}
      </div>

      {/* Report cards */}
      <div className={styles.reportList}>
        <AnimatePresence mode="popLayout">
          {sorted.length === 0 ? (
            <m.p
              key="empty"
              className={styles.emptyNote}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              No reports in this category.
            </m.p>
          ) : (
            sorted.map((report) => {
              const merchant = DEV_MERCHANTS.find(
                (m) => m.id === report.reported_merchant_id,
              );
              const isSuspended = suspendedMerchantIds.includes(report.reported_merchant_id);
              const isPending = report.effectiveStatus === 'pending';

              return (
                <m.div
                  key={report.id}
                  className={`${styles.reportCard} ${!isPending ? styles.reportCardDimmed : ''}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  layout
                >
                  <div className={styles.reportCardHeader}>
                    <span className={`${styles.priorityBadge} ${styles[`priority_${report.priority}`]}`}>
                      {report.priority.toUpperCase()}
                    </span>
                    <span className={styles.reportMerchant}>
                      {report.reported_merchant_id} · {report.reported_store_name}
                    </span>
                    <span className={`${styles.statusBadge} ${styles[`status_${report.effectiveStatus}`]}`}>
                      {report.effectiveStatus}
                    </span>
                  </div>

                  <p className={styles.categoryLabel}>
                    {CATEGORY_LABELS[report.category] ?? report.category}
                  </p>

                  {report.detail && (
                    <p className={styles.reportDetail}>"{report.detail}"</p>
                  )}

                  <p className={styles.reportTime}>
                    Received {formatRelativeDate(report.created_at)}
                    {report.reviewed_at && ` · Reviewed ${formatRelativeDate(report.reviewed_at)}`}
                  </p>

                  {isPending && (
                    <div className={styles.reportActions}>
                      <m.button
                        className={styles.dismissBtn}
                        onClick={() => handleDismiss(report.id, report.reported_store_name)}
                        whileTap={{ scale: 0.97 }}
                      >
                        Dismiss
                      </m.button>
                      <m.button
                        className={styles.reviewBtn}
                        onClick={() => handleReview(report.id, report.reported_store_name)}
                        whileTap={{ scale: 0.97 }}
                      >
                        Mark Reviewed
                      </m.button>
                      {!isSuspended && merchant && (
                        <m.button
                          className={styles.actionBtn}
                          onClick={() =>
                            setPendingSuspend({
                              merchantId: merchant.id,
                              storeName: merchant.store_name,
                            })
                          }
                          whileTap={{ scale: 0.97 }}
                        >
                          Action: Suspend →
                        </m.button>
                      )}
                      {isSuspended && (
                        <span className={styles.alreadySuspended}>Store already suspended</span>
                      )}
                    </div>
                  )}
                </m.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Suspend confirmation modal */}
      <AnimatePresence>
        {pendingSuspend && (
          <ConfirmSuspendModal
            storeName={pendingSuspend.storeName}
            onConfirm={handleSuspendConfirm}
            onCancel={() => setPendingSuspend(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
