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
import type { ClaimRequest } from '@/lib/types';
import { createClaim, uploadClaimProof } from '@/lib/api/claims.api';
import { formatCurrencyFull } from '@/lib/utils/format';
import { useUIStore } from '@/lib/store/ui.store';
import type { BasketItem } from '@/lib/store/basket.store';
import styles from './ClaimSheet.module.css';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ClaimSheetProps {
  open: boolean;
  onClose: () => void;
  product?: Product;
  basketItems?: BasketItem[];
  merchant: Merchant;
  variantLabel?: string | null;
  hasPendingClaim?: boolean;
  isDeposit?: boolean;
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
  basketItems,
  merchant,
  variantLabel,
  hasPendingClaim,
  isDeposit,
  onClaimSubmitted,
}: ClaimSheetProps) {
  const { addToast } = useUIStore();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>({
    buyerName: '', buyerPhone: '', buyerEmail: '', buyerNote: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [issuedClaimId, setIssuedClaimId] = useState('');

  const isDigital = merchant.store_type === 'digital_creator';
  const bank = merchant.bank_account;

  const items = basketItems || (product ? [{
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.images[0] ?? '',
    quantity: 1,
    variantLabel: variantLabel || undefined,
    // Add these for deposit calculation if needed
    deposit_amount: product.deposit_amount,
    deposit_pct: product.deposit_pct
  }] : []);

  const totalAmount = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  
  // Phase 3F: Deposit calculation
  const amountToTransfer = isDeposit && product
    ? (product.deposit_amount || (product.deposit_pct ? (product.price * (product.deposit_pct / 100)) : totalAmount))
    : totalAmount;

  const displayAmount = formatCurrencyFull(amountToTransfer);
  const balanceRemaining = totalAmount - amountToTransfer;

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
    const itemName = product?.name || items[0]?.name || 'item';
    const msg = `Hi ${merchant.store_name}! I'm interested in ${itemName} and would like to be on the waitlist if the current claim doesn't go through.`;
    const clean = merchant.whatsapp.replace(/[^0-9]/g, '');
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  })();

  // WhatsApp confirmation link after claim
  const whatsappConfirmLink = (() => {
    const lines = items.map((it, idx) => {
      const v = it.variantLabel ? ` [${it.variantLabel}]` : '';
      const q = it.quantity > 1 ? ` (x${it.quantity})` : '';
      return `${idx + 1}. ${it.name}${v}${q}`;
    }).join('\n');

    const header = isDeposit ? `*DEPOSIT CONFIRMATION: ${merchant.store_name}*` : `*CLAIM CONFIRMATION: ${merchant.store_name}*`;
    const footer = isDeposit 
      ? `I have paid the deposit of ${displayAmount}. Remaining balance: ${formatCurrencyFull(balanceRemaining)}. 🤝`
      : 'I have made the transfer. Please verify and confirm my claim. 🤝';

    const message = [
      header,
      '---',
      `Buyer: ${form.buyerName}`,
      `Paid: ${displayAmount}`,
      isDeposit ? `Remaining: ${formatCurrencyFull(balanceRemaining)}` : `Total: ${displayAmount}`,
      '',
      '*Items:*',
      lines,
      '',
      form.buyerNote ? `*Note:* ${form.buyerNote}\n` : '',
      `*Seal ID:* ${issuedClaimId}`,
      '',
      footer,
    ].join('\n');

    const clean = merchant.whatsapp.replace(/[^0-9]/g, '');
    return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  })();

  // Form submit
  const handleSubmit = async () => {
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

    setIsSubmitting(true);

    try {
      const hasApi = !!import.meta.env.VITE_API_URL;
      
      const claimData = {
        product_id: items[0].id,
        merchant_id: merchant.id,
        buyer_name: form.buyerName.trim(),
        buyer_phone: isDigital ? '' : form.buyerPhone.trim(),
        buyer_email: isDigital ? form.buyerEmail.trim() : null,
        buyer_note: form.buyerNote.trim() || null,
        status: 'pending',
      };

      let claim: ClaimRequest;

      if (hasApi) {
        claim = await createClaim(claimData);
        if (proofFile) {
          await uploadClaimProof(claim.id, proofFile);
        }
      } else {
        // Fallback
        claim = {
          ...claimData,
          id: `claim-mock-${Date.now()}`,
          proof_submitted: !!proofFile,
          proof_note: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        } as ClaimRequest;
      }

      onClaimSubmitted(claim);
      setIssuedClaimId(claim.id.slice(-8).toUpperCase()); // Short version for UI
      setStep(3);
    } catch (err) {
      console.error('Failed to submit claim:', err);
      addToast('Failed to submit claim. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
                    {hasPendingClaim ? 'Item Already Claimed' : isDeposit ? 'Booking Deposit' : (items.length > 1 ? 'Claim Your Items' : 'Complete Your Purchase')}
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
                      {/* Item(s) preview */}
                      <div className={styles.itemsList}>
                        {items.map((it) => (
                          <div key={it.id} className={styles.itemPreview}>
                            <div className={styles.itemThumb}>
                              <img
                                src={it.image || `https://picsum.photos/seed/${it.id}/80/80`}
                                alt={it.name}
                              />
                            </div>
                            <div className={styles.itemInfo}>
                              <p className={styles.itemName}>{it.name}</p>
                              {(it.variantLabel || it.quantity > 1) && (
                                <p className={styles.itemVariant}>
                                  {it.variantLabel}{it.variantLabel && it.quantity > 1 ? ' · ' : ''}
                                  {it.quantity > 1 ? `Qty: ${it.quantity}` : ''}
                                </p>
                              )}
                            </div>
                            <span className={styles.itemPrice}>{formatCurrencyFull(it.price * it.quantity)}</span>
                          </div>
                        ))}
                      </div>

                      <div className={styles.totalRow}>
                        <span>{isDeposit ? 'Deposit to Transfer' : 'Total to Transfer'}</span>
                        <span className={styles.totalValue}>{displayAmount}</span>
                      </div>

                      {isDeposit && balanceRemaining > 0 && (
                        <p className={styles.balanceNotice}>
                          Remaining {formatCurrencyFull(balanceRemaining)} due on project start.
                        </p>
                      )}

                      <div className={styles.divider} />

                      {/* Instructions */}
                      <p className={styles.instructionsHeading}>How to complete your {isDeposit ? 'booking' : 'purchase'}:</p>
                      <ol className={styles.instructionsList}>
                        <li>
                          <span className={styles.instructionStep}>1</span>
                          <div className={styles.instructionBody}>
                            <span>Transfer {displayAmount} to:</span>
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
                          <span className={styles.instructionBody}>Submit your details below to reserve {items.length > 1 ? 'these items' : 'this item'}.</span>
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
                    Fill in your details to reserve your order.
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

                    {/* Proof Upload (Phase 3D) */}
                    <div className={styles.formField}>
                      <label className={styles.formLabel} htmlFor="claim-proof">
                        Payment Proof <span className={styles.optional}>(screenshot)</span>
                      </label>
                      <div className={styles.fileUploadBox}>
                        <input
                          id="claim-proof"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                          className={styles.fileInput}
                        />
                        <div className={styles.fileDummy}>
                          {proofFile ? proofFile.name : 'Select screenshot...'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <m.button
                    className={`${styles.actionBtn} ${styles.btnPrimary}`}
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    whileTap={{ scale: 0.97 }}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Claim →'}
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
                  <h2 className={styles.confirmTitle}>
                    {isDeposit ? 'Deposit submitted!' : 'Claim submitted!'}
                  </h2>
                  <p className={styles.confirmBody}>
                    {isDeposit 
                      ? `Deposit for ${items[0].name} — ${displayAmount}. Remaining ${formatCurrencyFull(balanceRemaining)} due on project start.`
                      : 'Your order has been reserved for 24 hours while your payment is confirmed.'
                    }
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
