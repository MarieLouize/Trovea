import type { Booking } from '../types';

export const WORKING_HOURS = { start: 9, end: 18 };

export const getNextAvailableDate = (merchantId: string, bookings: Booking[]): string | null => {
  const workingDays = [2, 3, 4, 5, 6]; // Tue–Sat
  const today = new Date();
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (!workingDays.includes(d.getDay())) continue;
    const dateStr = d.toISOString().split('T')[0];
    const bookedCount = bookings.filter(b => {
      const bDate = b.scheduled_at.split('T')[0];
      return b.merchant_id === merchantId && bDate === dateStr && b.status !== 'cancelled';
    }).length;
    if (bookedCount < 8) return d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return null;
};

export const getAvailableDays = (merchantId: string, bookings: Booking[]): Set<string> => {
  const workingDays = [2, 3, 4, 5, 6];
  const available = new Set<string>();
  const today = new Date();
  for (let i = 1; i <= 42; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (!workingDays.includes(d.getDay())) continue;
    const dateStr = d.toISOString().split('T')[0];
    const bookedCount = bookings.filter(b => {
      const bDate = b.scheduled_at.split('T')[0];
      return b.merchant_id === merchantId && bDate === dateStr && b.status !== 'cancelled';
    }).length;
    if (bookedCount < 8) available.add(dateStr);
  }
  return available;
};

export const isSlotAvailable = (
  dateStr: string,
  hour: number,
  minute: number,
  duration: number,
  merchantId: string,
  bookings: Booking[]
): boolean => {
  const slotStart = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`).getTime();
  const slotEnd = slotStart + (duration * 60000);

  const dayEnd = new Date(`${dateStr}T${WORKING_HOURS.end}:00:00`).getTime();
  if (slotEnd > dayEnd) return false;

  return !bookings.some(b => {
    if (b.merchant_id !== merchantId || b.status === 'cancelled') return false;
    if (!b.scheduled_at.startsWith(dateStr)) return false;
    
    const bStart = new Date(b.scheduled_at).getTime();
    const bEnd = bStart + (b.duration_minutes * 60000);
    return (slotStart < bEnd && slotEnd > bStart);
  });
};
