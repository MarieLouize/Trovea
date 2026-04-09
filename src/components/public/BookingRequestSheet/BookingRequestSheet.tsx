/**
 * Trove'a — BookingRequestSheet (Phase 3D)
 * Extracted slot picker drawer for Host services.
 * Steps: Date → Time → Confirm Details.
 */

import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { Product, Merchant } from '@/lib/types';
import { formatCurrencyFull, formatDate } from '@/lib/utils/format';
import { buildBookingRequestLink } from '@/lib/utils/whatsapp';
import { WORKING_HOURS, getAvailableDays, isSlotAvailable } from '@/lib/utils/host';
import { useUIStore } from '@/lib/store/ui.store';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import styles from './BookingRequestSheet.module.css';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BookingRequestSheetProps {
  open: boolean;
  onClose: () => void;
  service: Product;
  merchant: Merchant;
  preselectedDate?: string; // ISO date "YYYY-MM-DD"
  preselectedTime?: string; // "HH:MM am/pm"
}

type Step = 'date' | 'time' | 'confirm';

export default function BookingRequestSheet({
  open,
  onClose,
  service,
  merchant,
  preselectedDate,
  preselectedTime,
}: BookingRequestSheetProps) {
  const { addToast } = useUIStore();
  const [step, setStep] = useState<Step>('date');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '' });

  // Reset or initialize state
  useEffect(() => {
    if (open) {
      if (preselectedDate && preselectedTime) {
        setSelectedDate(preselectedDate);
        setSelectedTime(preselectedTime);
        setStep('confirm');
      } else if (preselectedDate) {
        setSelectedDate(preselectedDate);
        setStep('time');
      } else {
        setStep('date');
        setSelectedDate(null);
        setSelectedTime(null);
      }
    }
  }, [open, preselectedDate, preselectedTime]);

  const availableDays = useMemo(() => getAvailableDays(merchant.id), [merchant.id]);

  const calendarDays = useMemo(() => {
    const arr = [];
    const start = new Date();
    for (let i = 1; i <= 35; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = WORKING_HOURS.start; h < WORKING_HOURS.end; h++) {
      slots.push({ h, m: 0 });
      slots.push({ h, m: 30 });
    }
    return slots;
  }, []);

  const handleBookingRequest = () => {
    if (!form.name || !form.phone || !selectedDate || !selectedTime) {
      addToast('Please fill in all details.', 'error');
      return;
    }

    const deposit = service.deposit_amount ||
      (service.deposit_pct ? (service.price * (service.deposit_pct / 100)) : 0);

    const waLink = buildBookingRequestLink({
      phone: merchant.whatsapp,
      storeName: merchant.store_name,
      serviceName: service.name,
      date: formatDate(selectedDate, 'long'),
      time: selectedTime,
      deposit,
      buyerName: form.name,
    });

    window.open(waLink, '_blank', 'noopener,noreferrer');
    addToast(`Booking request sent. ${merchant.store_name} will confirm shortly.`, 'success');
    onClose();
  };

  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      title={service?.name || 'Book a Slot'}
    >
      <div className={styles.root}>
        {step === 'date' && (
          <div className={styles.slotStep}>
            <p className={styles.stepTitle}>Select a date</p>
            <div className={styles.calendar}>
              <div className={styles.calendarHeader}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
              </div>
              <div className={styles.calendarGrid}>
                {calendarDays.map((d, i) => {
                  const dateStr = d.toISOString().split('T')[0];
                  const isAvailable = availableDays.has(dateStr);
                  return (
                    <button
                      key={i}
                      className={`${styles.calendarDay} ${isAvailable ? styles.dayAvailable : ''} ${selectedDate === dateStr ? styles.daySelected : ''}`}
                      disabled={!isAvailable}
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setStep('time');
                      }}
                    >
                      <span className={styles.dayNum}>{d.getDate()}</span>
                      {isAvailable && <span className={styles.dot} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 'time' && (
          <div className={styles.slotStep}>
            <div className={styles.stepHeader}>
              <button onClick={() => setStep('date')} className={styles.backBtn}><ChevronLeft size={16} /></button>
              <p className={styles.stepTitle}>{selectedDate ? formatDate(selectedDate, 'long') : ''}</p>
            </div>
            <p className={styles.stepSub}>Available times for {service?.name} ({service?.duration} min)</p>
            <div className={styles.timeGrid}>
              {timeSlots.map(({ h, m }) => {
                const isAvailable = selectedDate ? isSlotAvailable(selectedDate, h, m, service?.duration || 60, merchant.id) : false;
                const timeLabel = h >= 12 
                  ? `${h === 12 ? 12 : h - 12}:${String(m).padStart(2, '0')} pm` 
                  : `${h}:${String(m).padStart(2, '0')} am`;
                
                return (
                  <button
                    key={`${h}-${m}`}
                    className={`${styles.timeBtn} ${!isAvailable ? styles.timeTaken : ''}`}
                    disabled={!isAvailable}
                    onClick={() => {
                      setSelectedTime(timeLabel);
                      setStep('confirm');
                    }}
                  >
                    {timeLabel}
                    {!isAvailable && <span className={styles.bookedLabel}>(booked)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className={styles.slotStep}>
            <div className={styles.stepHeader}>
              <button onClick={() => setStep('time')} className={styles.backBtn}><ChevronLeft size={16} /></button>
              <p className={styles.stepTitle}>Confirm Booking</p>
            </div>
            
            <div className={styles.confirmCard}>
              <p className={styles.confirmName}>{service.name}</p>
              <p className={styles.confirmMeta}>
                {selectedDate ? formatDate(selectedDate, 'long') : ''} · {selectedTime} · {service.duration} min
              </p>
              <div className={styles.confirmPrices}>
                <div className={styles.priceRow}>
                  <span>Deposit required</span>
                  <span>
                    {formatCurrencyFull(
                      service.deposit_amount || 
                      (service.deposit_pct ? (service.price * (service.deposit_pct / 100)) : 0)
                    )}
                  </span>
                </div>
                <div className={`${styles.priceRow} ${styles.priceTotal}`}>
                  <span>Total</span>
                  <span>{formatCurrencyFull(service.price)}</span>
                </div>
                <p className={styles.priceNotice}>(balance due at appointment)</p>
              </div>
            </div>

            <div className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Your name</label>
                <input 
                  className={styles.input}
                  type="text" 
                  placeholder="Adaeze Okonkwo" 
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>WhatsApp</label>
                <input 
                  className={styles.input}
                  type="tel" 
                  placeholder="080 1234 5678"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>

            <button className={styles.submitBtn} onClick={handleBookingRequest}>
              Request Booking
            </button>
          </div>
        )}
      </div>
    </BaseDrawer>
  );
}
