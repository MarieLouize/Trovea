import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, ShoppingBag, ArrowRight } from 'lucide-react';
import styles from './SelectRolePage.module.css';

type Role = 'curator' | 'buyer' | null;

const cardVariants = {
  initial: { opacity: 0, y: 28 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.12, ease: [0.25, 0.1, 0.25, 1] },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export default function SelectRolePage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Role>(null);

  const handleContinue = () => {
    if (!selected) return;
    if (selected === 'curator') {
      navigate('/onboarding/identity');
    } else {
      // Buyers go to storefront in Phase 2 — for mockup, go to auth
      navigate('/auth');
    }
  };

  const isFaded = (role: Role) => selected !== null && selected !== role;

  return (
    <div className={styles.root}>
      {/* Header */}
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <span className={styles.step}>Step 1 of 4</span>
        <h1 className={styles.headline}>How will you use<br />Trove'a?</h1>
        <p className={styles.subheadline}>Choose the path that fits your role.</p>
      </motion.div>

      {/* Portal Cards */}
      <div className={styles.cardsRow}>
        {/* Curator */}
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="initial"
          animate="animate"
          whileHover={!selected ? { y: -6, scale: 1.015 } : undefined}
          whileTap={{ scale: 0.98 }}
          className={styles.portalCard}
          data-faded={isFaded('curator')}
          data-selected={selected === 'curator'}
          onClick={() => setSelected('curator')}
          role="radio"
          aria-checked={selected === 'curator'}
          aria-label="I'm a Curator — I sell"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected('curator'); }}
          style={{ opacity: isFaded('curator') ? 0.45 : 1 }}
        >
          <AnimatePresence>
            {selected === 'curator' && (
              <motion.div
                className={`${styles.selectedRing} ${styles.curator}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                aria-hidden="true"
              />
            )}
          </AnimatePresence>

          <div className={`${styles.cardImageArea} ${styles.curator}`}>
            <motion.div
              className={`${styles.cardIconRing} ${styles.curator}`}
              animate={selected === 'curator' ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <Store size={36} aria-hidden="true" />
            </motion.div>
          </div>

          <div className={styles.cardBody}>
            <h2 className={styles.cardTitle}>I'm a Curator</h2>
            <p className={styles.cardDescription}>
              Run your store, manage inventory, issue receipts, and track every sale.
            </p>
            <span className={`${styles.cardCta} ${selected === 'curator' ? styles.curator : ''}`}>
              Open your archive
              <ArrowRight size={12} aria-hidden="true" />
            </span>
          </div>
        </motion.div>

        {/* Buyer */}
        <motion.div
          custom={1}
          variants={cardVariants}
          initial="initial"
          animate="animate"
          whileHover={!selected ? { y: -6, scale: 1.015 } : undefined}
          whileTap={{ scale: 0.98 }}
          className={styles.portalCard}
          data-faded={isFaded('buyer')}
          data-selected={selected === 'buyer'}
          onClick={() => setSelected('buyer')}
          role="radio"
          aria-checked={selected === 'buyer'}
          aria-label="I'm a Buyer — I shop"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected('buyer'); }}
          style={{ opacity: isFaded('buyer') ? 0.45 : 1 }}
        >
          <AnimatePresence>
            {selected === 'buyer' && (
              <motion.div
                className={`${styles.selectedRing} ${styles.buyer}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                aria-hidden="true"
              />
            )}
          </AnimatePresence>

          <div className={`${styles.cardImageArea} ${styles.buyer}`}>
            <motion.div
              className={`${styles.cardIconRing} ${styles.buyer}`}
              animate={selected === 'buyer' ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <ShoppingBag size={36} aria-hidden="true" />
            </motion.div>
          </div>

          <div className={styles.cardBody}>
            <h2 className={styles.cardTitle}>I'm a Buyer</h2>
            <p className={styles.cardDescription}>
              Browse curated stores, track your orders, and verify your receipts.
            </p>
            <span className={`${styles.cardCta} ${selected === 'buyer' ? styles.buyer : ''}`}>
              Browse storefronts
              <ArrowRight size={12} aria-hidden="true" />
            </span>
          </div>
        </motion.div>
      </div>

      {/* Continue */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selected ?? 'none'}
          className={styles.continueWrap}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {selected === null ? (
            <p className={styles.selectPrompt}>Select a path to continue</p>
          ) : (
            <button
              className={`${styles.continueBtn} ${selected === 'buyer' ? styles.continueBtnGold : ''}`}
              onClick={handleContinue}
              aria-label={`Continue as ${selected}`}
            >
              Continue as {selected === 'curator' ? 'Curator' : 'Buyer'}
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}