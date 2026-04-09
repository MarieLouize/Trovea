import type { StoreReport, AdminLogEntry } from '../types';

const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

export const FIXTURE_REPORTS: StoreReport[] = [
  {
    id: 'report-001',
    reported_merchant_id: 'merchant-001',
    reported_store_name: "Tola's Archive",
    category: 'misleading',
    detail: 'Item described as vintage but looks new.',
    status: 'pending',
    priority: 'medium',
    created_at: daysAgo(2),
    reviewed_at: null,
  },
  {
    id: 'report-002',
    reported_merchant_id: 'merchant-002',
    reported_store_name: 'Tobi Eats',
    category: 'suspicious_payment',
    detail: 'Seller asked me to pay to a personal account then stopped responding.',
    status: 'pending',
    priority: 'high',
    created_at: daysAgo(1),
    reviewed_at: null,
  },
  {
    id: 'report-003',
    reported_merchant_id: 'merchant-001',
    reported_store_name: "Tola's Archive",
    category: 'unresponsive',
    detail: null,
    status: 'reviewed',
    priority: 'low',
    created_at: daysAgo(7),
    reviewed_at: daysAgo(5),
  },
  {
    id: 'report-004',
    reported_merchant_id: 'merchant-003',
    reported_store_name: 'Chisom Beauty',
    category: 'other',
    detail: 'Appointment was cancelled without refund of deposit.',
    status: 'pending',
    priority: 'high',
    created_at: daysAgo(0),
    reviewed_at: null,
  },
];

export const FIXTURE_ADMIN_LOG: AdminLogEntry[] = [
  {
    id: 'log-admin-001',
    action: 'Verification tier upgraded',
    target_merchant_id: 'merchant-003',
    admin_id: 'admin-001',
    created_at: daysAgo(3),
    note: 'Upgraded Chisom Beauty to Trusted based on 90-day review.',
  },
  {
    id: 'log-admin-002',
    action: 'Report dismissed',
    target_merchant_id: 'merchant-001',
    admin_id: 'admin-001',
    created_at: daysAgo(5),
    note: 'Report #003 reviewed — no policy violation found.',
  },
];
