/**
 * Trovéa — HoldSheet (Phase 2M)
 * Bottom drawer: buyer-facing Hold flow.
 * 2 steps: Hold Request Form → Confirmation.
 * Opens a WhatsApp message to the seller on confirmation.
 */

import { useState, useCallback } from 'react';
import { MessageCircle, X, Clock } from 'lucide-react';
import { m, AnimatePresence, SPRING_UI } from '@/lib/motion';
import type { Product } from '@/lib/types/product.types';
import type { Merchant } from '@/lib/types/merchant.types';
import type { HoldRequest } from '@/lib/types';
import { useHoldStore } from '@/lib/store/hold.store';
import { buildStoreContactLink } from '@/lib/utils/whatsapp';
import { formatCurrencyFull } from '@/lib/utils/format';
import styles from './HoldSheet.module.css';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface HoldSheetProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  merchant: Merchant;
  hasActiveHold: boolean;
  onHoldCreated: (hold: HoldRequest) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Step = 1 | 2;

interface FormState {
  buyerName: string;
  buyerPhone: string;
  buyerNote: string;
}

interface FormErrors {
  buyerName?: string;
  buyerPhone?: string;
}

function formatExpiresAt(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString('en-NG', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function validatePhone(phone: string): boolean {
  const clean = phone.replace(/[\s\-()]/g, '');
  return clean.length >= 8 && /^[+0-9]/.test(clean);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HoldSheet({
  open,
  onClose,
  product,
  merchant,
  hasActiveHold,
  onHoldCreated,
}: HoldSheetProps) {
  const { addHold } = useHoldStore();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>({
    buyerName: '', buyerPhone: '', buyerNote: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedHold, setIssuedHold] = useState<HoldRequest | null>(null);

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setStep(1);
      setForm({ buyerName: '', buyerPhone: '', buyerNote: '' });
      setErrors({});
      setIssuedHold(null);
      setIsSubmitting(false);
    }, 300);
  }, [onClose]);

  const contactLink = buildStoreContactLink(merchant.whatsapp, merchant.store_name);

  const handleSubmit = async () => {
    const errs: FormErrors = {};
    if (!form.buyerName.trim() || form.buyerName.trim().length < 2) {
      errs.buyerName = 'Please enter your full name (at least 2 characters).';
    }
    if (!form.buyerPhone.trim() || !validatePhone(form.buyerPhone.trim())) {
      errs.buyerPhone = 'Please enter a valid WhatsApp number.';
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);

    // Generate key once here — stable across any retries this session
    const idempotencyKey = `hold:${product.id}:${form.buyerPhone.trim()}:${Date.now()}`;

    const holdData = {
      product_id:      product.id,
      merchant_id:     merchant.id,
      buyer_name:      form.buyerName.trim(),
      buyer_phone:     form.buyerPhone.trim(),
      buyer_note:      form.buyerNote.trim() || null,
      duration_hours:  merchant.hold_duration_hours as 2 | 6 | 12 | 24,
      idempotency_key: idempotencyKey,
    };

    const newHold = await addHold(holdData);

    if (newHold) {
      onHoldCreated(newHold);
      setIssuedHold(newHold);
      setStep(2);
    }
    setIsSubmitting(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            onClick={handleClose}
          />
          <m.div
            className={styles.sheet}
            initial={{ y: '100%' }}
            animate={{ y: 0, transition: SPRING_UI }}
            exit={{ y: '100%', transition: { duration: 0.25, ease: [0.4, 0, 1, 1] } }}
            role="dialog"
            aria-modal="true"
            aria-label="Hold Request"
          >
            <div className={styles.handle} />
            <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
              <X size={16} />
            </button>

            <AnimatePresence mode="wait">

              {/* ── Step 1 — Form (or conflict) ─────────────────────────────── */}
              {step === 1 && (
                <m.div
                  key="step1"
                  className={styles.stepContent}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0, transition: { duration: 0.22 } }}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.16 } }}
                >
                  {hasActiveHold ? (
                    /* ── Already held by another buyer ── */
                    <div className={styles.conflictState}>
                      <div className={styles.conflictIcon}>
                        <Clock size={22} />
                      </div>
                      <p className={styles.conflictHeading}>This item is currently on hold.</p>
                      <p className={styles.conflictBody}>
                        Another buyer has reserved this item. If their hold expires without
                        payment, it'll be available again.
                        Holds expire after {merchant.hold_duration_hours} hours.
                      </p>
                      <a
                        href={contactLink}
                        className={`${styles.actionBtn} ${styles.btnWhatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle size={15} />
                        Contact Seller
                      </a>
                      <button
                        className={`${styles.actionBtn} ${styles.btnSecondary}`}
                        onClick={handleClose}
                      >
                        Close
                      </button>
                    </div>

                  ) : (
                    /* ── Normal hold form ── */
                    <>
                      {/* Item preview */}
                      <div className={styles.itemPreview}>
                        <div className={styles.itemThumb}>
                          <img
                            src={product.images[0] ?? `https://picsum.photos/seed/${product.id}/80/80`}
                            alt={product.name}
                          />
                        </div>
                        <div className={styles.itemInfo}>
                          <p className={styles.itemName}>{product.name}</p>
                          <p className={styles.itemVariant}>Reserve for {merchant.hold_duration_hours}h</p>
                        </div>
                        <span className={styles.itemPrice}>
                          {formatCurrencyFull(product.price)}
                        </span>
                      </div>

                      <div className={styles.divider} />

                      <div className={styles.holdDuration}>
                        This item will be reserved for you for{' '}
                        <strong>{merchant.hold_duration_hours} hours</strong>.
                        After that, it's released back to the store if payment isn't confirmed.
                      </div>

                      <div className={styles.form}>
                        <div className={styles.formField}>
                          <label className={styles.formLabel} htmlFor="hold-name">
                            Your Name <span className={styles.required}>*</span>
                          </label>
                          <input
                            id="hold-name"
                            className={`${styles.formInput} ${errors.buyerName ? styles.formInputError : ''}`}
                            type="text"
                            placeholder="e.g. Adaeze Okonkwo"
                            value={form.buyerName}
                            onChange={(e) => {
                              setForm((f) => ({ ...f, buyerName: e.target.value }));
                              setErrors((err) => ({ ...err, buyerName: undefined }));
                            }}
                            autoComplete="name"
                          />
                          {errors.buyerName && (
                            <p className={styles.formError}>{errors.buyerName}</p>
                          )}
                        </div>

                        <div className={styles.formField}>
                          <label className={styles.formLabel} htmlFor="hold-phone">
                            WhatsApp Number <span className={styles.required}>*</span>
                          </label>
                          <input
                            id="hold-phone"
                            className={`${styles.formInput} ${errors.buyerPhone ? styles.formInputError : ''}`}
                            type="tel"
                            placeholder="08012345678"
                            value={form.buyerPhone}
                            onChange={(e) => {
                              setForm((f) => ({ ...f, buyerPhone: e.target.value }));
                              setErrors((err) => ({ ...err, buyerPhone: undefined }));
                            }}
                            autoComplete="tel"
                          />
                          {errors.buyerPhone && (
                            <p className={styles.formError}>{errors.buyerPhone}</p>
                          )}
                        </div>

                        <div className={styles.formField}>
                          <label className={styles.formLabel} htmlFor="hold-note">
                            Note <span className={styles.optional}>(optional)</span>
                          </label>
                          <textarea
                            id="hold-note"
                            className={styles.formTextarea}
                            placeholder="e.g. Getting paid tomorrow"
                            value={form.buyerNote}
                            onChange={(e) => setForm((f) => ({ ...f, buyerNote: e.target.value }))}
                            rows={3}
                          />
                        </div>
                      </div>

                      <m.button
                        className={`${styles.actionBtn} ${styles.btnPrimary}`}
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        whileTap={{ scale: 0.97 }}
                      >
                        {isSubmitting ? 'Reserving...' : 'Hold This Item →'}
                      </m.button>
                    </>
                  )}
                </m.div>
              )}

              {/* ── Step 2 — Confirmation ───────────────────────────────────── */}
              {step === 2 && issuedHold && (
                <m.div
                  key="step2"
                  className={styles.stepContent}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1, transition: { duration: 0.28 } }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                >
                  <div className={styles.confirmBadge} aria-hidden="true">
                    ⏳
                  </div>
                  <h2 className={styles.confirmTitle}>Item reserved!</h2>
                  <p className={styles.confirmBody}>
                    <strong>{product.name}</strong> is held for you for{' '}
                    {merchant.hold_duration_hours} hours.
                  </p>

                  <div className={styles.expiresAt}>
                    <span className={styles.expiresLabel}>Expires</span>
                    <span className={styles.expiresValue}>
                      {formatExpiresAt(issuedHold.expires_at)}
                    </span>
                  </div>

                  <p className={styles.confirmNote}>
                    To confirm your purchase, transfer{' '}
                    {formatCurrencyFull(product.price)} and let the seller know on WhatsApp.
                  </p>

                  <a
                    href={contactLink}
                    className={`${styles.actionBtn} ${styles.btnWhatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle size={15} />
                    Message the Seller
                  </a>
                  <button
                    className={`${styles.actionBtn} ${styles.btnSecondary}`}
                    onClick={handleClose}
                  >
                    Close
                  </button>
                </m.div>
              )}

            </AnimatePresence>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
