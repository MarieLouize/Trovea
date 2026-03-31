import { m } from '@/lib/motion';
import type { Merchant } from '@/lib/types';
import type { AdminVerificationTier } from '@/lib/store/admin.store';
import { useAdminStore } from '@/lib/store/admin.store';
import { useUIStore } from '@/lib/store/ui.store';
import { DEV_MERCHANTS } from '@/lib/store/merchant.store';
import { FIXTURE_RECEIPTS, FIXTURE_REPORTS } from '@/lib/fixtures';
import styles from './AdminVerificationPage.module.css';

// ─── Eligibility note derivation (static, fixture-based) ─────────────────────

function getEligibilityNote(merchant: Merchant, tier: AdminVerificationTier): string {
  const receiptCount = FIXTURE_RECEIPTS.filter((r) => r.merchant_id === merchant.id).length;
  const openReports = FIXTURE_REPORTS.filter(
    (r) => r.reported_merchant_id === merchant.id && r.status === 'pending',
  ).length;

  const initializedAt = new Date(merchant.initialized_at);
  const daysSinceInit = Math.floor(
    (Date.now() - initializedAt.getTime()) / 86400000,
  );

  const hasOpenReports = openReports > 0;
  const isActive = receiptCount > 0;
  const isOldEnough = daysSinceInit >= 90;

  if (tier === 'trusted') {
    if (!isOldEnough) return `Trusted: ineligible (less than 90 days active — ${daysSinceInit} days so far)`;
    if (hasOpenReports) return `Trusted: ineligible (${openReports} open report${openReports > 1 ? 's' : ''})`;
    return 'Trusted: eligible (active store, 90+ days, no open reports)';
  }
  if (tier === 'verified') {
    if (hasOpenReports) return `Verified: ineligible (${openReports} open report${openReports > 1 ? 's' : ''})`;
    if (!isActive) return 'Verified: ineligible (no receipts issued yet)';
    return 'Verified: eligible (active store, no open reports)';
  }
  return '';
}

const TIER_OPTIONS: { value: AdminVerificationTier; label: string; symbol: string }[] = [
  { value: 'unverified', label: 'Unverified', symbol: '○' },
  { value: 'verified',   label: 'Verified',   symbol: '●' },
  { value: 'trusted',    label: 'Trusted',    symbol: '★' },
];

const STORE_TYPE_LABELS: Record<string, string> = {
  collector: 'Collector', vendor: 'Vendor', host: 'Host',
  digital_creator: 'Digital', studio: 'Studio',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminVerificationPage() {
  const { merchantTiers, setMerchantTier } = useAdminStore();
  const { addToast } = useUIStore();

  const handleSetTier = (merchant: Merchant, tier: AdminVerificationTier) => {
    const current = merchantTiers[merchant.id] ?? merchant.verification_tier;
    if (tier === current) return;
    setMerchantTier(merchant.id, tier, merchant.store_name);
    addToast(`${merchant.store_name} → ${tier}.`, 'success');
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Verification</h1>
          <p className={styles.pageSubtitle}>Manage store verification tiers</p>
        </div>
      </div>

      <div className={styles.storeList}>
        {DEV_MERCHANTS.map((merchant, i) => {
          const currentTier = merchantTiers[merchant.id] ?? merchant.verification_tier;
          const receiptCount = FIXTURE_RECEIPTS.filter((r) => r.merchant_id === merchant.id).length;
          const reportCount = FIXTURE_REPORTS.filter((r) => r.reported_merchant_id === merchant.id).length;
          const initializedAt = new Date(merchant.initialized_at);
          const daysSince = Math.floor((Date.now() - initializedAt.getTime()) / 86400000);

          const verifiedNote = getEligibilityNote(merchant, 'verified');
          const trustedNote = getEligibilityNote(merchant, 'trusted');

          return (
            <m.div
              key={merchant.id}
              className={styles.storeCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: i * 0.06 }}
            >
              {/* Header row */}
              <div className={styles.cardHeader}>
                <div className={styles.storeInfo}>
                  <span className={styles.storeName}>{merchant.store_name}</span>
                  <span className={styles.typeBadge}>{STORE_TYPE_LABELS[merchant.store_type]}</span>
                </div>
                <span className={`${styles.currentTier} ${styles[`tier_${currentTier}`]}`}>
                  {TIER_OPTIONS.find((t) => t.value === currentTier)?.symbol}{' '}
                  {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
                </span>
              </div>

              {/* Stats strip */}
              <div className={styles.statsStrip}>
                <span className={styles.stat}>
                  <span className={styles.statNum}>{receiptCount}</span> receipts
                </span>
                <span className={styles.statDivider}>·</span>
                <span className={styles.stat}>
                  <span className={styles.statNum}>{reportCount}</span> report{reportCount !== 1 ? 's' : ''}
                </span>
                <span className={styles.statDivider}>·</span>
                <span className={styles.stat}>
                  <span className={styles.statNum}>{daysSince}</span> days active
                </span>
              </div>

              {/* Tier controls */}
              <div className={styles.tierRow} role="group" aria-label={`Verification tier for ${merchant.store_name}`}>
                {TIER_OPTIONS.map((opt) => (
                  <m.button
                    key={opt.value}
                    className={`${styles.tierBtn} ${currentTier === opt.value ? styles.tierBtnActive : ''}`}
                    onClick={() => handleSetTier(merchant, opt.value)}
                    whileTap={{ scale: 0.97 }}
                    aria-pressed={currentTier === opt.value}
                  >
                    {opt.symbol} {opt.label}
                  </m.button>
                ))}
              </div>

              {/* Eligibility notes */}
              <div className={styles.eligibilityNotes}>
                <p className={styles.eligNote}>{verifiedNote}</p>
                <p className={styles.eligNote}>{trustedNote}</p>
              </div>
            </m.div>
          );
        })}
      </div>
    </div>
  );
}
