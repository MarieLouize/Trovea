import type { AvailabilityWindow } from '@/lib/types';

const today = new Date();

const daysFromNow = (d: number, h = 12): string => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + d);
  dt.setHours(h, 0, 0, 0);
  return dt.toISOString();
};

const daysAgo = (d: number, h = 23): string => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() - d);
  dt.setHours(h, 59, 0, 0);
  return dt.toISOString();
};

export const FIXTURE_WINDOWS: AvailabilityWindow[] = [
  {
    id: 'window-001',
    merchant_id: 'merchant-002',
    label: 'Weekend Drop — This Saturday',
    opens_at: daysFromNow(-1, 9),
    closes_at: daysFromNow(1, 23),
    status: 'open',
    total_orders: 14,
    notes: 'Jollof, fried rice, peppered snail. Pickup from 12pm.',
  },
  {
    id: 'window-002',
    merchant_id: 'merchant-002',
    label: 'Weekend Drop — Next Saturday',
    opens_at: daysFromNow(5, 9),
    closes_at: daysFromNow(7, 23),
    status: 'upcoming',
    total_orders: 0,
    notes: null,
  },
  {
    id: 'window-003',
    merchant_id: 'merchant-002',
    label: 'Weekend Drop — Last Saturday',
    opens_at: daysAgo(8, 9),
    closes_at: daysAgo(6, 23),
    status: 'closed',
    total_orders: 31,
    notes: 'Special: added moi moi.',
  },
  {
    id: 'window-004',
    merchant_id: 'merchant-002',
    label: 'Weekend Drop — 2 Weeks Ago',
    opens_at: daysAgo(15, 9),
    closes_at: daysAgo(13, 23),
    status: 'closed',
    total_orders: 28,
    notes: null,
  },
];
