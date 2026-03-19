/**
 * Trove'a — SubmitReceiptPage (Phase 1E Upgrade)
 * Buyer-facing claim flow. Warm, clear, animated success state.
 * Buyers submitting payment proof are in an anxious moment — make it reassuring.
 */
 
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, MessageCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { FIXTURE_PRODUCTS, FIXTURE_MERCHANT } from '@/lib/fixtures';
import { formatCurrencyFull } from '@/lib/utils/format';
import { buildClaimConfirmLink } from '@/lib/utils/whatsapp';
import { m, AnimatePresence, scalePop, slideUp } from '@/lib/motion';
import { usePaletteTheme } from '@/lib/hooks/usePaletteTheme';
import styles from './SubmitReceiptPage.module.css';

export default function SubmitReceiptPage() {
  const { intent_id } = useParams<{ intent_id: string }>();

  const [buyerName,  setBuyerName]  = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerNote,  setBuyerNote]  = useState('');
  const [submitted,  setSubmitted]  = useState(false);

  const product = FIXTURE_PRODUCTS.find(
    (p) => p.id === intent_id || intent_id?.startsWith(p.id)
  );

  const handleSubmit = () => {
    if (!buyerName.trim()) return;
    setSubmitted(true);
  };

  const whatsappLink = buildClaimConfirmLink({
    phone:     FIXTURE_MERCHANT.whatsapp,
    itemName:  product?.name ?? 'Item',
    price:     product?.price ?? 0,
    storeName: FIXTURE_MERCHANT.store_name,
  });

  const { paletteId, isDark } = usePaletteTheme(FIXTURE_MERCHANT.store_config?.palette);

  return (
    <div className={`sf-themed ${styles.page}`} data-palette={paletteId} data-dark={isDark}>
      {/* Brand nav */}
      <div className={styles.brandBar}>
        <Link
          to={`/store/${FIXTURE_MERCHANT.handle}`}
          className={styles.backBtn}
          aria-label="Back to store"
        >
          <ArrowLeft size={15} />
          {FIXTURE_MERCHANT.store_name}
        </Link>
      </div>

      <AnimatePresence mode="wait">
        {submitted ? (
          /* ── SUCCESS STATE ── */
          <m.div
            key="success"
            className={styles.card}
            {...scalePop}
          >
            <div className={styles.successContent}>
              <m.div
                className={styles.successRing}
                initial={{ scale: 0 }}
                animate={{ scale: 1, transition: { delay: 0.1, type: 'spring', stiffness: 300, damping: 22 } }}
              >
                <CheckCircle size={40} strokeWidth={1.5} />
              </m.div>

              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.25, duration: 0.4 } }}
                className={styles.successText}
              >
                <p className={styles.successTitle}>Claim submitted</p>
                <p className={styles.successSub}>
                  {FIXTURE_MERCHANT.store_name} has received your request
                  {product ? ` for "${product.name}"` : ''}. They'll confirm via WhatsApp shortly.
                </p>
              </m.div>

              <m.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.4, duration: 0.35 } }}
                className={styles.successActions}
              >
                <a
                  href={whatsappLink}
                  className={styles.whatsappBtn}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={14} />
                  Follow up on WhatsApp
                </a>
                <Link
                  to={`/store/${FIXTURE_MERCHANT.handle}`}
                  className={styles.backToStore}
                >
                  ← Back to store
                </Link>
              </m.div>

              {/* Trust note */}
              <m.div
                className={styles.trustNote}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.55 } }}
              >
                <ShieldCheck size={12} />
                Your details are only shared with {FIXTURE_MERCHANT.store_name}.
              </m.div>
            </div>
          </m.div>
        ) : (
          /* ── FORM STATE ── */
          <m.div
            key="form"
            className={styles.card}
            {...slideUp}
          >
            {/* Product preview */}
            {product && (
              <div className={styles.itemPreview}>
                {product.images[0] && (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className={styles.itemPreviewImg}
                  />
                )}
                <div className={styles.itemPreviewInfo}>
                  <p className={styles.itemPreviewLabel}>Claiming</p>
                  <p className={styles.itemPreviewName}>{product.name}</p>
                  <p className={styles.itemPreviewPrice}>{formatCurrencyFull(product.price)}</p>
                </div>
              </div>
            )}

            <div className={styles.cardHeader}>
              <h1 className={styles.title}>
                {product ? 'Complete your claim' : 'Submit your details'}
              </h1>
              <p className={styles.subtitle}>
                Fill in your details below and the seller will confirm your order via WhatsApp.
              </p>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor="buyerName">Your Name *</label>
                <input
                  id="buyerName"
                  className={styles.formInput}
                  type="text"
                  placeholder="e.g. Adaeze Okonkwo"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor="buyerPhone">WhatsApp Number</label>
                <input
                  id="buyerPhone"
                  className={styles.formInput}
                  type="tel"
                  placeholder="+234 or 080..."
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor="buyerNote">Note (optional)</label>
                <textarea
                  id="buyerNote"
                  className={`${styles.formInput} ${styles.formTextarea}`}
                  placeholder="Any message for the seller…"
                  value={buyerNote}
                  onChange={(e) => setBuyerNote(e.target.value)}
                  rows={3}
                />
              </div>

              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={!buyerName.trim()}
              >
                Submit Claim
              </button>

              <div className={styles.trustNote}>
                <ShieldCheck size={12} />
                Your details are only shared with {FIXTURE_MERCHANT.store_name}.
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <p className={styles.poweredBy}>
        Powered by{' '}
        <Link to="/auth" className={styles.poweredByLink}>Trove'a</Link>
      </p>
    </div>
  );
}