import { apiClient } from './client';
import type { Merchant, StoreReport, AdminLogEntry } from '@/lib/types';

export async function getAllMerchants(suspendedOnly?: boolean): Promise<Merchant[]> {
  const { data } = await apiClient.get('/admin/merchants', {
    params: { suspended: suspendedOnly ? 'true' : 'false' }
  });
  return data;
}

export async function suspendMerchant(id: string, note: string): Promise<Merchant> {
  const { data } = await apiClient.patch(`/admin/merchants/${id}/suspend`, { note });
  return data;
}

export async function unsuspendMerchant(id: string): Promise<Merchant> {
  const { data } = await apiClient.patch(`/admin/merchants/${id}/unsuspend`);
  return data;
}

export async function setVerificationTier(id: string, tier: string): Promise<Merchant> {
  const { data } = await apiClient.patch(`/admin/merchants/${id}/tier`, { tier });
  return data;
}

export async function getAdminReports(): Promise<StoreReport[]> {
  const { data } = await apiClient.get('/admin/reports');
  return data;
}

export async function getAdminLog(limit?: number): Promise<AdminLogEntry[]> {
  const { data } = await apiClient.get('/admin/log', {
    params: { limit }
  });
  return data;
}
