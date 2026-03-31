/**
 * Trove'a — ClaimSheet (Phase 2L)
 * Bottom drawer: Trovéa Checkout claim flow for buyers.
 * 3 internal steps: Instructions → Buyer Details → Confirmation.
 */

import { useState, useCallback } from 'react';
import { Copy, MessageCircle, Check, X } from 'lucide-react';
import { m, AnimatePresence, SPRING_UI } from '@/lib/motion';
import type { Product } from '@/lib/types/product.types';
import type { Merchant } from '@/lib/types/merchant.types';
import type { ClaimRequest } from '@/lib/types/store-config.types';
import { buildClaimConfirmLink } from '@/lib/utils/whatsapp';
import { formatCurrencyFull } from '@/lib/utils/format';
import { useUIStore } from '@/lib/store/ui.store';
import styles from './ClaimSheet.module.css';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ClaimSheetProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  merchant: Merchant;
  variantLabel?: string | null;
  hasPendingClaim: boolean;
  onClaimSubmitted: (claim: ClaimRequest) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomSealSuffix(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

type Step = 1 | 2 | 3;

interface FormState {
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  buyerNote: string;
}

interface FormErrors {
  buyerName?: string;
  buyerContact?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClaimSheet({
  open,
  onClose,
  product,
  merchant,
  variantLabel,
  hasPendingClaim,
  onClaimSubmitted,
}: ClaimSheetProps) {
  const { addToast } = useUIStore();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>({
    buyerName: '', buyerPhone: '', buyerEmail: '', buyerNote: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [issuedClaimId, setIssuedClaimId] = useState('');

  const isDigital = merchant.store_type === 'digital_creator';
  const bank = merchant.bank_account;

  // Reset on open/close
  const handleClose = useCallback(() => {
    onClose();
    // Reset after animation
    setTimeout(() => {
      setStep(1);
      setForm({ buyerName: '', buyerPhone: '', buyerEmail: '', buyerNote: '' });
      setErrors({});
      setIssuedClaimId('');
    }, 300);
  }, [onClose]);

  // Copy account number
  const handleCopyAccount = () => {
    if (!bank) return;
    navigator.clipboard.writeText(bank.account_number).then(() => {
      addToast('Account number copied.', 'success');
    }).catch(() => {
      addToast('Could not copy. Please copy manually.', 'error');
    });
  };

  // WhatsApp waitlist link for conflicted items
  const waitlistLink = (() => {
    const msg = `Hi ${merchant.store_name}! I'm interested in ${product.name} and would like to be on the waitlist if the current claim doesn't go through.`;
    const clean = merchant.whatsapp.replace(/[^0-9]/g, '');
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  })();

  // WhatsApp confirmation link after claim
  const whatsappConfirmLink = buildClaimConfirmLink({
    phone: merchant.whatsapp,
    itemName: product.name,
    price: product.price,
    storeName: merchant.store_name,
  });

  // Form submit
  const handleSubmit = () => {
    const errs: FormErrors = {};
    if (!form.buyerName.trim() || form.buyerName.trim().length < 2) {
      errs.buyerName = 'Please enter your full name (at least 2 characters).';
    }
    if (isDigital) {
      if (!form.buyerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.buyerEmail.trim())) {
        errs.buyerContact = 'Please enter a valid email address.';
      }
    } else {
      if (!form.buyerPhone.trim() || form.buyerPhone.trim().length < 8) {
        errs.buyerContact = 'Please enter a valid WhatsApp number.';
      }
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const now = new Date().toISOString();
    const suffix = randomSealSuffix();
    const claimId = `TRV-CLAIM-${suffix}`;
    const newClaim: ClaimRequest = {
      id: `claim-live-${Date.now()}`,
      product_id: product.id,
      merchant_id: merchant.id,
      buyer_name: form.buyerName.trim(),
      buyer_phone: isDigital ? '' : form.buyerPhone.trim(),
      buyer_email: isDigital ? form.buyerEmail.trim() : null,
      buyer_note: form.buyerNote.trim() || null,
      proof_submitted: false,
      proof_note: null,
      status: 'pending',
      created_at: now,
      updated_at: now,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    onClaimSubmitted(newClaim);
    setIssuedClaimId(claimId);
    setStep(3);
  };

  // Determine CTA label per store type
  const ctaLabel = (() => {
    if (merchant.store_type === 'vendor') return 'Claim Pre-order';
    if (merchant.store_type === 'host' || merchant.store_type === 'studio') return 'Book & Pay Deposit';
    return 'Claim This Piece';
  })();

  const displayPrice = variantLabel
    ? formatCurrencyFull(product.price)
    : formatCurrencyFull(product.price);

  // ── Backdrop ────────────────────────────────────────────────────────────────
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
            aria-label="Trovéa Checkout"
          >
            {/* Handle + Close */}
            <div className={styles.handle} />
            <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
              <X size={16} />
            </button>

            {/* ── Step 1 — Instructions ─────────────────────────────────────── */}
            <AnimatePresence mode="wait">
              {step === 1 && (
                <m.div
                  key="step1"
                  className={styles.stepContent}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0, transition: { duration: 0.22 } }}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.16 } }}
                >
                  <p className={styles.stepLabel}>Trovéa Checkout — Step 1 of 3</p>
                  <h2 className={styles.stepTitle}>
                    {hasPendingClaim ? 'Item Already Claimed' : 'Complete Your Purchase'}
                  </h2>

                  {/* ── Pending claim conflict ── */}
                  {hasPendingClaim ? (
                    <div className={styles.conflictState}>
                      <div className={styles.conflictIcon}>!</div>
                      <p className={styles.conflictHeading}>This item already has a pending claim.</p>
                      <p className={styles.conflictBody}>
                        Another buyer has reserved this item. If their payment isn't confirmed
                        within 24 hours, it will become available again.
                      </p>
                      <a
                        href={waitlistLink}
                        className={`${styles.actionBtn} ${styles.btnWhatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle size={15} />
                        Join Waitlist via WhatsApp
                      </a>
                      <button className={`${styles.actionBtn} ${styles.btnSecondary}`} onClick={handleClose}>
                        Close
                      </button>
                    </div>
                  ) : !bank ? (
                    /* ── No bank account configured ── */
                    <div className={styles.conflictState}>
                      <div className={styles.conflictIcon}>?</div>
                      <p className={styles.conflictHeading}>Bank details not configured.</p>
                      <p className={styles.conflictBody}>
                        This seller hasn't set up bank transfer details yet. Contact them directly on WhatsApp to complete your purchase.
                      </p>
                      <a
                        href={whatsappConfirmLink}
                        className={`${styles.actionBtn} ${styles.btnWhatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle size={15} />
                        Contact Seller on WhatsApp
                      </a>
                      <button className={`${styles.actionBtn} ${styles.btnSecondary}`} onClick={handleClose}>
                        Close
                      </button>
                    </div>
                  ) : (
                    /* ── Normal flow ── */
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
                          {variantLabel && <p className={styles.itemVariant}>{variantLabel}</p>}
                        </div>
                        <span className={styles.itemPrice}>{displayPrice}</span>
                      </div>

                      <div className={styles.divider} />

                      {/* Instructions */}
                      <p className={styles.instructionsHeading}>How to complete your purchase:</p>
                      <ol className={styles.instructionsList}>
                        <li>
                          <span className={styles.instructionStep}>1</span>
                          <div className={styles.instructionBody}>
                            <span>Transfer {displayPrice} to:</span>
                            <div className={styles.bankDetails}>
                              <div className={styles.bankRow}>
                                <span className={styles.bankLabel}>Account Name</span>
                                <span className={styles.bankValue}>{bank.account_name}</span>
                              </div>
                              <div className={styles.bankRow}>
                                <span className={styles.bankLabel}>Bank</span>
                                <span className={styles.bankValue}>{bank.bank_name}</span>
                              </div>
                              <div className={styles.bankRow}>
                                <span className={styles.bankLabel}>Account No.</span>
                                <div className={styles.bankValueRow}>
                                  <span className={styles.bankValueMono}>{bank.account_number}</span>
                                  <m.button
                                    className={styles.copyBtn}
                                    onClick={handleCopyAccount}
                                    aria-label="Copy account number"
                                    whileTap={{ scale: 0.93 }}
                                  >
                                    <Copy size={11} />
                                    Copy
                                  </m.button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                        <li>
                          <span className={styles.instructionStep}>2</span>
                          <span className={styles.instructionBody}>Take a screenshot of your transfer confirmation.</span>
                        </li>
                        <li>
                          <span className={styles.instructionStep}>3</span>
                          <span className={styles.instructionBody}>Submit your details below to reserve this item.</span>
                        </li>
                      </ol>

                      <m.button
                        className={`${styles.actionBtn} ${styles.btnPrimary}`}
                        onClick={() => setStep(2)}
                        whileTap={{ scale: 0.97 }}
                      >
                        Continue →
                      </m.button>
                    </>
                  )}
                </m.div>
              )}

              {/* ── Step 2 — Buyer Details ──────────────────────────────────── */}
              {step === 2 && (
                <m.div
                  key="step2"
                  className={styles.stepContent}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0, transition: { duration: 0.22 } }}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.16 } }}
                >
                  <p className={styles.stepLabel}>Trovéa Checkout — Step 2 of 3</p>
                  <h2 className={styles.stepTitle}>Your Details</h2>
                  <p className={styles.stepSubtitle}>
                    Fill in your details to reserve {product.name}.
                  </p>

                  <div className={styles.form}>
                    {/* Name */}
                    <div className={styles.formField}>
                      <label className={styles.formLabel} htmlFor="claim-name">
                        Your Name <span className={styles.required}>*</span>
                      </label>
                      <input
                        id="claim-name"
                        className={`${styles.formInput} ${errors.buyerName ? styles.formInputError : ''}`}
                        type="text"
                        placeholder="e.g. Adaeze Okonkwo"
                        value={form.buyerName}
                        onChange={(e) => { setForm((f) => ({ ...f, buyerName: e.target.value })); setErrors((err) => ({ ...err, buyerName: undefined })); }}
                        autoComplete="name"
                      />
                      {errors.buyerName && <p className={styles.formError}>{errors.buyerName}</p>}
                    </div>

                    {/* Phone (non-digital) or Email (digital) */}
                    {isDigital ? (
                      <div className={styles.formField}>
                        <label className={styles.formLabel} htmlFor="claim-email">
                          Email Address <span className={styles.required}>*</span>
                        </label>
                        <input
                          id="claim-email"
                          className={`${styles.formInput} ${errors.buyerContact ? styles.formInputError : ''}`}
                          type="email"
                          placeholder="you@email.com"
                          value={form.buyerEmail}
                          onChange={(e) => { setForm((f) => ({ ...f, buyerEmail: e.target.value })); setErrors((err) => ({ ...err, buyerContact: undefined })); }}
                          autoComplete="email"
                        />
                        {errors.buyerContact && <p className={styles.formError}>{errors.buyerContact}</p>}
                      </div>
                    ) : (
                      <div className={styles.formField}>
                        <label className={styles.formLabel} htmlFor="claim-phone">
                          WhatsApp Number <span className={styles.required}>*</span>
                        </label>
                        <input
                          id="claim-phone"
                          className={`${styles.formInput} ${errors.buyerContact ? styles.formInputError : ''}`}
                          type="tel"
                          placeholder="08012345678"
                          value={form.buyerPhone}
                          onChange={(e) => { setForm((f) => ({ ...f, buyerPhone: e.target.value })); setErrors((err) => ({ ...err, buyerContact: undefined })); }}
                          autoComplete="tel"
                        />
                        {errors.buyerContact && <p className={styles.formError}>{errors.buyerContact}</p>}
                      </div>
                    )}

                    {/* Note */}
                    <div className={styles.formField}>
                      <label className={styles.formLabel} htmlFor="claim-note">
                        Note <span className={styles.optional}>(optional)</span>
                      </label>
                      <textarea
                        id="claim-note"
                        className={styles.formTextarea}
                        placeholder="e.g. I've sent the transfer"
                        value={form.buyerNote}
                        onChange={(e) => setForm((f) => ({ ...f, buyerNote: e.target.value }))}
                        rows={3}
                      />
                    </div>
                  </div>

                  <m.button
                    className={`${styles.actionBtn} ${styles.btnPrimary}`}
                    onClick={handleSubmit}
                    whileTap={{ scale: 0.97 }}
                  >
                    Submit Claim →
                  </m.button>
                  <button
                    className={`${styles.actionBtn} ${styles.btnSecondary}`}
                    onClick={() => setStep(1)}
                  >
                    ← Back
                  </button>
                </m.div>
              )}

              {/* ── Step 3 — Confirmation ───────────────────────────────────── */}
              {step === 3 && (
                <m.div
                  key="step3"
                  className={styles.stepContent}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1, transition: { duration: 0.28 } }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                >
                  <div className={styles.confirmBadge} aria-hidden="true">
                    <Check size={22} />
                  </div>
                  <h2 className={styles.confirmTitle}>Claim submitted!</h2>
                  <p className={styles.confirmBody}>
                    <strong>{product.name}</strong> has been reserved for 24 hours while your
                    payment is confirmed.
                  </p>

                  <div className={styles.sealRow}>
                    <span className={styles.sealLabel}>Seal ID</span>
                    <span className={styles.sealId}>{issuedClaimId}</span>
                  </div>

                  <p className={styles.confirmNote}>
                    The seller will contact you on {isDigital ? 'Email' : 'WhatsApp'} to confirm.
                  </p>

                  <a
                    href={whatsappConfirmLink}
                    className={`${styles.actionBtn} ${styles.btnWhatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle size={15} />
                    WhatsApp the Seller
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
