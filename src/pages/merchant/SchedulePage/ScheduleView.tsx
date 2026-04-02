import { useState } from 'react';
import { Plus, Calendar, Clock } from 'lucide-react';
import { m, AnimatePresence } from '@/lib/motion';
import type { AvailabilityWindow } from '@/lib/types';
import { FIXTURE_WINDOWS, FIXTURE_BOOKINGS } from '@/lib/fixtures';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { useUIStore } from '@/lib/store/ui.store';
import { formatCurrencyFull } from '@/lib/utils/format';
import { truncate } from '@/lib/utils/format';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
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

function formatWindowRange(opensAt: string, closesAt: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
    const time = d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${date}, ${time}`;
  };
  return `${fmt(opensAt)} — ${fmt(closesAt)}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatBookingDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// ─── Window form ─────────────────────────────────────────────────────────────

interface WindowForm {
  label: string;
  opensDate: string;
  opensTime: string;
  closesDate: string;
  closesTime: string;
  notes: string;
}

const EMPTY_WINDOW_FORM: WindowForm = {
  label: '',
  opensDate: '',
  opensTime: '',
  closesDate: '',
  closesTime: '',
  notes: '',
};

// ─── Working hours state ─────────────────────────────────────────────────────

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

  // ── Vendor state ──
  const [windows, setWindows] = useState<AvailabilityWindow[]>(FIXTURE_WINDOWS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [windowForm, setWindowForm] = useState<WindowForm>(EMPTY_WINDOW_FORM);

  // ── Host state ──
  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_HOURS);
  const [hoursDrawerOpen, setHoursDrawerOpen] = useState(false);
  const [hoursForm, setHoursForm] = useState<WorkingHours>(DEFAULT_HOURS);

  // ── Vendor: sorted windows ──
  const sortedWindows = [...windows].sort((a, b) => {
    const order = { open: 0, upcoming: 1, closed: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    if (a.status === 'closed') return new Date(b.closes_at).getTime() - new Date(a.closes_at).getTime();
    return new Date(a.opens_at).getTime() - new Date(b.opens_at).getTime();
  });

  const openCount = windows.filter((w) => w.status === 'open').length;
  const upcomingCount = windows.filter((w) => w.status === 'upcoming').length;
  const allTimeOrders = windows.filter((w) => w.status === 'closed').reduce((sum, w) => sum + w.total_orders, 0);

  const canSubmitWindow =
    windowForm.label.trim().length > 0 &&
    !!windowForm.opensDate &&
    !!windowForm.opensTime &&
    !!windowForm.closesDate &&
    !!windowForm.closesTime;

  const handleCreateWindow = () => {
    if (!canSubmitWindow) return;
    const opensAt = new Date(`${windowForm.opensDate}T${windowForm.opensTime}`).toISOString();
    const closesAt = new Date(`${windowForm.closesDate}T${windowForm.closesTime}`).toISOString();
    const now = new Date();
    const openTs = new Date(opensAt);
    const closeTs = new Date(closesAt);
    const status: AvailabilityWindow['status'] =
      now >= openTs && now <= closeTs ? 'open' : now < openTs ? 'upcoming' : 'closed';
    setWindows((prev) => [
      {
        id: `window-new-${Date.now()}`,
        merchant_id: 'merchant-002',
        label: windowForm.label.trim(),
        opens_at: opensAt,
        closes_at: closesAt,
        status,
        total_orders: 0,
        notes: windowForm.notes.trim() || null,
      },
      ...prev,
    ]);
    addToast('Window created!', 'success');
    setDrawerOpen(false);
    setWindowForm(EMPTY_WINDOW_FORM);
  };

  const handleCloseEarly = (id: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? { ...w, status: 'closed' as const, closes_at: new Date().toISOString() }
          : w
      )
    );
    addToast('Window closed.', 'info');
  };

  const handleSaveHours = () => {
    setWorkingHours(hoursForm);
    addToast('Hours updated!', 'success');
    setHoursDrawerOpen(false);
  };

  // ── Host: week grid ──
  const weekDays = getWeekDays();
  const today = new Date();

  const bookingsForDay = (day: Date) =>
    FIXTURE_BOOKINGS.filter(
      (b) => isSameDay(new Date(b.scheduled_at), day) && b.status !== 'cancelled'
    ).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const upcomingBookings = FIXTURE_BOOKINGS.filter(
    (b) => b.status === 'confirmed' || b.status === 'pending'
  )
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 5);

  // ── Not available fallback ──
  if (st.type !== 'vendor' && st.type !== 'host') {
    return (
      <div className={styles.page}>
        <div className={styles.notAvailable}>
          <Calendar size={28} />
          <p>Schedule is not available for your store type.</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VENDOR — Window Management
  // ═══════════════════════════════════════════════════════════════════════════
  if (st.type === 'vendor') {
    return (
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Schedule</h1>
          </div>
          <m.button
            className={styles.primaryBtn}
            onClick={() => setDrawerOpen(true)}
            aria-label="Create new window"
            whileTap={{ scale: 0.97 }}
          >
            <Plus size={14} aria-hidden="true" />
            New Window
          </m.button>
        </div>

        {/* Summary strip */}
        <div className={styles.summaryStrip}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>{openCount}</span>
            <span className={styles.summaryLabel}>Open</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>{upcomingCount}</span>
            <span className={styles.summaryLabel}>Upcoming</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>{allTimeOrders}</span>
            <span className={styles.summaryLabel}>All-time Orders</span>
          </div>
        </div>

        {/* Window list */}
        <div className={styles.windowList}>
          <AnimatePresence initial={false}>
            {sortedWindows.map((w, i) => (
              <m.div
                key={w.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className={styles.windowCard}
              >
                {/* Badge + label */}
                <div className={styles.windowCardTop}>
                  <span
                    className={
                      w.status === 'open'
                        ? `${styles.statusBadge} ${styles.statusBadgeOpen}`
                        : w.status === 'upcoming'
                        ? `${styles.statusBadge} ${styles.statusBadgeUpcoming}`
                        : `${styles.statusBadge} ${styles.statusBadgeClosed}`
                    }
                  >
                    {w.status.toUpperCase()}
                  </span>
                  {w.status === 'open' && (
                    <button
                      className={styles.closeEarlyBtn}
                      onClick={() => handleCloseEarly(w.id)}
                      aria-label={`Close ${w.label} early`}
                    >
                      Close Early
                    </button>
                  )}
                  {w.status === 'upcoming' && (
                    <m.button
                      className={styles.editWindowBtn}
                      aria-label={`Edit ${w.label}`}
                      whileTap={{ scale: 0.95 }}
                    >
                      Edit
                    </m.button>
                  )}
                </div>

                <p className={styles.windowLabel}>{w.label}</p>
                <p className={styles.windowRange}>{formatWindowRange(w.opens_at, w.closes_at)}</p>

                <div className={styles.windowFooter}>
                  <span
                    className={
                      w.status === 'closed' ? styles.windowOrdersAccent : styles.windowOrdersMuted
                    }
                  >
                    {w.total_orders} order{w.total_orders !== 1 ? 's' : ''}
                  </span>
                </div>

                {w.notes && (
                  <p className={styles.windowNotes}>{w.notes}</p>
                )}
              </m.div>
            ))}
          </AnimatePresence>
        </div>

        {/* New Window Drawer */}
        <BaseDrawer
          open={drawerOpen}
          onClose={() => { setDrawerOpen(false); setWindowForm(EMPTY_WINDOW_FORM); }}
          position="bottom"
          title="New Window"
        >
          <div className={styles.drawerForm}>
            <div className={styles.drawerSection}>
              <label className={styles.drawerLabel} htmlFor="win-label">Window Label</label>
              <input
                id="win-label"
                className={styles.drawerInput}
                type="text"
                placeholder="Weekend Drop — 28 Jun"
                value={windowForm.label}
                onChange={(e) => setWindowForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>

            <div className={styles.drawerSection}>
              <span className={styles.drawerLabel}>Opens</span>
              <div className={styles.drawerRow}>
                <input
                  className={styles.drawerInput}
                  type="date"
                  value={windowForm.opensDate}
                  onChange={(e) => setWindowForm((f) => ({ ...f, opensDate: e.target.value }))}
                  aria-label="Opens date"
                />
                <input
                  className={styles.drawerInput}
                  type="time"
                  value={windowForm.opensTime}
                  onChange={(e) => setWindowForm((f) => ({ ...f, opensTime: e.target.value }))}
                  aria-label="Opens time"
                />
              </div>
            </div>

            <div className={styles.drawerSection}>
              <span className={styles.drawerLabel}>Closes</span>
              <div className={styles.drawerRow}>
                <input
                  className={styles.drawerInput}
                  type="date"
                  value={windowForm.closesDate}
                  onChange={(e) => setWindowForm((f) => ({ ...f, closesDate: e.target.value }))}
                  aria-label="Closes date"
                />
                <input
                  className={styles.drawerInput}
                  type="time"
                  value={windowForm.closesTime}
                  onChange={(e) => setWindowForm((f) => ({ ...f, closesTime: e.target.value }))}
                  aria-label="Closes time"
                />
              </div>
            </div>

            <div className={styles.drawerSection}>
              <label className={styles.drawerLabel} htmlFor="win-notes">
                Notes <span className={styles.drawerLabelMuted}>(optional)</span>
              </label>
              <textarea
                id="win-notes"
                className={styles.drawerTextarea}
                placeholder="e.g. Jollof, fried rice. Pickup from 12pm."
                value={windowForm.notes}
                onChange={(e) => setWindowForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <m.button
              className={styles.submitBtn}
              onClick={handleCreateWindow}
              disabled={!canSubmitWindow}
              aria-label="Create window"
              whileTap={canSubmitWindow ? { scale: 0.98 } : {}}
            >
              Create Window
            </m.button>
          </div>
        </BaseDrawer>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOST — Calendar Availability
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Schedule</h1>
        </div>
        <m.button
          className={styles.secondaryBtn}
          onClick={() => { setHoursForm({ ...workingHours }); setHoursDrawerOpen(true); }}
          aria-label="Edit working hours"
          whileTap={{ scale: 0.97 }}
        >
          <Clock size={14} aria-hidden="true" />
          Edit Hours
        </m.button>
      </div>

      {/* Week grid */}
      <div className={styles.weekGridWrapper}>
        <div className={styles.weekGrid}>
          {weekDays.map((day, i) => {
            const dayBookings = bookingsForDay(day);
            const isToday = isSameDay(day, today);
            const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            return (
              <div key={i} className={styles.dayColumn}>
                <div className={`${styles.dayHeader} ${isToday ? styles.dayHeaderToday : ''}`}>
                  <span className={styles.dayName}>{dayNames[i]}</span>
                  <span className={styles.dayNum}>{day.getDate()}</span>
                </div>
                <div className={styles.daySlots}>
                  {dayBookings.length === 0 ? (
                    <span className={styles.dayEmpty}>—</span>
                  ) : (
                    dayBookings.map((b) => (
                      <div
                        key={b.id}
                        className={`${styles.bookingSlot} ${
                          b.status === 'pending' ? styles.bookingSlotPending : ''
                        }`}
                      >
                        <span
                          className={
                            b.status === 'confirmed'
                              ? `${styles.dot} ${styles.dotConfirmed}`
                              : b.status === 'pending'
                              ? `${styles.dot} ${styles.dotPending}`
                              : `${styles.dot} ${styles.dotCompleted}`
                          }
                        />
                        <span className={styles.slotName}>{truncate(b.service_name, 12)}</span>
                        <span className={styles.slotTime}>{formatTime(b.scheduled_at)}</span>
                        <span className={styles.slotDuration}>{formatDuration(b.duration_minutes)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Working Hours card */}
      <div className={styles.workingHoursCard}>
        <div className={styles.workingHoursHeader}>
          <span className={styles.workingHoursTitle}>Working Hours</span>
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

      {/* Upcoming appointments */}
      {upcomingBookings.length > 0 && (
        <div className={styles.upcomingSection}>
          <h2 className={styles.sectionTitle}>Upcoming</h2>
          <div className={styles.upcomingList}>
            {upcomingBookings.map((b) => (
              <div key={b.id} className={styles.upcomingRow}>
                <span
                  className={
                    b.status === 'confirmed'
                      ? `${styles.dot} ${styles.dotConfirmed}`
                      : `${styles.dot} ${styles.dotPending}`
                  }
                />
                <div className={styles.upcomingBody}>
                  <span className={styles.upcomingService}>{b.service_name}</span>
                  <span className={styles.upcomingBuyer}>{b.buyer_name}</span>
                </div>
                <div className={styles.upcomingRight}>
                  <span className={styles.upcomingDate}>{formatBookingDate(b.scheduled_at)}</span>
                  <span className={styles.upcomingTime}>{formatTime(b.scheduled_at)}</span>
                  <span className={styles.upcomingDuration}>{formatDuration(b.duration_minutes)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Hours Drawer */}
      <BaseDrawer
        open={hoursDrawerOpen}
        onClose={() => setHoursDrawerOpen(false)}
        position="bottom"
        title="Edit Hours"
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
                  aria-pressed={!!hoursForm[key]}
                  aria-label={DAY_LABELS[key as string]}
                >
                  {DAY_LABELS[key as string]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.drawerRow}>
            <div className={styles.drawerSection}>
              <label className={styles.drawerLabel} htmlFor="hours-start">Start Time</label>
              <input
                id="hours-start"
                className={styles.drawerInput}
                type="time"
                value={hoursForm.startTime}
                onChange={(e) => setHoursForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </div>
            <div className={styles.drawerSection}>
              <label className={styles.drawerLabel} htmlFor="hours-end">End Time</label>
              <input
                id="hours-end"
                className={styles.drawerInput}
                type="time"
                value={hoursForm.endTime}
                onChange={(e) => setHoursForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </div>
          </div>

          <m.button
            className={styles.submitBtn}
            onClick={handleSaveHours}
            aria-label="Save hours"
            whileTap={{ scale: 0.98 }}
          >
            Save Hours
          </m.button>
        </div>
      </BaseDrawer>
    </div>
  );
}
