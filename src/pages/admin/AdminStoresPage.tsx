import { useState } from 'react';
import { Link } from 'react-router-dom';
import { m, AnimatePresence } from '@/lib/motion';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import type { Merchant } from '@/lib/types';
import { useAdminStore } from '@/lib/store/admin.store';
import { useUIStore } from '@/lib/store/ui.store';
import { DEV_MERCHANTS } from '@/lib/store/merchant.store';
import { FIXTURE_REPORTS } from '@/lib/fixtures';
import styles from './AdminStoresPage.module.css';

// ─── Sub-component: Inline management panel ──────────────────────────────────

interface ManagePanelProps {
  merchant: Merchant;
  onClose: () => void;
}

function ManagePanel({ merchant, onClose }: ManagePanelProps) {
  const { merchantTiers, suspendedMerchantIds, setMerchantTier, suspendMerchant } = useAdminStore();
  const { addToast } = useUIStore();
  const [note, setNote] = useState('');

  const currentTier = merchantTiers[merchant.id] ?? merchant.verification_tier;
  const isSuspended = suspendedMerchantIds.includes(merchant.id);
  const tiers = ['unverified', 'verified', 'trusted'] as const;

  const handleTier = (tier: typeof tiers[number]) => {
    if (tier === currentTier) return;
    setMerchantTier(merchant.id, tier, merchant.store_name);
    addToast(`${merchant.store_name} tier updated to ${tier}.`, 'success');
  };

  const handleSuspend = () => {
    if (isSuspended) return;
    suspendMerchant(merchant.id, merchant.store_name, note || undefined);
    addToast(`${merchant.store_name} has been suspended.`, 'success');
    onClose();
  };

  const handleSaveNote = () => {
    if (!note.trim()) return;
    addToast('Changes saved.', 'success');
    setNote('');
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
                whileTap={{ scale: 0.97 }}
                aria-pressed={currentTier === tier}
              >
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </m.button>
            ))}
          </div>
        </div>

        {/* Admin note */}
        <div className={styles.manageSection}>
          <label className={styles.manageLabel} htmlFor={`note-${merchant.id}`}>
            Admin Note
          </label>
          <textarea
            id={`note-${merchant.id}`}
            className={styles.noteInput}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add an internal note…"
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className={styles.manageActions}>
          <m.button
            className={styles.saveBtn}
            onClick={handleSaveNote}
            disabled={!note.trim()}
            whileTap={{ scale: 0.97 }}
          >
            Save Changes
          </m.button>
          {!isSuspended && (
            <m.button
              className={styles.suspendBtn}
              onClick={handleSuspend}
              whileTap={{ scale: 0.97 }}
              aria-label={`Suspend ${merchant.store_name}`}
            >
              Suspend Store
            </m.button>
          )}
          {isSuspended && (
            <span className={styles.suspendedNote}>Store is currently suspended</span>
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
  const { merchantTiers, suspendedMerchantIds } = useAdminStore();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const reportCounts: Record<string, number> = {};
  FIXTURE_REPORTS.forEach((r) => {
    reportCounts[r.reported_merchant_id] = (reportCounts[r.reported_merchant_id] ?? 0) + 1;
  });

  const filtered = DEV_MERCHANTS.filter((m) => {
    const q = search.toLowerCase();
    return m.store_name.toLowerCase().includes(q) || m.handle.toLowerCase().includes(q);
  });

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Stores</h1>
          <p className={styles.pageSubtitle}>{DEV_MERCHANTS.length} stores on platform</p>
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
          const tier = merchantTiers[merchant.id] ?? merchant.verification_tier;
          const isSuspended = suspendedMerchantIds.includes(merchant.id);
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
