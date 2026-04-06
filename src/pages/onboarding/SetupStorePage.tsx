import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { m } from '@/lib/motion';
import { ArrowLeft, ArrowRight, Check, X, Loader } from 'lucide-react';
import { useOnboardingStore } from '@/lib/store/onboarding.store';
import { db } from '@/lib/db';
import styles from './SetupStorePage.module.css';

type HandleState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function SetupStorePage() {
  const navigate = useNavigate();
  const { setStoreDetails } = useOnboardingStore();
  const [storeName, setStoreName] = useState('');
  const [handle, setHandle] = useState('');
  const [handleState, setHandleState] = useState<HandleState>('idle');
  const [bio, setBio] = useState('');
  const [storeOpen, setStoreOpen] = useState(true);
  const [checkTimer, setCheckTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const checkHandle = useCallback((value: string) => {
    const cleaned = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
    setHandle(cleaned);

    if (cleaned.length < 3) {
      setHandleState(cleaned.length === 0 ? 'idle' : 'invalid');
      return;
    }

    if (!/^[a-z0-9_-]+$/.test(cleaned)) {
      setHandleState('invalid');
      return;
    }

    setHandleState('checking');
    if (checkTimer) clearTimeout(checkTimer);

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await db
          .from('merchants')
          .select('id')
          .eq('handle', cleaned)
          .maybeSingle();

        if (error) throw error;
        setHandleState(data ? 'taken' : 'available');
      } catch (err) {
        console.error('Handle check failed:', err);
        setHandleState('available');
      }
    }, 500);
    setCheckTimer(timer);
  }, [checkTimer]);

  const isValid =
    storeName.trim().length >= 2 &&
    handle.length >= 3 &&
    handleState === 'available';

  const handleContinue = () => {
    if (!isValid) return;
    setStoreDetails(storeName, handle, bio);
    navigate('/onboarding/first-item');
  };

  const handleStatusIcon = () => {
    switch (handleState) {
      case 'checking':
        return <Loader size={14} style={{ color: 'var(--color-fg-ghost)', animation: 'spin 0.65s linear infinite' }} aria-label="Checking availability" />;
      case 'available':
        return <Check size={14} style={{ color: 'var(--color-success)' }} aria-label="Handle is available" />;
      case 'taken':
        return <X size={14} style={{ color: 'var(--color-accent)' }} aria-label="Handle is taken" />;
      case 'invalid':
        return <X size={14} style={{ color: 'var(--color-accent)' }} aria-label="Invalid handle format" />;
      default:
        return null;
    }
  };

  const handleHint = () => {
    switch (handleState) {
      case 'available': return { text: `trovea.store/${handle} is yours!`, error: false };
      case 'taken': return { text: 'This handle is already taken.', error: true };
      case 'invalid': return { text: 'Lowercase letters, numbers, hyphens, and underscores only. Min 3 chars.', error: true };
      default: return { text: 'Your public store URL: trovea.store/yourhandle', error: false };
    }
  };

  const hint = handleHint();

  return (
    <div className={styles.root}>
      <m.div
        className={styles.card}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className={styles.cardInner}>
          {/* Progress */}
          <div className={styles.progressBar}>
            <div className={styles.progressMeta}>
              <span className={styles.progressStep}>Step 4 of 5</span>
              <span className={styles.progressStep}>Your Store</span>
            </div>
            <div className={styles.progressTrack} role="progressbar" aria-valuenow={80} aria-valuemin={0} aria-valuemax={100}>
              <m.div
                className={styles.progressFill}
                initial={{ width: '60%' }}
                animate={{ width: '80%' }}
                transition={{ duration: 0.6, ease: [0.34, 1.2, 0.64, 1] }}
              />
            </div>
          </div>

          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.headline}>Name your store</h1>
            <p className={styles.subtext}>
              Your store name and handle are permanent. Choose with care.
            </p>
          </div>

          {/* Fields */}
          <div className={styles.fields}>
            {/* Store name */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="store-name">
                Store Name
              </label>
              <input
                id="store-name"
                className={styles.input}
                type="text"
                placeholder="Tola's Archive"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                autoFocus
                autoComplete="off"
                aria-label="Store name"
                aria-required="true"
              />
            </div>

            {/* Handle */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="store-handle">
                Store Handle
              </label>
              <div className={styles.handleWrap}>
                <span className={styles.handlePrefix} aria-hidden="true">trovea.store/</span>
                <input
                  id="store-handle"
                  className={styles.handleInput}
                  type="text"
                  placeholder="yourhandle"
                  value={handle}
                  onChange={(e) => checkHandle(e.target.value)}
                  autoComplete="off"
                  aria-label="Store handle"
                  aria-required="true"
                  aria-describedby="handle-hint"
                  spellCheck={false}
                />
                <div className={styles.handleStatus} aria-live="polite">
                  {handleStatusIcon()}
                </div>
              </div>
              <span
                id="handle-hint"
                className={hint.error ? styles.fieldError : styles.fieldHint}
              >
                {hint.text}
              </span>
            </div>

            {/* Bio */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="store-bio">
                Store Bio <span style={{ color: 'var(--color-fg-ghost)', fontFamily: 'var(--font-sans)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <textarea
                id="store-bio"
                className={styles.textarea}
                placeholder="Curated thrift & vintage finds. New bales weekly."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={280}
                aria-label="Store bio"
              />
              <span className={styles.fieldHint}>{bio.length}/280 characters</span>
            </div>

            {/* Store open toggle */}
            <div
              className={styles.toggleRow}
              onClick={() => setStoreOpen((v) => !v)}
              role="switch"
              aria-checked={storeOpen}
              aria-label="Store is open"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setStoreOpen((v) => !v); }}
            >
              <div>
                <div className={styles.toggleLabel}>Store is Open</div>
                <div className={styles.toggleSub}>
                  {storeOpen ? 'Buyers can view and request items.' : 'Your store will be hidden from buyers.'}
                </div>
              </div>
              <div className={`${styles.toggleControl} ${storeOpen ? styles.on : ''}`} aria-hidden="true">
                <div className={styles.toggleThumb} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              className={styles.continueBtn}
              onClick={handleContinue}
              disabled={!isValid}
              aria-label="Continue to add first item"
            >
              Continue
              <ArrowRight size={14} aria-hidden="true" />
            </button>
            <Link to="/onboarding/identity" className={styles.backLink} aria-label="Go back to identity">
              <ArrowLeft size={12} aria-hidden="true" />
              Back
            </Link>
          </div>
        </div>
      </m.div>
    </div>
  );
}
