import { apiClient } from './client';
import type { Merchant } from '@/lib/types';

export async function getMerchantByHandle(handle: string): Promise<Merchant> {
  const { data } = await apiClient.get(`/merchants/${handle}`);
  return data;
}

export async function getOwnMerchant(): Promise<Merchant> {
  const { data } = await apiClient.get('/merchants/me');
  return data;
}

export async function updateMerchant(patch: Partial<Merchant>): Promise<Merchant> {
  const { data } = await apiClient.patch('/merchants/me', patch);
  return data;
}
