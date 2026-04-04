import type { Drop } from '../types';

const daysFromNow = (d: number): string =>
  new Date(Date.now() + d * 86400000).toISOString();
const daysAgo = (d: number): string =>
  new Date(Date.now() - d * 86400000).toISOString();

export const FIXTURE_DROPS: Drop[] = [
  {
    id: 'drop-001',
    merchant_id: 'merchant-001',
    label: 'Drop 03 — Ankara Revival',
    scheduled_at: daysAgo(14),
    status: 'completed',
    product_ids: ['product-001', 'product-003', 'product-006', 'product-007',
                  'product-009', 'product-011', 'product-012', 'product-015'],
    notify_emails: [],
    created_at: daysAgo(21),
  },
  {
    id: 'drop-002',
    merchant_id: 'merchant-001',
    label: 'Drop 04 — Summer Haul',
    scheduled_at: daysFromNow(3),
    status: 'scheduled',
    product_ids: ['product-001', 'product-003', 'product-005', 'product-009', 'product-011'],
    notify_emails: ['adaeze@example.com', 'chisom@example.com'],
    created_at: daysAgo(2),
  },
  {
    id: 'drop-003',
    merchant_id: 'merchant-001',
    label: 'Drop 05 — Archive Clearance',
    scheduled_at: daysFromNow(10),
    status: 'draft',
    product_ids: [],
    notify_emails: [],
    created_at: daysAgo(1),
  },
];
