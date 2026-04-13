import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { m, AnimatePresence } from '@/lib/motion';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import type { Merchant } from '@/lib/types';
import { useAdminStore, type AdminVerificationTier } from '@/lib/store/admin.store';
import { useUIStore } from '@/lib/store/ui.store';
import styles from './AdminStoresPage.module.css';

// ─── Sub-component: Inline management panel ──────────────────────────────────

interface ManagePanelProps {
  merchant: Merchant;
  onClose: () => void;
}

function ManagePanel({ merchant, onClose }: ManagePanelProps) {
  const { setMerchantTier, suspendMerchant, unsuspendMerchant } = useAdminStore();
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const currentTier = merchant.verification_tier;
  const isSuspended = merchant.is_suspended;
  const tiers: AdminVerificationTier[] = ['unverified', 'verified', 'trusted'];

  const handleTier = async (tier: AdminVerificationTier) => {
    if (tier === currentTier || isProcessing) return;
    setIsProcessing(true);
    await setMerchantTier(merchant.id, tier);
    setIsProcessing(false);
  };

  const handleSuspend = async () => {
    if (isSuspended || isProcessing) return;
    setIsProcessing(true);
    await suspendMerchant(merchant.id, note || `Suspended by admin.`);
    setIsProcessing(false);
    onClose();
  };

  const handleUnsuspend = async () => {
    if (!isSuspended || isProcessing) return;
    setIsProcessing(true);
    await unsuspendMerchant(merchant.id);
    setIsProcessing(false);
    onClose();
  };

  return (
    <m.div
      className={styles.managePanel}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: [0.32, 0, 0.16, 1] }}
    >
      <div className={styles.managePanelInner}>
        {/* Verification tier */}
        <div className={styles.manageSection}>
          <span className={styles.manageLabel}>Verification Tier</span>
          <div className={styles.tierBtns} role="group" aria-label="Verification tier">
            {tiers.map((tier) => (
              <m.button
                key={tier}
                className={`${styles.tierBtn} ${currentTier === tier ? styles.tierBtnActive : ''}`}
                onClick={() => handleTier(tier)}
                disabled={isProcessing}
                whileTap={{ scale: 0.97 }}
                aria-pressed={currentTier === tier}
              >
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </m.button>
            ))}
          </div>
        </div>

        {/* Admin note */}
        {!isSuspended && (
          <div className={styles.manageSection}>
            <label className={styles.manageLabel} htmlFor={`note-${merchant.id}`}>
              Suspension Note
            </label>
            <textarea
              id={`note-${merchant.id}`}
              className={styles.noteInput}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for suspension…"
              rows={2}
            />
          </div>
        )}

        {/* Actions */}
        <div className={styles.manageActions}>
          {!isSuspended ? (
            <m.button
              className={styles.suspendBtn}
              onClick={handleSuspend}
              disabled={isProcessing}
              whileTap={{ scale: 0.97 }}
              aria-label={`Suspend ${merchant.store_name}`}
            >
              {isProcessing ? 'Processing...' : 'Suspend Store'}
            </m.button>
          ) : (
            <m.button
              className={styles.saveBtn}
              onClick={handleUnsuspend}
              disabled={isProcessing}
              whileTap={{ scale: 0.97 }}
              aria-label={`Unsuspend ${merchant.store_name}`}
            >
              {isProcessing ? 'Processing...' : 'Unsuspend Store'}
            </m.button>
          )}
        </div>
      </div>
    </m.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const STORE_TYPE_LABELS: Record<string, string> = {
  collector: 'Collector',
  vendor: 'Vendor',
  host: 'Host',
  digital_creator: 'Digital',
  studio: 'Studio',
};

export default function AdminStoresPage() {
  const { merchants, reports, isLoading, initFromDB } = useAdminStore();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    initFromDB();
  }, [initFromDB]);

  const reportCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => {
      counts[r.reported_merchant_id] = (counts[r.reported_merchant_id] ?? 0) + 1;
    });
    return counts;
  }, [reports]);

  const filtered = useMemo(() => merchants.filter((m) => {
    const q = search.toLowerCase();
    return m.store_name.toLowerCase().includes(q) || m.handle.toLowerCase().includes(q);
  }), [merchants, search]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (isLoading && merchants.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className="skeleton-text" style={{ width: '120px', height: '32px' }} />
        </div>
        <div className={styles.storeList}>
          {[1,2,3].map(i => (
            <div key={i} className={styles.storeEntry} style={{ height: '80px', opacity: 0.5 }}>
              <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 'var(--r-md)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Stores</h1>
          <p className={styles.pageSubtitle}>{merchants.length} stores on platform</p>
        </div>
        <input
          className={styles.searchInput}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or handle…"
          aria-label="Search stores"
        />
      </div>

      <div className={styles.storeList}>
        {filtered.map((merchant) => {
          const tier = merchant.verification_tier;
          const isSuspended = merchant.is_suspended;
          const reportCount = reportCounts[merchant.id] ?? 0;
          const isExpanded = expandedId === merchant.id;

          return (
            <div key={merchant.id} className={styles.storeEntry}>
              <div className={styles.storeRow}>
                {/* Store info */}
                <div className={styles.storeInfo}>
                  <div className={styles.storeNameRow}>
                    <span className={styles.storeName}>{merchant.store_name}</span>
                    <span className={styles.storeHandle}>@{merchant.handle}</span>
                    {isSuspended && (
                      <span className={styles.suspendedBadge}>SUSPENDED</span>
                    )}
                  </div>
                  <div className={styles.storeMeta}>
                    <span className={styles.typeBadge}>{STORE_TYPE_LABELS[merchant.store_type]}</span>
                    <span className={`${styles.tierBadge} ${styles[`tier_${tier}`]}`}>
                      {tier === 'trusted' ? '★' : tier === 'verified' ? '●' : '○'}
                      {' '}{tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </span>
                    <span className={`${styles.openDot} ${merchant.store_open ? styles.openDotActive : ''}`} aria-hidden="true" />
                    <span className={styles.openLabel}>{merchant.store_open ? 'Open' : 'Closed'}</span>
                    {reportCount > 0 && (
                      <span className={styles.reportCount}>{reportCount} report{reportCount > 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className={styles.storeActions}>
                  <Link
                    to={`/store/${merchant.handle}`}
                    className={styles.viewBtn}
                    aria-label={`View ${merchant.store_name} storefront`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={13} aria-hidden="true" />
                    View
                  </Link>
                  <m.button
                    className={`${styles.manageBtn} ${isExpanded ? styles.manageBtnActive : ''}`}
                    onClick={() => toggleExpand(merchant.id)}
                    whileTap={{ scale: 0.97 }}
                    aria-expanded={isExpanded}
                    aria-label={`Manage ${merchant.store_name}`}
                  >
                    Manage
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </m.button>
                </div>
              </div>

              {/* Inline manage panel */}
              <AnimatePresence>
                {isExpanded && (
                  <ManagePanel
                    merchant={merchant}
                    onClose={() => setExpandedId(null)}
                  />
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className={styles.emptyNote}>No stores match "{search}".</p>
        )}
      </div>
    </div>
  );
}
