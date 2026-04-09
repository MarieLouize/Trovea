import { useState } from 'react';
import { Plus, Calendar, Clock, Lock, Edit2 } from 'lucide-react';
import type { AvailabilityWindow, Booking } from '@/lib/types';
import { FIXTURE_WINDOWS, FIXTURE_BOOKINGS } from '@/lib/fixtures';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { useUIStore } from '@/lib/store/ui.store';
import { useMerchantStore } from '@/lib/store/merchant.store';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import { formatCurrencyFull } from '@/lib/utils/format';
import styles from './SchedulePage.module.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWeekDays(): Date[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatScheduledAt(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date} at ${time}`;
}

function formatWindowRange(opensAt: string, closesAt: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
    const time = d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${date}, ${time}`;
  };
  return `${fmt(opensAt)} — ${fmt(closesAt)}`;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorkingHours {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  startTime: string;
  endTime: string;
}

const DAY_KEYS: (keyof WorkingHours)[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

const DEFAULT_HOURS: WorkingHours = {
  monday: false,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: true,
  sunday: false,
  startTime: '09:00',
  endTime: '18:00',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const st = useStoreType();
  const { addToast } = useUIStore();
  const merchant = useMerchantStore((s) => s.merchant);

  // ── State ──
  const [windows, setWindows] = useState<AvailabilityWindow[]>(FIXTURE_WINDOWS);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_HOURS);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  
  // Drawers
  const [hoursDrawerOpen, setHoursDrawerOpen] = useState(false);
  const [hoursForm, setHoursForm] = useState<WorkingHours>(DEFAULT_HOURS);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Bug 1 Fix: New Window State
  const [newWindowOpen, setNewWindowOpen] = useState(false);
  const [editingWindow, setEditingWindow] = useState<AvailabilityWindow | null>(null);
  const [windowForm, setWindowForm] = useState({
    label: '',
    opens_date: '',
    opens_time: '09:00',
    closes_date: '',
    closes_time: '23:00',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  // ── Computed ──
  const weekDays = getWeekDays();
  const today = new Date();

  const getBookingsForDay = (day: Date) =>
    FIXTURE_BOOKINGS.filter(
      (b) => isSameDay(new Date(b.scheduled_at), day) && b.status === 'confirmed'
    ).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  // ── Handlers ──
  const handleSaveHours = () => {
    setWorkingHours(hoursForm);
    addToast('Working hours updated', 'success');
    setHoursDrawerOpen(false);
  };

  const handleBlockOff = () => {
    const date = prompt('Enter date to block (YYYY-MM-DD):');
    if (date) {
      setBlockedDates(prev => [...prev, date]);
      addToast('Date blocked off', 'info');
    }
  };

  const handleCloseEarly = (id: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? { ...w, status: 'closed' as const, closes_at: new Date().toISOString() }
          : w
      )
    );
    addToast('Window closed', 'info');
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
  };

  // Bug 1 Fix: Window Handlers
  const openNewWindow = () => {
    setEditingWindow(null);
    setWindowForm({
      label: '',
      opens_date: '',
      opens_time: '09:00',
      closes_date: '',
      closes_time: '23:00',
      notes: '',
    });
    setFormErrors({});
    setNewWindowOpen(true);
  };

  const openEditWindow = (w: AvailabilityWindow) => {
    const openD = new Date(w.opens_at);
    const closeD = new Date(w.closes_at);
    
    setEditingWindow(w);
    setWindowForm({
      label: w.label,
      opens_date: openD.toISOString().split('T')[0],
      opens_time: openD.toTimeString().slice(0, 5),
      closes_date: closeD.toISOString().split('T')[0],
      closes_time: closeD.toTimeString().slice(0, 5),
      notes: w.notes || '',
    });
    setFormErrors({});
    setNewWindowOpen(true);
  };

  const handleWindowSubmit = () => {
    // Validation
    const errors: Record<string, boolean> = {};
    if (!windowForm.label) errors.label = true;
    if (!windowForm.opens_date) errors.opens_date = true;
    if (!windowForm.opens_time) errors.opens_time = true;
    if (!windowForm.closes_date) errors.closes_date = true;
    if (!windowForm.closes_time) errors.closes_time = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      addToast('Please fill all required fields', 'error');
      return;
    }

    if (!merchant) return;

    const opensAt = new Date(`${windowForm.opens_date}T${windowForm.opens_time}`).toISOString();
    const closesAt = new Date(`${windowForm.closes_date}T${windowForm.closes_time}`).toISOString();

    if (editingWindow) {
      setWindows(prev => prev.map(w => 
        w.id === editingWindow.id 
          ? { ...w, label: windowForm.label, opens_at: opensAt, closes_at: closesAt, notes: windowForm.notes || null }
          : w
      ));
      addToast('Window updated', 'success');
    } else {
      const newWindow: AvailabilityWindow = {
        id: `window-${Date.now()}`,
        merchant_id: merchant.id,
        label: windowForm.label,
        opens_at: opensAt,
        closes_at: closesAt,
        status: 'upcoming',
        total_orders: 0,
        notes: windowForm.notes || null,
      };
      setWindows(prev => [newWindow, ...prev]);
      addToast('Window created', 'success');
    }

    setNewWindowOpen(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: VENDOR (Window Management)
  // ═══════════════════════════════════════════════════════════════════════════
  if (st.isVendor) {
    const sortedWindows = [...windows].sort((a, b) => {
      const order = { open: 0, upcoming: 1, closed: 2 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return new Date(a.opens_at).getTime() - new Date(b.opens_at).getTime();
    });

    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Order Windows</h1>
          <button className={styles.primaryBtn} onClick={openNewWindow}>
            <Plus size={14} /> New Window
          </button>
        </div>

        <div className={styles.summaryStrip}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>{windows.filter(w => w.status === 'open').length}</span>
            <span className={styles.summaryLabel}>Open</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>{windows.filter(w => w.status === 'upcoming').length}</span>
            <span className={styles.summaryLabel}>Upcoming</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>
              {windows.filter(w => w.status === 'closed').reduce((sum, w) => sum + w.total_orders, 0)}
            </span>
            <span className={styles.summaryLabel}>Total Orders</span>
          </div>
        </div>

        <div className={styles.windowList}>
          {sortedWindows.map(w => (
            <div key={w.id} className={styles.windowCard}>
              <div className={styles.cardTopRow}>
                <span className={`${styles.statusBadge} ${
                  w.status === 'open' ? styles.statusBadgeOpen : 
                  w.status === 'upcoming' ? styles.statusBadgeUpcoming : 
                  styles.statusBadgeClosed
                }`}>
                  {w.status.toUpperCase()}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {w.status === 'upcoming' && (
                    <button 
                      className={styles.secondaryBtn} 
                      style={{ fontSize: 9, padding: '2px 8px' }}
                      onClick={() => openEditWindow(w)}
                    >
                      <Edit2 size={10} /> Edit
                    </button>
                  )}
                  {w.status === 'open' && (
                    <button className={styles.secondaryBtn} style={{ fontSize: 9, padding: '2px 8px' }} onClick={() => handleCloseEarly(w.id)}>
                      Close Early
                    </button>
                  )}
                </div>
              </div>
              <p className={styles.windowLabel} style={{ marginTop: 8, fontWeight: 600 }}>{w.label}</p>
              <p className={styles.windowRange} style={{ fontSize: 12, color: 'var(--color-fg-ghost)', marginTop: 2 }}>
                {formatWindowRange(w.opens_at, w.closes_at)}
              </p>
              <div className={styles.packageValue} style={{ marginTop: 12 }}>
                {w.total_orders} orders received
              </div>
            </div>
          ))}
        </div>

        {/* New/Edit Window Drawer */}
        <BaseDrawer
          open={newWindowOpen}
          onClose={() => setNewWindowOpen(false)}
          title={editingWindow ? 'Edit Window' : 'New Window'}
        >
          <div className={styles.drawerForm}>
            <div className={styles.drawerSection}>
              <label className={styles.drawerLabel}>Window Label *</label>
              <input
                className={`${styles.drawerInput} ${formErrors.label ? styles.error : ''}`}
                placeholder="e.g. Weekend Drop — 28 Jun"
                value={windowForm.label}
                onChange={(e) => setWindowForm(f => ({ ...f, label: e.target.value }))}
              />
              {formErrors.label && <span className={styles.errorText}>Required</span>}
            </div>

            <div className={styles.drawerRow} style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <div className={styles.drawerSection} style={{ flex: 1 }}>
                <label className={styles.drawerLabel}>Opens Date *</label>
                <input
                  className={`${styles.drawerInput} ${formErrors.opens_date ? styles.error : ''}`}
                  type="date"
                  value={windowForm.opens_date}
                  onChange={(e) => setWindowForm(f => ({ ...f, opens_date: e.target.value }))}
                />
              </div>
              <div className={styles.drawerSection} style={{ flex: 1 }}>
                <label className={styles.drawerLabel}>Opens Time *</label>
                <input
                  className={`${styles.drawerInput} ${formErrors.opens_time ? styles.error : ''}`}
                  type="time"
                  value={windowForm.opens_time}
                  onChange={(e) => setWindowForm(f => ({ ...f, opens_time: e.target.value }))}
                />
              </div>
            </div>

            <div className={styles.drawerRow} style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <div className={styles.drawerSection} style={{ flex: 1 }}>
                <label className={styles.drawerLabel}>Closes Date *</label>
                <input
                  className={`${styles.drawerInput} ${formErrors.closes_date ? styles.error : ''}`}
                  type="date"
                  value={windowForm.closes_date}
                  onChange={(e) => setWindowForm(f => ({ ...f, closes_date: e.target.value }))}
                />
              </div>
              <div className={styles.drawerSection} style={{ flex: 1 }}>
                <label className={styles.drawerLabel}>Closes Time *</label>
                <input
                  className={`${styles.drawerInput} ${formErrors.closes_time ? styles.error : ''}`}
                  type="time"
                  value={windowForm.closes_time}
                  onChange={(e) => setWindowForm(f => ({ ...f, closes_time: e.target.value }))}
                />
              </div>
            </div>

            <div className={styles.drawerSection}>
              <label className={styles.drawerLabel}>Notes (optional)</label>
              <textarea
                className={styles.drawerTextarea}
                rows={2}
                placeholder="Internal notes about this window..."
                value={windowForm.notes}
                onChange={(e) => setWindowForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <button className={styles.submitBtn} onClick={handleWindowSubmit}>
              {editingWindow ? 'Save Changes' : 'Create Window'}
            </button>
          </div>
        </BaseDrawer>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: HOST (Week View Schedule)
  // ═══════════════════════════════════════════════════════════════════════════
  if (st.isHost) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Schedule</h1>
          <button 
            className={styles.secondaryBtn} 
            onClick={() => { setHoursForm(workingHours); setHoursDrawerOpen(true); }}
          >
            <Clock size={14} /> Edit Hours
          </button>
        </div>

        {/* Week View Grid */}
        <div className={styles.weekGridWrapper}>
          <div className={styles.weekGrid}>
            {weekDays.map((day, i) => {
              const bookings = getBookingsForDay(day);
              const isToday = isSameDay(day, today);
              const isBlocked = blockedDates.includes(day.toISOString().split('T')[0]);
              
              return (
                <div key={i} className={styles.dayColumn}>
                  <div className={`${styles.dayHeader} ${isToday ? styles.dayHeaderToday : ''}`}>
                    <span className={styles.dayName}>{DAY_LABELS[DAY_KEYS[i]]}</span>
                    <span className={styles.dayNum}>{day.getDate()}</span>
                  </div>
                  <div className={`${styles.daySlots} ${isBlocked ? styles.blockOff : ''}`}>
                    {isBlocked ? (
                      <Lock size={12} color="var(--color-fg-ghost)" />
                    ) : bookings.length === 0 ? (
                      <span className={styles.dayEmpty}>—</span>
                    ) : (
                      bookings.map(b => (
                        <div key={b.id} className={styles.bookingBlock} onClick={() => handleBookingClick(b)}>
                          <span className={styles.slotTime}>{formatTime(b.scheduled_at)}</span>
                          <span className={styles.slotName}>
                            {b.service_name.includes('Lash') ? 'Lash' : 
                             b.service_name.includes('Brow') ? 'Brow' : 
                             b.service_name.includes('Refill') ? 'Refill' : 'Combo'}
                          </span>
                          <span className={styles.slotClient}>{b.buyer_name.split(' ')[0]}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button className={styles.blockOffLink} onClick={handleBlockOff}>
          + Block off a date
        </button>

        {/* Selected Booking Drawer */}
        <BaseDrawer
          open={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title="Booking Details"
        >
          {selectedBooking && (
            <div className={styles.drawerForm}>
              <div className={styles.drawerSection}>
                <span className={styles.drawerLabel}>Client</span>
                <p style={{ fontSize: 16, fontWeight: 500 }}>{selectedBooking.buyer_name}</p>
                <p style={{ fontSize: 13, color: 'var(--color-fg-muted)' }}>{selectedBooking.buyer_phone}</p>
              </div>
              <div className={styles.drawerSection}>
                <span className={styles.drawerLabel}>Service</span>
                <p style={{ fontSize: 15 }}>{selectedBooking.service_name}</p>
              </div>
              <div className={styles.drawerSection}>
                <span className={styles.drawerLabel}>Time</span>
                <p style={{ fontSize: 15 }}>{formatScheduledAt(selectedBooking.scheduled_at)}</p>
              </div>
              <div className={styles.drawerSection}>
                <span className={styles.drawerLabel}>Amount</span>
                <p style={{ fontSize: 15 }}>{formatCurrencyFull(selectedBooking.total_amount)}</p>
                <p style={{ fontSize: 12, color: 'var(--color-success-text)' }}>✓ {formatCurrencyFull(selectedBooking.deposit_paid)} deposit received</p>
              </div>
            </div>
          )}
        </BaseDrawer>

        {/* Working Hours Secondary Section */}
        <div className={styles.workingHoursSection}>
          <h2 className={styles.sectionTitle}>Standard Hours</h2>
          <div className={styles.workingHoursCard}>
            <div className={styles.workingHoursHeader}>
              <span className={styles.workingHoursTitle}>Available Times</span>
              <span className={styles.workingHoursTime}>
                {workingHours.startTime} — {workingHours.endTime}
              </span>
            </div>
            <div className={styles.workingDays}>
              {DAY_KEYS.map((key) => (
                <span
                  key={key as string}
                  className={`${styles.dayPill} ${workingHours[key] ? styles.dayPillActive : ''}`}
                >
                  {DAY_LABELS[key as string]}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Edit Hours Drawer */}
        <BaseDrawer
          open={hoursDrawerOpen}
          onClose={() => setHoursDrawerOpen(false)}
          title="Edit Working Hours"
        >
          <div className={styles.drawerForm}>
            <div className={styles.drawerSection}>
              <span className={styles.drawerLabel}>Working Days</span>
              <div className={styles.dayToggles}>
                {DAY_KEYS.map((key) => (
                  <button
                    key={key as string}
                    className={`${styles.dayToggleBtn} ${hoursForm[key] ? styles.dayToggleBtnActive : ''}`}
                    onClick={() => setHoursForm((f) => ({ ...f, [key]: !f[key] }))}
                  >
                    {DAY_LABELS[key as string]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.drawerRow} style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <div className={styles.drawerSection} style={{ flex: 1 }}>
                <label className={styles.drawerLabel}>Start Time</label>
                <input
                  className={styles.drawerInput}
                  type="time"
                  value={hoursForm.startTime}
                  onChange={(e) => setHoursForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div className={styles.drawerSection} style={{ flex: 1 }}>
                <label className={styles.drawerLabel}>End Time</label>
                <input
                  className={styles.drawerInput}
                  type="time"
                  value={hoursForm.endTime}
                  onChange={(e) => setHoursForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>

            <button className={styles.submitBtn} onClick={handleSaveHours}>
              Save Changes
            </button>
          </div>
        </BaseDrawer>
      </div>
    );
  }

  // ── Fallback ──
  return (
    <div className={styles.page}>
      <div className={styles.notAvailable}>
        <Calendar size={28} />
        <p>Schedule management not available for your store type.</p>
      </div>
    </div>
  );
}
