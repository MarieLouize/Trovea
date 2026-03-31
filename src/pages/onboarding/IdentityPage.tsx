import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Camera } from 'lucide-react';
import styles from './IdentityPage.module.css';

export default function IdentityPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const isValid = displayName.trim().length >= 2 && whatsapp.trim().length >= 10;

  const handleContinue = () => {
    if (!isValid) return;
    navigate('/onboarding/store-type');
  };

  return (
    <div className={styles.root}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className={styles.cardInner}>
          {/* Progress */}
          <div className={styles.progressBar}>
            <div className={styles.progressMeta}>
              <span className={styles.progressStep}>Step 2 of 5</span>
              <span className={styles.progressStep}>Identity</span>
            </div>
            <div className={styles.progressTrack} role="progressbar" aria-valuenow={40} aria-valuemin={0} aria-valuemax={100}>
              <motion.div
                className={styles.progressFill}
                initial={{ width: '20%' }}
                animate={{ width: '40%' }}
                transition={{ duration: 0.6, ease: [0.34, 1.2, 0.64, 1] }}
              />
            </div>
          </div>

          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.headline}>Tell us about yourself</h1>
            <p className={styles.subtext}>
              Your display name and WhatsApp number are how buyers find and contact you.
            </p>
          </div>

          {/* Avatar placeholder */}
          <div className={styles.avatarSection}>
            <div
              className={styles.avatarRing}
              role="button"
              aria-label="Upload profile photo"
              tabIndex={0}
            >
              <div style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(145deg, var(--color-surface-raised), var(--color-surface-inset))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-fg-ghost)',
              }}>
                <Camera size={22} aria-hidden="true" />
              </div>
              <div className={styles.avatarOverlay} aria-hidden="true">
                <Camera size={18} />
              </div>
            </div>
            <div className={styles.avatarInfo}>
              <span className={styles.avatarLabel}>Profile Photo</span>
              <p className={styles.avatarHint}>
                Optional. Shown on your storefront and receipts.
              </p>
            </div>
          </div>

          {/* Fields */}
          <div className={styles.fields}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="display-name">
                Your Name
              </label>
              <input
                id="display-name"
                className={styles.input}
                type="text"
                placeholder="Tola Adeyemi"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                autoFocus
                aria-label="Your display name"
                aria-required="true"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="whatsapp">
                WhatsApp Number
              </label>
              <input
                id="whatsapp"
                className={styles.input}
                type="tel"
                placeholder="+234 801 234 5678"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                autoComplete="tel"
                aria-label="WhatsApp phone number"
                aria-required="true"
              />
              <span className={styles.fieldHint}>
                Used for Chat-to-Buy links. Never shown publicly without your permission.
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              className={styles.continueBtn}
              onClick={handleContinue}
              disabled={!isValid}
              aria-label="Continue to store setup"
            >
              Continue
              <ArrowRight size={14} aria-hidden="true" />
            </button>
            <Link to="/onboarding/select-role" className={styles.backLink} aria-label="Go back to role selection">
              <ArrowLeft size={12} aria-hidden="true" />
              Back
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}