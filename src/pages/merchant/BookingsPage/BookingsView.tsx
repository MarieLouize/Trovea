import { useState } from 'react';
import { CheckCircle, MessageCircle, Package } from 'lucide-react';
import { m, AnimatePresence } from '@/lib/motion';
import type { Booking } from '@/lib/types';
import { FIXTURE_BOOKINGS } from '@/lib/fixtures';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { useUIStore } from '@/lib/store/ui.store';
import { formatCurrencyFull, formatPhone } from '@/lib/utils/format';
import { buildStoreContactLink } from '@/lib/utils/whatsapp';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import styles from './BookingsPage.module.css';

// ─── Types & constants ───────────────────────────────────────────────────────

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

const TABS: { value: BookingStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatScheduledAt(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date} · ${time}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const st = useStoreType();
  const merchant = useMerchantStore((s) => s.merchant);
  const { addToast } = useUIStore();

  const [bookings, setBookings] = useState<Booking[]>(FIXTURE_BOOKINGS);
  const [activeTab, setActiveTab] = useState<BookingStatus>('pending');
  const [detailTarget, setDetailTarget] = useState<string | null>(null);

  const updateStatus = (id: string, status: BookingStatus) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
  };

  const handleConfirm = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateStatus(id, 'confirmed');
    addToast('Booking confirmed!', 'success');
  };

  const handleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateStatus(id, 'completed');
    addToast('Appointment marked complete', 'success');
  };

  const handleWhatsApp = (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = buildStoreContactLink(booking.buyer_phone, merchant.store_name);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const filtered = bookings.filter((b) => b.status === activeTab);
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  const detailBooking = detailTarget
    ? bookings.find((b) => b.id === detailTarget) ?? null
    : null;

  // ── Studio placeholder ──
  if (st.type === 'studio') {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Bookings</h1>
        </div>
        <div className={styles.studioPlaceholder}>
          <Package size={28} aria-hidden="true" />
          <p className={styles.studioPlaceholderText}>
            Enquiry management coming in a future update.
          </p>
        </div>
      </div>
    );
  }

  // ── Not available ──
  if (st.type !== 'host') {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Bookings</h1>
        </div>
        <div className={styles.studioPlaceholder}>
          <p className={styles.studioPlaceholderText}>
            Bookings are not available for your store type.
          </p>
        </div>
      </div>
    );
  }

  // ── Host bookings ──
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Bookings</h1>
        <span className={styles.bookingCount}>
          {bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending').length} upcoming
        </span>
      </div>

      {/* Tabs */}
      <div className={styles.tabs} role="tablist" aria-label="Filter bookings">
        {TABS.map((tab) => (
          <m.button
            key={tab.value}
            className={`${styles.tab} ${activeTab === tab.value ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.value)}
            role="tab"
            aria-selected={activeTab === tab.value}
            whileTap={{ scale: 0.95 }}
          >
            {tab.label}
            {tab.value === 'pending' && pendingCount > 0 && (
              <span className={styles.tabBadge}>{pendingCount}</span>
            )}
          </m.button>
        ))}
      </div>

      {/* Booking list */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState} role="status">
          <p className={styles.emptyText}>No {activeTab} bookings.</p>
        </div>
      ) : (
        <div className={styles.bookingList} role="list">
          <AnimatePresence initial={false}>
            {filtered.map((booking, i) => {
              const balanceDue = booking.total_amount - booking.deposit_paid;
              return (
                <m.div
                  key={booking.id}
                  role="listitem"
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  className={styles.bookingCard}
                  onClick={() => setDetailTarget(booking.id)}
                  tabIndex={0}
                  aria-label={`${booking.service_name} — ${booking.buyer_name}`}
                  onKeyDown={(e) => { if (e.key === 'Enter') setDetailTarget(booking.id); }}
                  whileTap={{ scale: 0.995 }}
                >
                  {/* Top row: status dot + service + amount */}
                  <div className={styles.cardTopRow}>
                    <span
                      className={
                        booking.status === 'confirmed'
                          ? `${styles.statusDot} ${styles.statusDotConfirmed}`
                          : booking.status === 'pending'
                          ? `${styles.statusDot} ${styles.statusDotPending}`
                          : booking.status === 'completed'
                          ? `${styles.statusDot} ${styles.statusDotCompleted}`
                          : `${styles.statusDot} ${styles.statusDotCancelled}`
                      }
                    />
                    <span className={styles.cardService}>{booking.service_name}</span>
                    <span className={styles.bookingAmount}>
                      {formatCurrencyFull(booking.total_amount)}
                    </span>
                  </div>

                  {/* Meta: buyer name + phone */}
                  <div className={styles.bookingMeta}>
                    <span className={styles.buyerName}>{booking.buyer_name}</span>
                    <span className={styles.buyerPhone}>{formatPhone(booking.buyer_phone)}</span>
                  </div>

                  {/* Time row */}
                  <div className={styles.bookingTime}>
                    {formatScheduledAt(booking.scheduled_at)} · {formatDuration(booking.duration_minutes)}
                  </div>

                  {/* Deposit note if any */}
                  {booking.deposit_paid > 0 && (
                    <div className={styles.depositNote}>
                      Deposit paid: {formatCurrencyFull(booking.deposit_paid)}
                      {balanceDue > 0 && (
                        <span className={styles.balanceDue}> · Balance: {formatCurrencyFull(balanceDue)}</span>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {booking.notes && (
                    <p className={styles.bookingNotes}>{booking.notes}</p>
                  )}

                  {/* Actions */}
                  {(booking.status === 'pending' || booking.status === 'confirmed') && (
                    <div className={styles.bookingActions}>
                      {booking.status === 'pending' && (
                        <m.button
                          className={styles.actionBtnPrimary}
                          onClick={(e) => handleConfirm(booking.id, e)}
                          aria-label={`Confirm booking for ${booking.buyer_name}`}
                          whileTap={{ scale: 0.96 }}
                        >
                          <CheckCircle size={13} aria-hidden="true" />
                          Confirm
                        </m.button>
                      )}
                      {booking.status === 'confirmed' && (
                        <m.button
                          className={styles.actionBtnSecondary}
                          onClick={(e) => handleComplete(booking.id, e)}
                          aria-label={`Mark ${booking.service_name} as complete`}
                          whileTap={{ scale: 0.96 }}
                        >
                          <CheckCircle size={13} aria-hidden="true" />
                          Mark Complete
                        </m.button>
                      )}
                      <m.button
                        className={styles.actionBtnWhatsApp}
                        onClick={(e) => handleWhatsApp(booking, e)}
                        aria-label={`WhatsApp ${booking.buyer_name}`}
                        whileTap={{ scale: 0.96 }}
                      >
                        <MessageCircle size={13} aria-hidden="true" />
                        WhatsApp
                      </m.button>
                    </div>
                  )}
                </m.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Booking detail drawer */}
      <BaseDrawer
        open={!!detailBooking}
        onClose={() => setDetailTarget(null)}
        position="bottom"
        title={detailBooking?.service_name ?? ''}
      >
        {detailBooking && (() => {
          const b = detailBooking;
          const balanceDue = b.total_amount - b.deposit_paid;
          return (
            <div className={styles.drawerDetail}>
              {/* Date / time / duration */}
              <div className={styles.drawerMeta}>
                <span className={styles.drawerMetaTime}>{formatScheduledAt(b.scheduled_at)}</span>
                <span className={styles.drawerMetaDuration}>{formatDuration(b.duration_minutes)}</span>
              </div>

              {/* Buyer */}
              <div className={styles.drawerBuyer}>
                <span className={styles.drawerBuyerName}>{b.buyer_name}</span>
                <a
                  href={`tel:${b.buyer_phone}`}
                  className={styles.drawerBuyerPhone}
                  onClick={(e) => e.stopPropagation()}
                >
                  {formatPhone(b.buyer_phone)}
                </a>
              </div>

              {/* Balance */}
              <div className={styles.drawerBalance}>
                <div className={styles.drawerBalanceRow}>
                  <span className={styles.drawerBalanceLabel}>Total</span>
                  <span className={styles.drawerBalanceAmount}>{formatCurrencyFull(b.total_amount)}</span>
                </div>
                <div className={styles.drawerBalanceRow}>
                  <span className={styles.drawerBalanceLabel}>Deposit Paid</span>
                  <span className={styles.drawerBalanceDeposit}>{formatCurrencyFull(b.deposit_paid)}</span>
                </div>
                {balanceDue > 0 && (
                  <div className={`${styles.drawerBalanceRow} ${styles.drawerBalanceRowDue}`}>
                    <span className={styles.drawerBalanceLabel}>Balance Due</span>
                    <span className={styles.drawerBalanceDue}>{formatCurrencyFull(balanceDue)}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {b.notes && (
                <div className={styles.drawerNotesBox}>
                  <span className={styles.drawerNotesLabel}>Note</span>
                  <p className={styles.drawerNotesText}>{b.notes}</p>
                </div>
              )}

              {/* Actions */}
              {(b.status === 'pending' || b.status === 'confirmed') && (
                <div className={styles.drawerActions}>
                  {b.status === 'pending' && (
                    <m.button
                      className={styles.actionBtnPrimary}
                      onClick={(e) => { handleConfirm(b.id, e); setDetailTarget(null); }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <CheckCircle size={14} aria-hidden="true" />
                      Confirm Booking
                    </m.button>
                  )}
                  {b.status === 'confirmed' && (
                    <m.button
                      className={styles.actionBtnSecondary}
                      onClick={(e) => { handleComplete(b.id, e); setDetailTarget(null); }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <CheckCircle size={14} aria-hidden="true" />
                      Mark Complete
                    </m.button>
                  )}
                  <m.button
                    className={styles.actionBtnWhatsApp}
                    onClick={(e) => handleWhatsApp(b, e)}
                    whileTap={{ scale: 0.97 }}
                  >
                    <MessageCircle size={14} aria-hidden="true" />
                    WhatsApp
                  </m.button>
                </div>
              )}
            </div>
          );
        })()}
      </BaseDrawer>
    </div>
  );
}
