import { apiClient } from './client';
import type { ClaimRequest } from '@/lib/types';

// Idempotency key helper — stable per intent, not per call.
// Callers should generate the key once before the first attempt and reuse it on retries.
export function generateClaimKey(productId: string, buyerPhone: string): string {
  return `claim:${productId}:${buyerPhone}:${Date.now()}`;
}

export async function createClaim(dto: {
  product_id:      string;
  merchant_id:     string;
  buyer_name:      string;
  buyer_phone:     string;
  buyer_email?:    string | null;
  buyer_note?:     string | null;
  idempotency_key: string; // Required — caller must generate once before the first attempt
}): Promise<ClaimRequest> {
  const { data } = await apiClient.post('/claims', dto);
  return data;
}

export async function getPendingClaimForProduct(productId: string): Promise<ClaimRequest | null> {
  const { data } = await apiClient.get(`/claims/product/${productId}`);
  return data;
}

export async function getClaimsByMerchant(): Promise<ClaimRequest[]> {
  const { data } = await apiClient.get('/claims');
  return data;
}

export async function updateClaimStatus(id: string, status: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.patch(`/claims/${id}/status`, { status });
  return data;
}

export async function uploadClaimProof(id: string, file: File): Promise<{ publicUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post(`/claims/${id}/proof`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
