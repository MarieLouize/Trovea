import { apiClient } from './client';
import type { HoldRequest } from '@/lib/types';

export async function createHold(dto: any): Promise<HoldRequest> {
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
