import type { Booking } from '@/lib/types';

const today = new Date();

const fromNow = (d: number, h: number, m = 0): string => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + d);
  dt.setHours(h, m, 0, 0);
  return dt.toISOString();
};

const ago = (d: number, h: number): string => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() - d);
  dt.setHours(h, 0, 0, 0);
  return dt.toISOString();
};

export const FIXTURE_BOOKINGS: Booking[] = [
  {
    id: 'booking-001',
    merchant_id: 'merchant-003',
    service_id: 'svc-001',
    service_name: 'Classic Lash Set',
    buyer_name: 'Adaeze Okonkwo',
    buyer_phone: '+2348031122334',
    scheduled_at: fromNow(1, 10),
    duration_minutes: 90,
    deposit_paid: 5000,
    total_amount: 25000,
    status: 'confirmed',
    notes: null,
    no_show: false,
    created_at: ago(2, 14),
  },
  {
    id: 'booking-002',
    merchant_id: 'merchant-003',
    service_id: 'svc-002',
    service_name: 'Volume Lash Set',
    buyer_name: 'Kemi Adebayo',
    buyer_phone: '+2348044556677',
    scheduled_at: fromNow(1, 13),
    duration_minutes: 120,
    deposit_paid: 7000,
    total_amount: 35000,
    status: 'confirmed',
    notes: 'First time client. Wants extra volume.',
    no_show: false,
    created_at: ago(1, 10),
  },
  {
    id: 'booking-003',
    merchant_id: 'merchant-003',
    service_id: 'svc-004',
    service_name: 'Brow Design & Tint',
    buyer_name: 'Amara Obi',
    buyer_phone: '+2349011223344',
    scheduled_at: fromNow(2, 11),
    duration_minutes: 45,
    deposit_paid: 2500,
    total_amount: 12000,
    status: 'pending',
    notes: null,
    no_show: false,
    created_at: ago(0, 9),
  },
  {
    id: 'booking-004',
    merchant_id: 'merchant-003',
    service_id: 'svc-005',
    service_name: 'Full Set + Brow Combo',
    buyer_name: 'Chidinma Obi',
    buyer_phone: '+2348077889900',
    scheduled_at: fromNow(3, 14),
    duration_minutes: 150,
    deposit_paid: 10000,
    total_amount: 45000,
    status: 'confirmed',
    notes: 'Bride. Very important appointment.',
    no_show: false,
    created_at: ago(3, 16),
  },
  {
    id: 'booking-005',
    merchant_id: 'merchant-003',
    service_id: 'svc-003',
    service_name: 'Lash Refill',
    buyer_name: 'Ngozi Abara',
    buyer_phone: '+2348055443322',
    scheduled_at: ago(3, 11),
    duration_minutes: 60,
    deposit_paid: 3000,
    total_amount: 15000,
    status: 'completed',
    notes: null,
    no_show: false,
    created_at: ago(10, 15),
  },
  {
    id: 'booking-006',
    merchant_id: 'merchant-003',
    service_id: 'svc-001',
    service_name: 'Classic Lash Set',
    buyer_name: 'Sade Olaniyi',
    buyer_phone: '+2348099887766',
    scheduled_at: ago(7, 14),
    duration_minutes: 90,
    deposit_paid: 0,
    total_amount: 25000,
    status: 'cancelled',
    notes: 'Client cancelled day before.',
    no_show: false,
    created_at: ago(14, 11),
  },
  {
    id: 'booking-007',
    merchant_id: 'merchant-003',
    service_id: 'svc-002',
    service_name: 'Volume Lash Set',
    buyer_name: 'Blessing Eze',
    buyer_phone: '+2348022334455',
    scheduled_at: ago(5, 12),
    duration_minutes: 120,
    deposit_paid: 7000,
    total_amount: 35000,
    status: 'completed',
    notes: 'Did not show up. Deposit forfeited.',
    no_show: true,
    created_at: ago(12, 10),
  },
];
