import { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, Lock, Edit2, Trash2 } from 'lucide-react';
import type { AvailabilityWindow, Booking } from '@/lib/types';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { useUIStore } from '@/lib/store/ui.store';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { 
  getBookingsByMerchant, 
  getWindowsByMerchant, 
  createWindow as apiCreateWindow, 
  updateWindow as apiUpdateWindow,
  deleteWindow as apiDeleteWindow,
} from '@/lib/api/bookings.api';
import BaseDrawer from '@/components/ui/BaseDrawer/BaseDrawer';
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
  const setMerchant = useMerchantStore((s) => s.setMerchant);

  // Derive initial working hours from merchant.working_hours
  const merchantToWorkingHours = (): WorkingHours => {
    const wh = merchant.working_hours;
    if (!wh) return DEFAULT_HOURS;
    const days = wh.days;
    const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
    return {
      monday:    days.includes(1),
      tuesday:   days.includes(2),
      wednesday: days.includes(3),
      thursday:  days.includes(4),
      friday:    days.includes(5),
      saturday:  days.includes(6),
      sunday:    days.includes(0),
      startTime: pad(wh.start),
      endTime:   pad(wh.end),
    };
  };

  // ── State ──
  const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(merchantToWorkingHours);
  const [blockedDates, setBlockedDates] = useState<string[]>(merchant.blocked_dates ?? []);
  
  // Phase 3E: Initial data load
  useEffect(() => {
    const loadData = async () => {
      const hasApi = !!import.meta.env.VITE_API_URL;
      if (!hasApi) {
        // Fallback to fixtures if no API
        const { FIXTURE_WINDOWS, FIXTURE_BOOKINGS } = await import('@/lib/fixtures');
        setWindows(FIXTURE_WINDOWS);
        setBookings(FIXTURE_BOOKINGS);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [w, b] = await Promise.all([
          getWindowsByMerchant(),
          getBookingsByMerchant()
        ]);
        setWindows(w);
        setBookings(b);
      } catch (err) {
        console.error('Failed to load schedule data:', err);
        addToast('Failed to load schedule', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [addToast]);

  // Drawers
  const [hoursDrawerOpen, setHoursDrawerOpen] = useState(false);
  const [hoursForm, setHoursForm] = useState<WorkingHours>(DEFAULT_HOURS);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  const [newWindowOpen, setNewWindowOpen] = useState(false);
  const [editingWindow, setEditingWindow] = useState<AvailabilityWindow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
    bookings.filter(
      (b) => isSameDay(new Date(b.scheduled_at), day) && b.status === 'confirmed'
    ).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  // ── Helpers ──
  const workingHoursToDays = (wh: WorkingHours): number[] => {
    const map: [keyof WorkingHours, number][] = [
      ['sunday', 0], ['monday', 1], ['tuesday', 2], ['wednesday', 3],
      ['thursday', 4], ['friday', 5], ['saturday', 6],
    ];
    return map.filter(([k]) => wh[k]).map(([, v]) => v);
  };

  // ── Handlers ──
  const handleSaveHours = () => {
    setWorkingHours(hoursForm);
    // Persist to merchant store so TerminalPage + StorefrontPage see it
    const days = workingHoursToDays(hoursForm);
    const start = parseInt(hoursForm.startTime.split(':')[0], 10);
    const end = parseInt(hoursForm.endTime.split(':')[0], 10);
    setMerchant({ ...merchant, working_hours: { start, end, days } });
    addToast('Working hours updated', 'success');
    setHoursDrawerOpen(false);
  };

  const handleBlockOff = () => {
    const date = prompt('Enter date to block (YYYY-MM-DD):');
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const next = [...blockedDates, date];
      setBlockedDates(next);
      setMerchant({ ...merchant, blocked_dates: next });
      addToast('Date blocked off', 'info');
    } else if (date) {
      addToast('Use format YYYY-MM-DD', 'error');
    }
  };

  const handleCloseEarly = async (id: string) => {
    const hasApi = !!import.meta.env.VITE_API_URL;
    const now = new Date().toISOString();

    // Optimistic
    setWindows(prev => prev.map(w => w.id === id ? { ...w, status: 'closed', closes_at: now } : w));

    if (hasApi) {
      try {
        await apiUpdateWindow(id, { status: 'closed', closes_at: now });
        addToast('Window closed early', 'info');
      } catch (err) {
        addToast('Failed to close window', 'error');
      }
    }
  };

  const handleDeleteWindow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this upcoming window?')) return;
    
    const hasApi = !!import.meta.env.VITE_API_URL;
    
    // Optimistic
    setWindows(prev => prev.filter(w => w.id !== id));

    if (hasApi) {
      try {
        await apiDeleteWindow(id);
        addToast('Window deleted', 'info');
      } catch (err) {
        addToast('Failed to delete window', 'error');
      }
    }
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
  };

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

  const handleWindowSubmit = async () => {
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
    
    const hasApi = !!import.meta.env.VITE_API_URL;
    setIsSaving(true);

    try {
      if (editingWindow) {
        const updates = { label: windowForm.label, opens_at: opensAt, closes_at: closesAt, notes: windowForm.notes || null };
        if (hasApi) {
          const updated = await apiUpdateWindow(editingWindow.id, updates);
          setWindows(prev => prev.map(w => w.id === editingWindow.id ? updated : w));
        } else {
          setWindows(prev => prev.map(w => w.id === editingWindow.id ? { ...w, ...updates } : w));
        }
        addToast('Window updated', 'success');
      } else {
        if (hasApi) {
          const created = await apiCreateWindow({
            merchant_id: merchant.id,
            label: windowForm.label,
            opens_at: opensAt,
            closes_at: closesAt,
            notes: windowForm.notes || null,
            status: 'upcoming',
            total_orders: 0
          });
          setWindows(prev => [created, ...prev]);
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
        }
        addToast('Window created', 'success');
      }
      setNewWindowOpen(false);
    } catch (err) {
      addToast('Failed to save window', 'error');
    } finally {
      setIsSaving(false);
    }
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
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        className={styles.secondaryBtn} 
                        style={{ fontSize: 9, padding: '2px 8px' }}
                        onClick={() => openEditWindow(w)}
                      >
                        <Edit2 size={10} /> Edit
                      </button>
                      <button 
                        className={styles.secondaryBtn} 
                        style={{ fontSize: 9, padding: '2px 8px', color: 'var(--color-danger)' }}
                        onClick={() => handleDeleteWindow(w.id)}
                      >
                        <Trash2 size={10} /> Delete
                      </button>
                    </div>
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
