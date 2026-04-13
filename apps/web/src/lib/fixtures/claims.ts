import type { ClaimRequest } from '../types';

const daysAgo = (d: number, h = 0) =>
  new Date(Date.now() - d * 24 * 60 * 60 * 1000 - h * 60 * 60 * 1000).toISOString();

const hoursLater = (isoBase: string, h: number) =>
  new Date(new Date(isoBase).getTime() + h * 60 * 60 * 1000).toISOString();

const base001 = daysAgo(0, 3);
const base002 = daysAgo(0, 6);
const base003 = daysAgo(1);
const base004 = daysAgo(1, 2);
const base005 = daysAgo(3);
const base006 = daysAgo(4);

export const FIXTURE_CLAIMS: ClaimRequest[] = [
  {
    id: 'claim-001',
    product_id: 'product-007',
    merchant_id: 'merchant-001',
    buyer_name: 'Adaeze Okonkwo',
    buyer_phone: '+2348031122334',
    buyer_email: null,
    buyer_note: 'Please keep one for me, I get paid Friday!',
    proof_submitted: false,
    proof_note: null,
    proof_url: null,
    status: 'pending',
    idempotency_key: 'claim:product-007:+2348031122334:fixture-001',
    created_at: base001,
    updated_at: base001,
    expires_at: hoursLater(base001, 24),
  },
  {
    id: 'claim-002',
    product_id: 'product-007',
    merchant_id: 'merchant-001',
    buyer_name: 'Tolu Animashaun',
    buyer_phone: '+2348166778899',
    buyer_email: null,
    buyer_note: null,
    proof_submitted: false,
    proof_note: null,
    proof_url: null,
    status: 'pending',
    idempotency_key: 'claim:product-007:+2348166778899:fixture-002',
    created_at: base002,
    updated_at: base002,
    expires_at: hoursLater(base002, 24),
  },
  {
    id: 'claim-003',
    product_id: 'product-017',
    merchant_id: 'merchant-001',
    buyer_name: 'Chibundo Okafor',
    buyer_phone: '+2347011223344',
    buyer_email: null,
    buyer_note: "For my sister's introduction ceremony. Very important.",
    proof_submitted: false,
    proof_note: null,
    proof_url: null,
    status: 'pending',
    idempotency_key: 'claim:product-017:+2347011223344:fixture-003',
    created_at: base003,
    updated_at: base003,
    expires_at: hoursLater(base003, 24),
  },
  {
    id: 'claim-004',
    product_id: 'product-020',
    merchant_id: 'merchant-001',
    buyer_name: 'Emeka Nwosu',
    buyer_phone: '+2349055443322',
    buyer_email: null,
    buyer_note: null,
    proof_submitted: false,
    proof_note: null,
    proof_url: null,
    status: 'pending',
    idempotency_key: 'claim:product-020:+2349055443322:fixture-004',
    created_at: base004,
    updated_at: base004,
    expires_at: hoursLater(base004, 24),
  },
  {
    id: 'claim-005',
    product_id: 'product-007',
    merchant_id: 'merchant-001',
    buyer_name: 'Omotunde Adesanya',
    buyer_phone: '+2348077889900',
    buyer_email: null,
    buyer_note: 'I was told to message you for a slot.',
    proof_submitted: true,
    proof_note: 'Payment sent, please check',
    proof_url: null,
    status: 'accepted',
    idempotency_key: 'claim:product-007:+2348077889900:fixture-005',
    created_at: base005,
    updated_at: daysAgo(2),
    expires_at: hoursLater(base005, 24),
  },
  {
    id: 'claim-006',
    product_id: 'product-017',
    merchant_id: 'merchant-001',
    buyer_name: 'Ifunanya Okeke',
    buyer_phone: '+2348012001200',
    buyer_email: null,
    buyer_note: null,
    proof_submitted: true,
    proof_note: null,
    proof_url: null,
    status: 'declined',
    idempotency_key: 'claim:product-017:+2348012001200:fixture-006',
    created_at: base006,
    updated_at: daysAgo(3),
    expires_at: hoursLater(base006, 24),
  },
];
