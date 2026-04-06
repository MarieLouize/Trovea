import { m, AnimatePresence } from '@/lib/motion';
import { ShieldOff } from 'lucide-react';
import { useAdminStore } from '@/lib/store/admin.store';
import { useUIStore } from '@/lib/store/ui.store';
import { DEV_MERCHANTS } from '@/lib/store/merchant.store';
import { formatRelativeDate } from '@/lib/utils/format';
import styles from './AdminSuspensionsPage.module.css';

export default function AdminSuspensionsPage() {
  const { suspendedMerchantIds, adminLog, unsuspendMerchant } = useAdminStore();
  const { addToast } = useUIStore();

  const suspendedMerchants = DEV_MERCHANTS.filter((m) =>
    suspendedMerchantIds.includes(m.id),
  );

  const handleUnsuspend = (merchantId: string, storeName: string) => {
    unsuspendMerchant(merchantId, storeName);
    addToast(`${storeName} has been unsuspended.`, 'success');
  };

  const merchantName = (merchantId: string | null) => {
    if (!merchantId) return 'Platform';
    return DEV_MERCHANTS.find((m) => m.id === merchantId)?.store_name ?? merchantId;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Suspensions</h1>
          <p className={styles.pageSubtitle}>
            {suspendedMerchants.length === 0
              ? 'No stores currently suspended'
              : `${suspendedMerchants.length} store${suspendedMerchants.length > 1 ? 's' : ''} suspended`}
          </p>
        </div>
      </div>

      {/* ── Currently suspended stores ── */}
      <section className={styles.section} aria-label="Currently suspended stores">
        <h2 className={styles.sectionTitle}>Active Suspensions</h2>

        <AnimatePresence mode="popLayout">
          {suspendedMerchants.length === 0 ? (
            <m.div
              key="empty"
              className={styles.emptyState}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className={styles.emptyIcon} aria-hidden="true">
                <ShieldOff size={24} />
              </div>
              <p className={styles.emptyTitle}>No stores are currently suspended.</p>
              <p className={styles.emptyBody}>
                Suspensions are logged here when issued from Reports or Store management.
              </p>
            </m.div>
          ) : (
            <div className={styles.suspendedList}>
              {suspendedMerchants.map((merchant) => (
                <m.div
                  key={merchant.id}
                  className={styles.suspendedCard}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  layout
                >
                  <div className={styles.suspendedInfo}>
                    <span className={styles.suspendedName}>{merchant.store_name}</span>
                    <span className={styles.suspendedHandle}>@{merchant.handle}</span>
                  </div>
                  <m.button
                    className={styles.unsuspendBtn}
                    onClick={() => handleUnsuspend(merchant.id, merchant.store_name)}
                    whileTap={{ scale: 0.97 }}
                    aria-label={`Unsuspend ${merchant.store_name}`}
                  >
                    Unsuspend
                  </m.button>
                </m.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </section>

      {/* ── Admin action log ── */}
      <section className={styles.section} aria-label="Admin audit log">
        <h2 className={styles.sectionTitle}>Admin Audit Log</h2>
        <p className={styles.auditNote}>Append-only. All admin actions are permanently recorded.</p>
        <div className={styles.logTable}>
          <div className={styles.logTableHead} role="row" aria-hidden="true">
            <span>Action</span>
            <span>Store</span>
            <span>When</span>
            <span>Note</span>
          </div>
          <div className={styles.logTableBody}>
            {adminLog.map((entry) => (
              <div key={entry.id} className={styles.logTableRow} role="row">
                <span className={styles.logAction}>{entry.action}</span>
                <span className={styles.logStore}>{merchantName(entry.target_merchant_id)}</span>
                <span className={styles.logTime}>{formatRelativeDate(entry.created_at)}</span>
                <span className={styles.logNote}>{entry.note ?? '—'}</span>
              </div>
            ))}
            {adminLog.length === 0 && (
              <div className={styles.logTableRow}>
                <span className={styles.logNote} style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                  No log entries yet.
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
