import type { Booking } from '../types';

export interface ScheduleConfig {
  start: number;          // working start hour (24h), e.g. 9
  end: number;            // working end hour (24h), e.g. 18
  days: number[];         // working weekdays 0=Sun…6=Sat
  bufferMinutes: number;  // gap enforced between appointments
  blockedDates: string[]; // ISO 'YYYY-MM-DD' strings
}

export const DEFAULT_SCHEDULE: ScheduleConfig = {
  start: 9,
  end: 18,
  days: [2, 3, 4, 5, 6], // Tue–Sat
  bufferMinutes: 0,
  blockedDates: [],
};

/** Build a ScheduleConfig from a Merchant object (or return default). */
export function buildScheduleConfig(merchant: {
  working_hours?: { start: number; end: number; days: number[] } | null;
  blocked_dates?: string[];
  buffer_time_minutes?: number;
}): ScheduleConfig {
  return {
    start: merchant.working_hours?.start ?? DEFAULT_SCHEDULE.start,
    end: merchant.working_hours?.end ?? DEFAULT_SCHEDULE.end,
    days: merchant.working_hours?.days ?? DEFAULT_SCHEDULE.days,
    bufferMinutes: merchant.buffer_time_minutes ?? 0,
    blockedDates: merchant.blocked_dates ?? [],
  };
}

/** Derive slot start hours for a given day from the schedule + service duration. */
export function getSlotHours(
  schedule: ScheduleConfig,
  serviceDuration: number,
): number[] {
  const slots: number[] = [];
  const { start, end, bufferMinutes } = schedule;
  const stepMinutes = serviceDuration + bufferMinutes;
  // Walk from start, adding slots every step until end - duration
  let cursor = start * 60; // minutes from midnight
  const endMinutes = end * 60;
  while (cursor + serviceDuration <= endMinutes) {
    slots.push(Math.floor(cursor / 60) * 100 + (cursor % 60)); // encode as HHMM int
    cursor += stepMinutes;
  }
  return slots;
}

/** Decode a HHMM integer back to { hour, minute }. */
export function decodeSlot(hhmm: number): { hour: number; minute: number } {
  return { hour: Math.floor(hhmm / 100), minute: hhmm % 100 };
}

export const getNextAvailableDate = (
  merchantId: string,
  bookings: Booking[],
  schedule: ScheduleConfig = DEFAULT_SCHEDULE,
): string | null => {
  const today = new Date();
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    if (!schedule.days.includes(d.getDay())) continue;
    if (schedule.blockedDates.includes(dateStr)) continue;
    const bookedCount = bookings.filter(b => {
      const bDate = b.scheduled_at.split('T')[0];
      return b.merchant_id === merchantId && bDate === dateStr && b.status !== 'cancelled';
    }).length;
    if (bookedCount < 8) return d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return null;
};

export const getAvailableDays = (
  merchantId: string,
  bookings: Booking[],
  schedule: ScheduleConfig = DEFAULT_SCHEDULE,
): Set<string> => {
  const available = new Set<string>();
  const today = new Date();
  for (let i = 1; i <= 42; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    if (!schedule.days.includes(d.getDay())) continue;
    if (schedule.blockedDates.includes(dateStr)) continue;
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
  bookings: Booking[],
  schedule: ScheduleConfig = DEFAULT_SCHEDULE,
): boolean => {
  const slotStart = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`).getTime();
  const slotEnd = slotStart + (duration * 60000);

  // Must end by working day end
  const dayEnd = new Date(`${dateStr}T${String(schedule.end).padStart(2, '0')}:00:00`).getTime();
  if (slotEnd > dayEnd) return false;

  // Day must be a working day
  const dow = new Date(dateStr).getDay();
  if (!schedule.days.includes(dow)) return false;

  // Must not be a blocked date
  if (schedule.blockedDates.includes(dateStr)) return false;

  return !bookings.some(b => {
    if (b.merchant_id !== merchantId || b.status === 'cancelled') return false;
    if (!b.scheduled_at.startsWith(dateStr)) return false;

    const bStart = new Date(b.scheduled_at).getTime();
    // Add buffer to the booked appointment's end time
    const bEnd = bStart + ((b.duration_minutes + schedule.bufferMinutes) * 60000);
    return (slotStart < bEnd && slotEnd > bStart);
  });
};

/** Count available slots in the next 7 days for a given service duration. */
export function countSlotsThisWeek(
  merchantId: string,
  bookings: Booking[],
  schedule: ScheduleConfig,
  serviceDuration: number,
): number {
  const slots = getSlotHours(schedule, serviceDuration);
  let count = 0;
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    if (!schedule.days.includes(d.getDay())) continue;
    if (schedule.blockedDates.includes(dateStr)) continue;
    for (const hhmm of slots) {
      const { hour, minute } = decodeSlot(hhmm);
      if (isSlotAvailable(dateStr, hour, minute, serviceDuration, merchantId, bookings, schedule)) {
        count++;
      }
    }
  }
  return count;
}
