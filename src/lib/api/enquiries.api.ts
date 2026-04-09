import { apiClient } from './client';
import type { Enquiry } from '@/lib/types';

export async function createEnquiry(dto: any): Promise<Enquiry> {
  const { data } = await apiClient.post('/enquiries', dto);
  return data;
}

export async function getEnquiries(): Promise<Enquiry[]> {
  const { data } = await apiClient.get('/enquiries');
  return data;
}

export async function updateEnquiryStatus(id: string, status: string): Promise<Enquiry> {
  const { data } = await apiClient.patch(`/enquiries/${id}/status`, { status });
  return data;
}
