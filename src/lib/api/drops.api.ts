import { apiClient } from './client';
import type { Drop } from '@/lib/types';

export async function getDropsByMerchant(): Promise<Drop[]> {
  const { data } = await apiClient.get('/drops');
  return data;
}

export async function createDrop(dto: any): Promise<Drop> {
  const { data } = await apiClient.post('/drops', dto);
  return data;
}

export async function updateDrop(id: string, dto: any): Promise<Drop> {
  const { data } = await apiClient.patch(`/drops/${id}`, dto);
  return data;
}

export async function deleteDrop(id: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete(`/drops/${id}`);
  return data;
}
