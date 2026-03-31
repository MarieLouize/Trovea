import type { HoldRequest } from '@/lib/types/store-config.types';

const hoursAgo = (h: number) =>
  new Date(Date.now() - h * 3_600_000).toISOString();
const hoursFromNow = (h: number) =>
  new Date(Date.now() + h * 3_600_000).toISOString();

export const FIXTURE_HOLDS: HoldRequest[] = [
  {
    id: 'hold-001',
    product_id: 'product-019',     // Kente-trim Trench Coat
    merchant_id: 'merchant-001',
    buyer_name: 'Adaeze Okonkwo',
    buyer_phone: '+2348031122334',
    buyer_note: 'Getting paid tomorrow, please hold.',
    status: 'active',
    duration_hours: 24,
    created_at: hoursAgo(2),
    expires_at: hoursFromNow(22),
  },
  {
    id: 'hold-002',
    product_id: 'product-011',     // Hand-dyed Agbada Blouse
    merchant_id: 'merchant-001',
    buyer_name: 'Tunde Ogunwale',
    buyer_phone: '+2348022334455',
    buyer_note: null,
    status: 'expired',
    duration_hours: 6,
    created_at: hoursAgo(8),
    expires_at: hoursAgo(2),
  },
  {
    id: 'hold-003',
    product_id: 'product-005',     // Floral Chiffon Gown
    merchant_id: 'merchant-001',
    buyer_name: 'Kemi Adebayo',
    buyer_phone: '+2348044556677',
    buyer_note: 'Picking up Saturday.',
    status: 'released',
    duration_hours: 12,
    created_at: hoursAgo(15),
    expires_at: hoursAgo(3),
  },
];
