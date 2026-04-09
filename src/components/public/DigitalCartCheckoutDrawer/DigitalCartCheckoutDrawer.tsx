/**
 * Trove'a — DigitalCartCheckoutDrawer (Phase 3E)
 * Unified checkout flow for Digital Creator bags.
 * Steps: Summary (Items + Bank) → Details (Email) → Confirmation.
 */

import { useState, useMemo } from 'react';
import { ChevronLeft, Check } from 'lucide-react';
import { m, AnimatePresence } from '@/lib/motion';
import type { Merchant } from '@/lib/types';
import type { BasketItem } from '@/lib/store/basket.store';
import { formatCurrencyFull } from '@/lib/utils/format';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import styles from './DigitalCartCheckoutDrawer.module.css';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DigitalCartCheckoutDrawerProps {
  open: boolean;
  onClose: () => void;
  items: BasketItem[];
  merchant: Merchant;
  onComplete: () => void;
}

type Step = 'summary' | 'details' | 'confirmation';

export default function DigitalCartCheckoutDrawer({
  open,
  onClose,
  items,
  merchant,
  onComplete,
}: DigitalCartCheckoutDrawerProps) {
  const [step, setStep] = useState<Step>('summary');
  const [form, setForm] = useState({ name: '', email: '', reference: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const total = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);
  const isAllFree = total === 0;

  const handleNext = () => {
    if (step === 'summary') {
      setStep('details');
    } else if (step === 'details') {
      const errs: Record<string, string> = {};
      if (!form.name.trim()) errs.name = 'Please enter your name';
      if (!form.email.trim() || !form.email.includes('@')) errs.email = 'Please enter a valid email';
      
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }

      if (!isAllFree) {
        // Build WhatsApp message for proof (Phase 3E pattern)
        const message = [
          `*DIGITAL ORDER: ${merchant.store_name}*`,
          '---',
          `Buyer: ${form.name}`,
          `Email: ${form.email}`,
          '',
          '*Items:*',
          ...items.map((it, idx) => `${idx + 1}. ${it.name} — ${formatCurrencyFull(it.price)}`),
          '',
          `Total: ${formatCurrencyFull(total)}`,
          form.reference ? `Ref: ${form.reference}` : '',
          '',
          'I have made the transfer for these tools. 🚀',
        ].filter(Boolean).join('\n');

        const cleanPhone = merchant.whatsapp.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
      }

      setStep('confirmation');
    }
  };

  const handleDone = () => {
    onComplete();
    onClose();
    // Reset for next time
    setTimeout(() => {
      setStep('summary');
      setForm({ name: '', email: '', reference: '' });
      setErrors({});
    }, 300);
  };

  const bank = merchant.bank_account;

  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      title={isAllFree ? 'Get Free Tools' : 'Checkout Bag'}
    >
      <div className={styles.root}>
        <AnimatePresence mode="wait">
          {/* ── STEP 1: SUMMARY ── */}
          {step === 'summary' && (
            <m.div
              key="summary"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className={styles.step}
            >
              <div className={styles.itemsList}>
                {items.map((item) => (
                  <div key={item.id} className={styles.itemRow}>
                    <img src={item.image} alt="" className={styles.itemThumb} />
                    <div className={styles.itemInfo}>
                      <p className={styles.itemName}>{item.name}</p>
                      <p className={styles.itemPrice}>
                        {item.price === 0 ? <span className={styles.freeLabel}>FREE</span> : formatCurrencyFull(item.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {!isAllFree && (
                <div className={styles.paymentBox}>
                  <p className={styles.paymentHeading}>Total to Transfer</p>
                  <p className={styles.totalAmount}>{formatCurrencyFull(total)}</p>
                  
                  {bank && (
                    <div className={styles.bankCard}>
                      <div className={styles.bankRow}>
                        <span>{bank.bank_name}</span>
                        <span className={styles.bankAccount}>{bank.account_number}</span>
                      </div>
                      <p className={styles.accountName}>{bank.account_name}</p>
                    </div>
                  )}
                  <p className={styles.paymentNote}>
                    Transfer the total above to the account details provided to unlock your downloads.
                  </p>
                </div>
              )}

              <button className={styles.primaryBtn} onClick={handleNext}>
                {isAllFree ? 'Get My Files →' : "I've Paid — Continue →"}
              </button>
            </m.div>
          )}

          {/* ── STEP 2: DETAILS ── */}
          {step === 'details' && (
            <m.div
              key="details"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className={styles.step}
            >
              <button className={styles.backBtn} onClick={() => setStep('summary')}>
                <ChevronLeft size={16} /> Back to summary
              </button>

              <h2 className={styles.stepTitle}>Where should we send your files?</h2>
              <p className={styles.stepSub}>Your download links will arrive at this email address.</p>

              <div className={styles.form}>
                <div className={styles.field}>
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Femi Kuti"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={errors.name ? styles.inputError : ''}
                  />
                  {errors.name && <span className={styles.errorText}>{errors.name}</span>}
                </div>

                <div className={styles.field}>
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={errors.email ? styles.inputError : ''}
                  />
                  {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                </div>

                {!isAllFree && (
                  <div className={styles.field}>
                    <label>Transfer Reference (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Session ID or Name"
                      value={form.reference}
                      onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <button className={styles.primaryBtn} onClick={handleNext}>
                {isAllFree ? 'Send Me the Files →' : 'Submit Payment Proof →'}
              </button>
            </m.div>
          )}

          {/* ── STEP 3: CONFIRMATION ── */}
          {step === 'confirmation' && (
            <m.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={styles.stepCenter}
            >
              <div className={styles.successIcon}>
                <Check size={32} />
              </div>
              <h2 className={styles.confirmTitle}>
                {isAllFree ? 'Success!' : 'Request Received'}
              </h2>
              <p className={styles.confirmText}>
                {isAllFree 
                  ? `We've sent your free tools to ${form.email}. They should arrive in a few seconds!`
                  : `Your request is in. ${merchant.store_name} will verify your payment and send your files to ${form.email} shortly.`
                }
              </p>
              
              <button className={styles.primaryBtn} onClick={handleDone}>
                Done
              </button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </BaseDrawer>
  );
}
