import { apiClient } from './client';
import type { HoldRequest } from '@/lib/types';

// Idempotency key helper — stable per intent, not per call.
// Callers should generate the key once and pass it through retries.
export function generateHoldKey(productId: string, buyerPhone: string): string {
  return `hold:${productId}:${buyerPhone}:${Date.now()}`;
}

export async function createHold(dto: {
  product_id:      string;
  merchant_id:     string;
  buyer_name:      string;
  buyer_phone:     string;
  buyer_note?:     string | null;
  duration_hours:  2 | 6 | 12 | 24;
  idempotency_key: string; // Required — caller must generate once before the first attempt
}): Promise<HoldRequest> {
  const { data } = await apiClient.post('/holds', dto);
  return data;
}

export async function getActiveHoldForProduct(productId: string): Promise<HoldRequest | null> {
  const { data } = await apiClient.get(`/holds/product/${productId}`);
  return data;
}

export async function getHoldsByMerchant(): Promise<HoldRequest[]> {
  const { data } = await apiClient.get('/holds');
  return data;
}

export async function releaseHold(id: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.patch(`/holds/${id}/release`);
  return data;
}
