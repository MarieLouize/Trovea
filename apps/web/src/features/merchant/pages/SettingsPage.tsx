import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Wand2, Lock, ExternalLink, ChevronDown } from 'lucide-react';
import { m, AnimatePresence } from '@/lib/motion';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { useUIStore } from '@/lib/store/ui.store';
import { useAuthStore } from '@/lib/store/auth.store';
import { formatPhone } from '@/lib/utils/format';
import styles from './SettingsPage.module.css';

const HOLD_DURATIONS = [2, 6, 12, 24] as const;
const RESPONSE_TIME_OPTIONS = [2, 4, 8, 12, 24, 48, 72];

const NIGERIAN_BANKS = [
  'Opay', 'PalmPay', 'Moniepoint', 'GTBank', 'Access Bank',
  'First Bank', 'Zenith Bank', 'UBA', 'Sterling Bank', 'FCMB',
] as const;

const DEFAULT_WA_TEMPLATE =
  "Hi {store_name}! I'm interested in {item_name} (₦{price}). Is it still available?";

function CustomDropdown({ 
  value, 
  options, 
  onChange, 
  label 
}: { 
  value: number; 
  options: number[]; 
  onChange: (v: number) => void; 
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={styles.customDropdown}>
      <button 
        className={styles.dropdownToggle} 
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span>{value} {label}</span>
        <ChevronDown size={14} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <m.div 
            className={styles.dropdownMenu}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {options.map(opt => (
              <button 
                key={opt} 
                className={styles.dropdownItem}
                onClick={() => { onChange(opt); setIsOpen(false); }}
              >
                {opt} {label}
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SettingsPage() {
  const { merchant, updateMerchant } = useMerchantStore();
  const st = useStoreType();
  const { addToast } = useUIStore();
  const navigate = useNavigate();
  const signOut = useAuthStore((s) => s.signOut);

  // ── EXISTING FORM STATE ──────────────────────────────────────────
  const [displayName, setDisplayName] = useState(merchant.display_name);
  const [storeName, setStoreName] = useState(merchant.store_name);
  const [bio, setBio] = useState(merchant.bio);
  const [whatsapp, setWhatsapp] = useState(merchant.whatsapp);
  const [instagram, setInstagram] = useState(merchant.social_links.instagram ?? '');
  const [tiktok, setTiktok] = useState(merchant.social_links.tiktok ?? '');
  const [storeOpen, setStoreOpen] = useState(merchant.store_open);
  const [whatsappTemplate, setWhatsappTemplate] = useState(
    merchant.whatsapp_template ?? DEFAULT_WA_TEMPLATE
  );

  // Ceremony state
  const [showFirstLiveCeremony, setShowFirstLiveCeremony] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  // ── NEW STATE (Phase 2.5-K) ──────────────────────────────────────
  const [arrivalNotes, setArrivalNotes] = useState(merchant.arrival_notes ?? '');
  const [responseTimeHours, setResponseTimeHours] = useState(merchant.response_time_hours ?? 24);
  const [portfolioOrder, setPortfolioOrder] = useState<'curated' | 'recent'>(
    merchant.store_config.store_type_config.portfolio_order ?? 'curated'
  );

  // Notification toggles (local-only, no merchant field)
  const [notifyNewOrder, setNotifyNewOrder] = useState(true);
  const [notifyPayment, setNotifyPayment] = useState(true);
  const [notifyClaims, setNotifyClaims] = useState(true);
  const [notifyLowStock, setNotifyLowStock] = useState(false);

  // ── CHECKOUT ─────────────────────────────────────────────────────
  const [checkoutEnabled, setCheckoutEnabled] = useState(merchant.checkout_enabled);
  const [bankName, setBankName] = useState(merchant.bank_account?.bank_name ?? '');
  const [accountNumber, setAccountNumber] = useState(merchant.bank_account?.account_number ?? '');
  const [accountName, setAccountName] = useState(merchant.bank_account?.account_name ?? '');
  const [accountNumberTouched, setAccountNumberTouched] = useState(false);

  // ── HOLD SYSTEM ──────────────────────────────────────────────────
  const [holdsEnabled, setHoldsEnabled] = useState(merchant.holds_enabled);
  const [holdDuration, setHoldDuration] = useState<2 | 6 | 12 | 24>(merchant.hold_duration_hours);

  // ── HOST / STUDIO ────────────────────────────────────────────────
  const [bufferTimeMinutes, setBufferTimeMinutes] = useState(merchant.buffer_time_minutes ?? 0);
  const [cancellationPolicy, setCancellationPolicy] = useState(merchant.cancellation_policy ?? '');
  const [studioLocation, setStudioLocation] = useState(merchant.studio_location ?? '');
  const [notTakingClients, setNotTakingClients] = useState(merchant.not_taking_clients);

  // ── DIGITAL DELIVERY ─────────────────────────────────────────────
  const [deliveryEmailEnabled, setDeliveryEmailEnabled] = useState(false);

  // ── STORE PAUSE ──────────────────────────────────────────────────
  const [isPaused, setIsPaused] = useState(merchant.is_paused);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [modalPauseMessage, setModalPauseMessage] = useState('');
  const [modalReturnDate, setModalReturnDate] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  // ── DIRTY STATE ──────────────────────────────────────────────────
  const initialWaTemplate = merchant.whatsapp_template ?? DEFAULT_WA_TEMPLATE;

  const isDirty =
    displayName !== merchant.display_name ||
    storeName !== merchant.store_name ||
    bio !== merchant.bio ||
    whatsapp !== merchant.whatsapp ||
    instagram !== (merchant.social_links.instagram ?? '') ||
    tiktok !== (merchant.social_links.tiktok ?? '') ||
    storeOpen !== merchant.store_open ||
    whatsappTemplate !== initialWaTemplate ||
    checkoutEnabled !== merchant.checkout_enabled ||
    bankName !== (merchant.bank_account?.bank_name ?? '') ||
    accountNumber !== (merchant.bank_account?.account_number ?? '') ||
    accountName !== (merchant.bank_account?.account_name ?? '') ||
    holdsEnabled !== merchant.holds_enabled ||
    holdDuration !== merchant.hold_duration_hours ||
    arrivalNotes !== (merchant.arrival_notes ?? '') ||
    responseTimeHours !== (merchant.response_time_hours ?? 24) ||
    portfolioOrder !== (merchant.store_config.store_type_config.portfolio_order ?? 'curated') ||
    bufferTimeMinutes !== (merchant.buffer_time_minutes ?? 0) ||
    cancellationPolicy !== (merchant.cancellation_policy ?? '') ||
    studioLocation !== (merchant.studio_location ?? '') ||
    notTakingClients !== merchant.not_taking_clients ||
    deliveryEmailEnabled !== false ||
    notifyNewOrder !== true ||
    notifyPayment !== true ||
    notifyClaims !== true ||
    notifyLowStock !== false;

  const isFirstLiveTrigger = !merchant.has_gone_live && storeOpen && storeOpen !== merchant.store_open;

  // ── ACTIONS ──────────────────────────────────────────────────────
  const handleSave = async () => {
    const isFirstLive = !merchant.has_gone_live && storeOpen;
    setIsSaving(true);
    
    // Snapshot current merchant for potential rollback
    const snapshot = { ...merchant };

    updateMerchant({
      display_name: displayName,
      store_name: storeName,
      bio,
      whatsapp,
      social_links: { instagram, twitter: merchant.social_links.twitter, tiktok },
      store_open: storeOpen,
      has_gone_live: merchant.has_gone_live || storeOpen,
      whatsapp_template: whatsappTemplate,
      checkout_enabled: checkoutEnabled,
      bank_account: checkoutEnabled ? { bank_name: bankName, account_number: accountNumber, account_name: accountName } : merchant.bank_account,
      holds_enabled: holdsEnabled,
      hold_duration_hours: holdDuration,
      arrival_notes: arrivalNotes,
      response_time_hours: responseTimeHours,
      buffer_time_minutes: bufferTimeMinutes,
      cancellation_policy: cancellationPolicy || null,
      studio_location: studioLocation || null,
      not_taking_clients: notTakingClients,
      is_paused: isPaused,
      pause_message: modalPauseMessage || null,
      pause_return_date: modalReturnDate || null,
      store_config: {
        ...merchant.store_config,
        store_type_config: {
          ...merchant.store_config.store_type_config,
          portfolio_order: portfolioOrder,
        }
      }
    });

    const { saveMerchant } = useMerchantStore.getState();
    const success = await saveMerchant();

    if (success) {
      if (isFirstLive) {
        setShowFirstLiveCeremony(true);
        setTimeout(() => setShowFirstLiveCeremony(false), 2500);
      }
      addToast('Changes saved', 'success');
    } else {
      // Rollback
      updateMerchant(snapshot);
      addToast('Failed to save changes. Please try again.', 'error');
    }
    setIsSaving(false);
  };

  const handleCopyUrl = () => {
    const url = `trovea.store/${merchant.handle}`;
    navigator.clipboard.writeText(url);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
    addToast('Link copied', 'success');
  };

  const handleShareWhatsApp = () => {
    const url = `trovea.store/${merchant.handle}`;
    const text = `Check out my store on Trovéa: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };


  const handleDiscard = () => {
    setDisplayName(merchant.display_name);
    setStoreName(merchant.store_name);
    setBio(merchant.bio);
    setWhatsapp(merchant.whatsapp);
    setInstagram(merchant.social_links.instagram ?? '');
    setTiktok(merchant.social_links.tiktok ?? '');
    setStoreOpen(merchant.store_open);
    setWhatsappTemplate(initialWaTemplate);
    setCheckoutEnabled(merchant.checkout_enabled);
    setBankName(merchant.bank_account?.bank_name ?? '');
    setAccountNumber(merchant.bank_account?.account_number ?? '');
    setAccountName(merchant.bank_account?.account_name ?? '');
    setAccountNumberTouched(false);
    setHoldsEnabled(merchant.holds_enabled);
    setHoldDuration(merchant.hold_duration_hours);
    setArrivalNotes(merchant.arrival_notes ?? '');
    setResponseTimeHours(merchant.response_time_hours ?? 24);
    setPortfolioOrder(merchant.store_config.store_type_config.portfolio_order ?? 'curated');
    setBufferTimeMinutes(merchant.buffer_time_minutes ?? 0);
    setCancellationPolicy(merchant.cancellation_policy ?? '');
    setStudioLocation(merchant.studio_location ?? '');
    setNotTakingClients(merchant.not_taking_clients);
    setDeliveryEmailEnabled(false);
    setNotifyNewOrder(true);
    setNotifyPayment(true);
    setNotifyClaims(true);
    setNotifyLowStock(false);
  };

  const handleConfirmPause = () => {
    setIsPaused(true);
    setShowPauseModal(false);
    setModalPauseMessage('');
    setModalReturnDate('');
    addToast("Store paused. Buyers can still browse.", 'success');
  };

  const handleResume = () => {
    setIsPaused(false);
    addToast("Store is now active.", 'success');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const accountNumberInvalid =
    accountNumberTouched && accountNumber.length > 0 && accountNumber.length !== 10;

  // Verification tier metadata
  const verificationTiers: { id: 'unverified' | 'verified' | 'trusted'; label: string; icon: string }[] = [
    { id: 'unverified', label: 'Unverified', icon: '○' },
    { id: 'verified',   label: 'Verified',   icon: '●' },
    { id: 'trusted',    label: 'Trusted',    icon: '★' },
  ];

  const verificationNote =
    merchant.verification_tier === 'unverified'
      ? "Submit a verification request from the Trovéa help centre."
      : merchant.verification_tier === 'verified'
      ? "You're verified. To reach Trusted status, maintain a 4.8+ rating for 90 days."
      : "You've reached Trusted status — the highest tier on Trovéa.";

  return (
    <div className={styles.page}>
      {/* ── HEADER ── */}
      <div className={styles.header}>
        <p className={styles.eyebrow}>Settings</p>
        <h1 className={styles.title}>Account & Store</h1>
        <p className={styles.subtitle}>Manage your profile, store, and preferences.</p>
      </div>

      {/* ── THE ARCHITECT CTA ── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Storefront</p>
        <div className={styles.card}>
          <div className={styles.architectRow}>
            <div className={styles.architectIcon} aria-hidden="true">
              <Wand2 size={18} />
            </div>
            <div className={styles.architectInfo}>
              <p className={styles.architectLabel}>The Architect</p>
              <p className={styles.architectDesc}>
                Customize your store's palette, layout, typography, card style, and section order with a live preview.
              </p>
            </div>
            <Link
              to={`/store/${merchant.handle}/customize`}
              className={styles.architectBtn}
              aria-label="Open The Architect store customizer"
            >
              Open
            </Link>
          </div>
        </div>
      </div>

      {/* ── PROFILE ── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Profile</p>
        <div className={styles.card}>
          <div className={styles.profileHeader}>
            <div className={styles.avatar}>
              {merchant.avatar_url && (
                <img src={merchant.avatar_url} alt={displayName} />
              )}
            </div>
            <div className={styles.profileInfo}>
              <p className={styles.profileName}>{displayName}</p>
              <p className={styles.profileHandle}>@{merchant.handle}</p>
            </div>
            <button className={styles.editAvatarBtn}>Change Photo</button>
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              className={styles.inputField}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="whatsappNum">WhatsApp Number</label>
            <input
              id="whatsappNum"
              className={styles.inputField}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+234..."
              type="tel"
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              className={`${styles.inputField} ${styles.textareaField}`}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell buyers about your store..."
            />
          </div>
        </div>
      </div>

      {/* ── STORE ── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Store</p>
        <div className={styles.card}>
          {/* Store Open Toggle */}
          <div className={styles.settingRow}>
            <div className={styles.settingLeft}>
              <p className={styles.settingLabel}>Store Status</p>
              <p className={styles.settingDesc}>Control whether buyers can visit your storefront.</p>
              <AnimatePresence>
                {showFirstLiveCeremony && (
                  <m.p
                    className={styles.goLiveMessage}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                  >
                    Your store is live
                  </m.p>
                )}
              </AnimatePresence>
            </div>
            <div className={`${styles.openBadge} ${storeOpen ? styles.openBadgeOpen : styles.openBadgeClosed}`}>
              <span className={`${styles.openDot} ${storeOpen ? styles.openDotOpen : styles.openDotClosed}`} />
              {storeOpen ? 'Open' : 'Closed'}
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={storeOpen}
                onChange={(e) => setStoreOpen(e.target.checked)}
                aria-label="Toggle store open"
              />
              <m.span 
                className={styles.toggleSlider} 
                transition={isFirstLiveTrigger ? { duration: 0.375 } : undefined}
              />
            </label>
          </div>

          <AnimatePresence>
            {showFirstLiveCeremony && (
              <m.div
                className={styles.urlPanel}
                initial={{ scaleY: 0, opacity: 0, originY: 'top' }}
                animate={{ scaleY: 1, opacity: 1 }}
                exit={{ scaleY: 0, opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className={styles.urlDisplay}>
                  <div className={styles.urlInset}>
                    <span className={styles.urlText}>trovea.store/{merchant.handle}</span>
                  </div>
                  <div className={styles.urlActions}>
                    <button 
                      className={styles.urlActionBtn} 
                      onClick={handleCopyUrl}
                      aria-label="Copy store URL"
                    >
                      {hasCopied ? 'Check' : 'Copy'}
                    </button>
                    <button 
                      className={styles.urlActionBtn} 
                      onClick={handleShareWhatsApp}
                      aria-label="Share store URL on WhatsApp"
                    >
                      Share
                    </button>
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="storeName">Store Name</label>
            <input
              id="storeName"
              className={styles.inputField}
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Your store name"
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="storeHandle">
              Store Handle
            </label>
            <div className={styles.lockedFieldWrap}>
              <input
                id="storeHandle"
                className={`${styles.inputField} ${styles.inputFieldLocked}`}
                value={`@${merchant.handle}`}
                readOnly
              />
              <Lock size={13} className={styles.lockIcon} aria-hidden="true" />
            </div>
            <p className={styles.fieldHint}>Handle is locked after initialization.</p>
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="instagram">Instagram</label>
            <input
              id="instagram"
              className={styles.inputField}
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@handle"
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="tiktok">TikTok</label>
            <input
              id="tiktok"
              className={styles.inputField}
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              placeholder="@handle"
            />
          </div>
        </div>
      </div>

      {/* ── ARRIVAL NOTES + BUFFER TIME (Host only) ── */}
      {st.isHost && (
        <>
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Arrival Instructions</p>
            <div className={styles.card}>
              <div className={styles.formRow}>
                <textarea
                  className={`${styles.inputField} ${styles.arrivalNotesField}`}
                  value={arrivalNotes}
                  onChange={(e) => setArrivalNotes(e.target.value.slice(0, 200))}
                  placeholder="Please arrive 5 minutes early. Ring doorbell on arrival."
                  maxLength={200}
                />
                <p className={styles.fieldHint}>Shown on every booking confirmation. Max 200 characters.</p>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <p className={styles.sectionTitle}>Buffer Between Appointments</p>
            <div className={styles.card}>
              <div className={styles.formRow}>
                <select
                  className={styles.inputField}
                  value={bufferTimeMinutes}
                  onChange={(e) => setBufferTimeMinutes(Number(e.target.value))}
                >
                  <option value={0}>No buffer</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
                <p className={styles.fieldHint}>Gap enforced between bookings. Helps you clean up, travel, or prepare.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── NOT TAKING CLIENTS (Studio only) ── */}
      {st.isStudio && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Client Availability</p>
          <div className={styles.card}>
            <div className={styles.settingRow}>
              <div className={styles.settingLeft}>
                <p className={styles.settingLabel}>Not Taking New Clients</p>
                <p className={styles.settingDesc}>When on, your enquiry form shows "Not currently accepting new projects". Existing clients can still message you.</p>
              </div>
              <button
                className={`${styles.toggle} ${notTakingClients ? styles.toggleOn : ''}`}
                onClick={() => setNotTakingClients(v => !v)}
                aria-pressed={notTakingClients}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESPONSE TIME (Studio only) ── */}
      {st.isStudio && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Typical Response Time</p>
          <div className={styles.card}>
            <div className={styles.formRow}>
              <CustomDropdown 
                value={responseTimeHours} 
                options={RESPONSE_TIME_OPTIONS}
                onChange={setResponseTimeHours}
                label="hours"
              />
              <p className={styles.fieldHint}>"Usually responds within {responseTimeHours} hours". Shown in your store header and on enquiries.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── PORTFOLIO ORDER (Studio + Host) ── */}
      {(st.isStudio || st.isHost) && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Portfolio Gallery Order</p>
          <div className={styles.card}>
            <div className={styles.settingRow}>
              <div className={styles.settingLeft}>
                <p className={styles.settingLabel}>Order Mode</p>
                <p className={styles.settingDesc}>Choose how your portfolio images are sorted.</p>
              </div>
              <div className={styles.portfolioOrderSetting}>
                <button 
                  className={`${styles.orderBtn} ${portfolioOrder === 'curated' ? styles.orderBtnActive : ''}`}
                  onClick={() => setPortfolioOrder('curated')}
                >
                  Curator
                </button>
                <button 
                  className={`${styles.orderBtn} ${portfolioOrder === 'recent' ? styles.orderBtnActive : ''}`}
                  onClick={() => setPortfolioOrder('recent')}
                >
                  Recent
                </button>
              </div>
            </div>
            <div className={styles.formRow}>
              <button 
                className={styles.rearrangeBtn}
                onClick={() => addToast('Portfolio management coming soon', 'info')}
              >
                [Rearrange photos]
              </button>
              <p className={styles.fieldHint}>Note: Photo rearrangement available in a future update.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── WHATSAPP TEMPLATE ── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Chat-to-Buy Message</p>
        <div className={styles.card}>
          <div className={styles.settingRow}>
            <div className={styles.settingLeft}>
              <p className={styles.settingLabel}>WhatsApp Template</p>
              <p className={styles.settingDesc}>
                This message is sent when a buyer taps "Chat to Buy" on your store.
                Use{' '}
                <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{'{item_name}'}</code>,{' '}
                <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{'{price}'}</code>,{' '}
                <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{'{store_name}'}</code>.
              </p>
            </div>
          </div>
          <div className={styles.formRow}>
            <textarea
              className={`${styles.inputField} ${styles.textareaField}`}
              value={whatsappTemplate}
              onChange={(e) => setWhatsappTemplate(e.target.value)}
              rows={4}
              aria-label="WhatsApp message template"
            />
          </div>
        </div>
      </div>

      {/* ── TROVÉA CHECKOUT ── */}
      {!st.isDigital && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Trovéa Checkout</p>
          <div className={styles.card}>
            <div className={styles.toggleCard}>
              <div className={styles.toggleRow}>
                <div className={styles.settingLeft}>
                  <p className={styles.settingLabel}>Accept bank transfer payments via Trovéa Checkout</p>
                  <p className={styles.settingDesc}>
                    {checkoutEnabled
                      ? 'Buyers can submit bank transfer proof directly on your storefront.'
                      : 'Buyers will contact you via WhatsApp to arrange payment.'}
                  </p>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    className={styles.toggleInput}
                    checked={checkoutEnabled}
                    onChange={(e) => setCheckoutEnabled(e.target.checked)}
                    aria-label="Toggle Trovéa Checkout"
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>

              <AnimatePresence>
                {checkoutEnabled && (
                  <m.div
                    className={styles.expandedContent}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.32, 0, 0.16, 1] }}
                  >
                    <div className={styles.bankForm}>
                      <div className={styles.bankField}>
                        <label className={styles.formLabel} htmlFor="bankName">Bank Name</label>
                        <select
                          id="bankName"
                          className={styles.selectField}
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          aria-label="Select bank"
                        >
                          <option value="">Select a bank…</option>
                          {NIGERIAN_BANKS.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.bankField}>
                        <label className={styles.formLabel} htmlFor="accountNumber">Account Number</label>
                        <input
                          id="accountNumber"
                          className={`${styles.inputField} ${accountNumberInvalid ? styles.inputFieldError : ''}`}
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          onBlur={() => setAccountNumberTouched(true)}
                          placeholder="0000000000"
                          inputMode="numeric"
                          maxLength={10}
                          aria-label="Account number"
                        />
                        {accountNumberInvalid && (
                          <p className={styles.fieldError}>Account numbers are 10 digits</p>
                        )}
                      </div>

                      <div className={styles.bankField}>
                        <label className={styles.formLabel} htmlFor="accountName">Account Name</label>
                        <input
                          id="accountName"
                          className={styles.inputField}
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          placeholder="As it appears on your account"
                          aria-label="Account name"
                        />
                      </div>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* ── HOLD SYSTEM ── */}
      {(st.isCollector || st.isVendor) && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Hold System</p>
          <div className={styles.card}>
            <div className={styles.toggleCard}>
              <div className={styles.toggleRow}>
                <div className={styles.settingLeft}>
                  <p className={styles.settingLabel}>Allow buyers to hold items while they arrange payment</p>
                  <p className={styles.settingDesc}>
                    {holdsEnabled
                      ? 'Buyers can request a hold. You control how long it lasts.'
                      : 'Buyers must buy immediately. No holds.'}
                  </p>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    className={styles.toggleInput}
                    checked={holdsEnabled}
                    onChange={(e) => setHoldsEnabled(e.target.checked)}
                    aria-label="Toggle hold system"
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>

              <AnimatePresence>
                {holdsEnabled && (
                  <m.div
                    className={styles.expandedContent}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.32, 0, 0.16, 1] }}
                  >
                    <div className={styles.holdDurationSection}>
                      <p className={styles.formLabel}>Hold Duration</p>
                      <div className={styles.holdDurations} role="group" aria-label="Hold duration options">
                        {HOLD_DURATIONS.map((d) => (
                          <button
                            key={d}
                            className={`${styles.holdDuration} ${holdDuration === d ? styles.holdDurationActive : ''}`}
                            onClick={() => setHoldDuration(d)}
                            aria-pressed={holdDuration === d}
                          >
                            {d}h
                          </button>
                        ))}
                      </div>
                      <p className={styles.holdNote}>
                        Items are automatically released if payment isn't confirmed within this window.
                      </p>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* ── CANCELLATION POLICY ── */}
      {(st.isHost || st.isStudio) && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Cancellation Policy</p>
          <div className={styles.card}>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="cancellationPolicy">Cancellation Policy</label>
              <p className={styles.settingDesc} style={{ marginBottom: 'var(--space-3)', paddingLeft: 0, position: 'relative', zIndex: 1 }}>
                Shown on all booking confirmations and on your storefront.
              </p>
              <textarea
                id="cancellationPolicy"
                className={`${styles.inputField} ${styles.policyTextarea}`}
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value.slice(0, 500))}
                placeholder="e.g. Cancellations within 48 hours of appointment forfeit the deposit. Rescheduling is available with 24 hours notice."
                maxLength={500}
                aria-label="Cancellation policy"
              />
              <p className={styles.charCount}>{cancellationPolicy.length} / 500</p>
            </div>
          </div>
        </div>
      )}

      {/* ── LOCATION ── */}
      {(st.isHost || st.isStudio) && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Location</p>
          <div className={styles.card}>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="studioLocation">Studio Location</label>
              <p className={styles.settingDesc} style={{ marginBottom: 'var(--space-3)', position: 'relative', zIndex: 1 }}>
                Shown on booking confirmations. Does not have to be your exact address.
              </p>
              <input
                id="studioLocation"
                className={styles.inputField}
                value={studioLocation}
                onChange={(e) => setStudioLocation(e.target.value)}
                placeholder="e.g. Wuse 2, Abuja (exact address sent after booking)"
                aria-label="Studio location"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── DIGITAL DELIVERY ── */}
      {st.isDigital && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Delivery Settings</p>
          <div className={styles.card}>
            <div className={styles.formRow}>
              <div className={styles.deliveryInfoCard}>
                <p className={styles.deliveryInfoText}>
                  Delivery is configured per product in your Catalogue.
                </p>
                <Link to="/catalogue" className={styles.deliveryInfoLink}>
                  Go to Catalogue
                  <ExternalLink size={12} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className={styles.toggleCard}>
              <div className={styles.toggleRow}>
                <div className={styles.settingLeft}>
                  <p className={styles.settingLabel}>Send delivery confirmation email</p>
                  <p className={styles.settingDesc}>
                    We'll email buyers their download link immediately after purchase.
                  </p>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    className={styles.toggleInput}
                    checked={deliveryEmailEnabled}
                    onChange={(e) => setDeliveryEmailEnabled(e.target.checked)}
                    aria-label="Toggle delivery confirmation email"
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Notifications</p>
        <div className={styles.card}>
          {([
            { label: 'New Orders',          desc: 'Alert when a new receipt is created.',          value: notifyNewOrder,  set: setNotifyNewOrder  },
            { label: 'Payment Confirmed',   desc: 'Alert when a receipt is marked as paid.',      value: notifyPayment,   set: setNotifyPayment   },
            { label: 'Claim Requests',      desc: 'Alert when a buyer submits a claim.',           value: notifyClaims,    set: setNotifyClaims    },
            { label: 'Low Stock',           desc: 'Alert when a product has 1 unit remaining.',   value: notifyLowStock,  set: setNotifyLowStock  },
          ] as { label: string; desc: string; value: boolean; set: (v: boolean) => void }[]).map((pref) => (
            <div key={pref.label} className={styles.settingRow}>
              <div className={styles.settingLeft}>
                <p className={styles.settingLabel}>{pref.label}</p>
                <p className={styles.settingDesc}>{pref.desc}</p>
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  className={styles.toggleInput}
                  checked={pref.value}
                  onChange={(e) => pref.set(e.target.checked)}
                  aria-label={`Toggle ${pref.label} notification`}
                />
                <span className={styles.toggleSlider} />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* ── VERIFICATION ── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Verification</p>
        <div className={styles.card}>
          <div className={styles.verificationCard}>
            <p className={styles.verificationHeading}>Verification Status</p>
            <div className={styles.verificationTiers} role="list">
              {verificationTiers.map((tier) => {
                const isActive = merchant.verification_tier === tier.id;
                return (
                  <div
                    key={tier.id}
                    role="listitem"
                    className={`${styles.verificationTier} ${isActive ? styles.verificationTierActive : ''}`}
                  >
                    <span className={styles.tierIcon} aria-hidden="true">{tier.icon}</span>
                    <span className={styles.tierLabel}>{tier.label}</span>
                  </div>
                );
              })}
            </div>
            <p className={styles.verificationNote}>{verificationNote}</p>
          </div>
        </div>
      </div>

      {/* ── STORE PAUSE ── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Store Pause</p>
        <div className={`${styles.pauseSection} ${isPaused ? styles.pauseActive : ''}`}>
          {isPaused ? (
            <>
              <div className={styles.pauseStatusRow}>
                <div className={styles.pauseStatusDot} aria-hidden="true" />
                <div className={styles.settingLeft}>
                  <p className={styles.settingLabel}>Your store is paused.</p>
                  <p className={styles.settingDesc}>
                    Buyers can browse but cannot place orders. WhatsApp contact stays active.
                  </p>
                </div>
              </div>
              <m.button
                className={styles.resumeButton}
                onClick={handleResume}
                whileTap={{ scale: 0.97 }}
                aria-label="Resume store"
              >
                Resume Store
              </m.button>
            </>
          ) : (
            <>
              <div className={styles.pauseStatusRow}>
                <div className={`${styles.pauseStatusDot} ${styles.pauseStatusDotActive}`} aria-hidden="true" />
                <div className={styles.settingLeft}>
                  <p className={styles.settingLabel}>Your store is active.</p>
                  <p className={styles.settingDesc}>
                    Buyers can browse and place orders as normal.
                  </p>
                </div>
              </div>
              <m.button
                className={styles.pauseButton}
                onClick={() => setShowPauseModal(true)}
                whileTap={{ scale: 0.97 }}
                aria-label="Pause store"
              >
                Pause Store
              </m.button>
            </>
          )}
        </div>
      </div>

      {/* ── ACCOUNT ── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Account</p>
        <div className={styles.card}>
          <div className={`${styles.settingRow} ${styles.settingRowClickable}`}>
            <div className={styles.settingLeft}>
              <p className={styles.settingLabel}>Phone Number</p>
              <p className={styles.settingDesc}>{formatPhone(merchant.whatsapp)}</p>
            </div>
            <ChevronRight size={16} className={styles.chevron} />
          </div>
          <div className={`${styles.settingRow} ${styles.settingRowClickable}`}>
            <div className={styles.settingLeft}>
              <p className={styles.settingLabel}>Change Password</p>
              <p className={styles.settingDesc}>Update your account password.</p>
            </div>
            <ChevronRight size={16} className={styles.chevron} />
          </div>
          <div className={`${styles.settingRow} ${styles.settingRowClickable}`}>
            <div className={styles.settingLeft}>
              <p className={styles.settingLabel}>Privacy Policy</p>
            </div>
            <ChevronRight size={16} className={styles.chevron} />
          </div>
          <div className={styles.settingRow}>
            <button
              className={styles.dangerBtn}
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <p className={styles.versionNote}>Trovéa · v0.1.0 · MVP Phase 2</p>

      {/* ── DIRTY-STATE SAVE BAR ── */}
      <AnimatePresence>
        {isDirty && (
          <m.div
            className={styles.saveBar}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            role="status"
            aria-live="polite"
          >
            <span className={styles.saveBarText}>You have unsaved changes</span>
            <div className={styles.saveBarActions}>
              <m.button
                className={styles.discardBtn}
                onClick={handleDiscard}
                whileTap={{ scale: 0.97 }}
                aria-label="Discard changes"
              >
                Discard
              </m.button>
              <m.button
                className={styles.saveChangesBtn}
                onClick={handleSave}
                disabled={isSaving}
                whileTap={{ scale: 0.97 }}
                aria-label="Save changes"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </m.button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── PAUSE MODAL ── */}
      <AnimatePresence>
        {showPauseModal && (
          <m.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowPauseModal(false)}
          >
            <m.div
              className={styles.modalCard}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.32, 0, 0.16, 1] }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="pauseModalHeading"
            >
              <h2 id="pauseModalHeading" className={styles.modalHeading}>Pause your store?</h2>
              <p className={styles.modalBody}>
                While paused, buyers can browse your store but cannot place orders.
                WhatsApp contact stays active.
              </p>

              <div className={styles.modalField}>
                <label className={styles.formLabel} htmlFor="modalPauseMsg">
                  Message to display on your storefront (optional)
                </label>
                <input
                  id="modalPauseMsg"
                  className={styles.inputField}
                  value={modalPauseMessage}
                  onChange={(e) => setModalPauseMessage(e.target.value)}
                  placeholder="e.g. Back in 2 weeks! Taking some time off."
                />
              </div>

              <div className={styles.modalField}>
                <label className={styles.formLabel} htmlFor="modalReturnDate">
                  Expected return date (optional)
                </label>
                <input
                  id="modalReturnDate"
                  className={styles.inputField}
                  type="date"
                  value={modalReturnDate}
                  onChange={(e) => setModalReturnDate(e.target.value)}
                />
              </div>

              <div className={styles.modalActions}>
                <m.button
                  className={styles.modalCancelBtn}
                  onClick={() => setShowPauseModal(false)}
                  whileTap={{ scale: 0.97 }}
                  aria-label="Cancel"
                >
                  Cancel
                </m.button>
                <m.button
                  className={styles.modalConfirmBtn}
                  onClick={handleConfirmPause}
                  whileTap={{ scale: 0.97 }}
                  aria-label="Confirm pause store"
                >
                  Pause Store
                </m.button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
