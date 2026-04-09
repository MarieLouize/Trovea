import { apiClient } from './client';
import type { Merchant } from '@/lib/types';

export async function getMerchantByHandle(handle: string): Promise<Merchant> {
  const { data } = await apiClient.get(`/merchants/${handle}`);
  return data;
}
