import { apiClient } from './client';
import type { Receipt } from '@/lib/types';

export async function getReceiptBySealId(sealId: string): Promise<Receipt> {
  const { data } = await apiClient.get(`/receipts/${sealId}`);
  return data;
}
