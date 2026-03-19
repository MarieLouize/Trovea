import { useState } from 'react';
import { ChevronRight, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FIXTURE_MERCHANT } from '@/lib/fixtures';
import { useUIStore } from '@/lib/store/ui.store';
import { formatPhone } from '@/lib/utils/format';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const { addToast } = useUIStore();

  // Local form state (Phase 1 — no persistence)
  const [displayName, setDisplayName] = useState(FIXTURE_MERCHANT.display_name);
  const [storeName, setStoreName] = useState(FIXTURE_MERCHANT.store_name);
  const [bio, setBio] = useState(FIXTURE_MERCHANT.bio);
  const [whatsapp, setWhatsapp] = useState(FIXTURE_MERCHANT.whatsapp);
  const [instagram, setInstagram] = useState(FIXTURE_MERCHANT.social_links.instagram ?? '');
  const [tiktok, setTiktok] = useState(FIXTURE_MERCHANT.social_links.tiktok ?? '');
  const [storeOpen, setStoreOpen] = useState(FIXTURE_MERCHANT.store_open);
  const [whatsappTemplate, setWhatsappTemplate] = useState(
    FIXTURE_MERCHANT.whatsapp_template ?? 'Hi {store_name}! I\'m interested in {item_name} (₦{price}). Is it still available?'
  );

  // Notification toggles
  const [notifyNewOrder, setNotifyNewOrder] = useState(true);
  const [notifyPayment, setNotifyPayment] = useState(true);
  const [notifyClaims, setNotifyClaims] = useState(true);
  const [notifyLowStock, setNotifyLowStock] = useState(false);

  const handleSaveProfile = () => {
    addToast('Profile updated', 'success');
  };

  const handleSaveStore = () => {
    addToast('Store settings saved', 'success');
  };

  const handleSaveNotifications = () => {
    addToast('Notification preferences saved', 'success');
  };

  const toggleLabel = (val: boolean) => (val ? 'on' : 'off');

  return (
    <div className={styles.page}>
      {/* Header */}
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
              to={`/store/${FIXTURE_MERCHANT.handle}/customize`}
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
          {/* Profile Header */}
          <div className={styles.profileHeader}>
            <div className={styles.avatar}>
              {FIXTURE_MERCHANT.avatar_url && (
                <img src={FIXTURE_MERCHANT.avatar_url} alt={displayName} />
              )}
            </div>
            <div className={styles.profileInfo}>
              <p className={styles.profileName}>{displayName}</p>
              <p className={styles.profileHandle}>@{FIXTURE_MERCHANT.handle}</p>
            </div>
            <button className={styles.editAvatarBtn}>Change Photo</button>
          </div>

          {/* Form */}
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
          <div className={styles.formRow}>
            <button className={styles.saveBtn} onClick={handleSaveProfile}>
              Save Profile
            </button>
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
            </div>
            <div>
              <div className={`${styles.openBadge} ${storeOpen ? styles.openBadgeOpen : styles.openBadgeClosed}`}>
                <span className={`${styles.openDot} ${storeOpen ? styles.openDotOpen : styles.openDotClosed}`} />
                {storeOpen ? 'Open' : 'Closed'}
              </div>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={storeOpen}
                onChange={(e) => setStoreOpen(e.target.checked)}
              />
              <span className={styles.toggleSlider} />
            </label>
          </div>

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
            <label className={styles.formLabel} htmlFor="storeHandle">Store Handle</label>
            <input
              id="storeHandle"
              className={styles.inputField}
              value={`@${FIXTURE_MERCHANT.handle}`}
              readOnly
              style={{ opacity: 0.5, cursor: 'default' }}
            />
          </div>

          {/* Social links */}
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
          <div className={styles.formRow}>
            <button className={styles.saveBtn} onClick={handleSaveStore}>
              Save Store Settings
            </button>
          </div>
        </div>
      </div>

      {/* ── WHATSAPP TEMPLATE ── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Chat-to-Buy Message</p>
        <div className={styles.card}>
          <div className={styles.settingRow}>
            <div className={styles.settingLeft}>
              <p className={styles.settingLabel}>WhatsApp Template</p>
              <p className={styles.settingDesc}>
                This message is sent when a buyer taps "Chat to Buy" on your store.
                Use <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{'{item_name}'}</code>, <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{'{price}'}</code>, <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{'{store_name}'}</code>.
              </p>
            </div>
          </div>
          <div className={styles.formRow}>
            <textarea
              className={`${styles.inputField} ${styles.textareaField}`}
              value={whatsappTemplate}
              onChange={(e) => setWhatsappTemplate(e.target.value)}
              rows={4}
            />
          </div>
          <div className={styles.formRow}>
            <button className={styles.saveBtn} onClick={() => addToast('Template saved', 'success')}>
              Save Template
            </button>
          </div>
        </div>
      </div>

      {/* ── NOTIFICATIONS ── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Notifications</p>
        <div className={styles.card}>
          {[
            {
              label: 'New Orders',
              desc: 'Alert when a new receipt is created.',
              value: notifyNewOrder,
              set: setNotifyNewOrder,
            },
            {
              label: 'Payment Confirmed',
              desc: 'Alert when a receipt is marked as paid.',
              value: notifyPayment,
              set: setNotifyPayment,
            },
            {
              label: 'Claim Requests',
              desc: 'Alert when a buyer submits a claim.',
              value: notifyClaims,
              set: setNotifyClaims,
            },
            {
              label: 'Low Stock',
              desc: 'Alert when a product has 1 unit remaining.',
              value: notifyLowStock,
              set: setNotifyLowStock,
            },
          ].map((pref) => (
            <div key={pref.label} className={styles.settingRow}>
              <div className={styles.settingLeft}>
                <p className={styles.settingLabel}>{pref.label}</p>
                <p className={styles.settingDesc}>{pref.desc}</p>
              </div>
              <span className={styles.settingValue}>{toggleLabel(pref.value)}</span>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  className={styles.toggleInput}
                  checked={pref.value}
                  onChange={(e) => pref.set(e.target.checked)}
                />
                <span className={styles.toggleSlider} />
              </label>
            </div>
          ))}
          <div className={styles.formRow}>
            <button className={styles.saveBtn} onClick={handleSaveNotifications}>
              Save Preferences
            </button>
          </div>
        </div>
      </div>

      {/* ── ACCOUNT ── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Account</p>
        <div className={styles.card}>
          <div className={`${styles.settingRow} ${styles.settingRowClickable}`}>
            <div className={styles.settingLeft}>
              <p className={styles.settingLabel}>Phone Number</p>
              <p className={styles.settingDesc}>{formatPhone(FIXTURE_MERCHANT.whatsapp)}</p>
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
              onClick={() => addToast('Sign out (Phase 2)', 'info')}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <p className={styles.versionNote}>Trove'a · v0.1.0 · MVP Phase 1</p>
    </div>
  );
}
