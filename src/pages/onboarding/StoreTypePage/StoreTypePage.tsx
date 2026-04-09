import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { m } from '@/lib/motion';
import type { StoreType } from '@/lib/types';
import { useOnboardingStore } from '@/lib/store/onboarding.store';
import styles from './StoreTypePage.module.css';

// ─── Store type definitions ────────────────────────────────────────────────

interface StoreTypeOption {
  type: StoreType;
  name: string;
  identity: string;
  signal: string;
}

const STORE_TYPE_OPTIONS: StoreTypeOption[] = [
  {
    type: 'collector',
    name: 'The Collector',
    identity: 'Curated pieces. Drop culture. Loyal buyers.',
    signal: 'PHYSICAL ITEMS · DROPS · CLAIM MODE',
  },
  {
    type: 'vendor',
    name: 'The Vendor',
    identity: 'Time-windowed drops. Capped orders. Events.',
    signal: 'WINDOWS · PRE-ORDERS · MENU CAPS',
  },
  {
    type: 'host',
    name: 'The Host',
    identity: 'Appointment-based. Slots, deposits, bookings.',
    signal: 'SERVICES · CALENDAR · DEPOSITS',
  },
  {
    type: 'digital_creator',
    name: 'The Digital Creator',
    identity: 'Instant delivery. Files, templates, presets.',
    signal: 'DIGITAL PRODUCTS · DOWNLOADS · FREE TIER',
  },
  {
    type: 'studio',
    name: 'The Studio',
    identity: 'Portfolio-first. Packages, quotes, projects.',
    signal: 'PACKAGES · ENQUIRIES · PORTFOLIOS',
  },
];

// ─── Animation variants ────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function StoreTypePage() {
  const navigate = useNavigate();
  const { setStoreType } = useOnboardingStore();
  const [selected, setSelected] = useState<StoreType | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    setStoreType(selected);
    navigate('/onboarding/setup-store');
  };

  return (
    <m.div
      className={styles.page}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* ── Header: back + progress ── */}
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => navigate('/onboarding/identity')}
          aria-label="Go back to identity"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>

        <div className={styles.progressWrap}>
          <div className={styles.progressMeta}>
            <span className={styles.progressStep}>Step 3 of 5</span>
            <span className={styles.progressStep}>Store Type</span>
          </div>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuenow={60}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <m.div
              className={styles.progressFill}
              initial={{ width: '40%' }}
              animate={{ width: '60%' }}
              transition={{ duration: 0.6, ease: [0.34, 1.2, 0.64, 1] }}
            />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className={styles.content}>
        <div className={styles.headingBlock}>
          <h1 className={styles.heading}>What kind of store are you building?</h1>
          <p className={styles.subheading}>
            This shapes your Command Surface. You can't change it later.
          </p>
        </div>

        {/* Card list with stagger */}
        <m.div
          className={styles.cardList}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          role="radiogroup"
          aria-label="Select store type"
        >
          {STORE_TYPE_OPTIONS.map((option) => {
            const isSelected = selected === option.type;
            return (
              <m.button
                key={option.type}
                className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
                variants={cardVariants}
                whileTap={{ scale: 0.985 }}
                onClick={() => setSelected(option.type)}
                role="radio"
                aria-checked={isSelected}
                aria-label={`${option.name} — ${option.identity}`}
              >
                <div className={styles.cardNoise} aria-hidden="true" />
                <div className={styles.cardInner}>
                  <div className={`${styles.dot} ${isSelected ? styles.dotSelected : ''}`} aria-hidden="true" />
                  <div className={styles.cardText}>
                    <span className={styles.cardName}>{option.name}</span>
                    <span className={styles.cardIdentity}>{option.identity}</span>
                    <span className={styles.cardSignal}>{option.signal}</span>
                  </div>
                </div>
              </m.button>
            );
          })}
        </m.div>
      </div>

      {/* ── Footer CTA ── */}
      <div className={styles.footer}>
        <button
          className={`${styles.cta} ${!selected ? styles.ctaDisabled : ''}`}
          onClick={handleContinue}
          disabled={!selected}
          aria-label={selected ? 'Continue to store setup' : 'Select a store type to continue'}
        >
          Continue
        </button>
      </div>
    </m.div>
  );
}
