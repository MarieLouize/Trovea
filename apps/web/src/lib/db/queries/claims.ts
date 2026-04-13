import { db } from '@/lib/db';
import type { Claim } from '../types';

/**
 * Submit a new claim request.
 */
export async function createClaim(
  claim: Omit<Claim, 'id' | 'created_at' | 'updated_at'>
): Promise<Claim | null> {
  const { data, error } = await db
    .from('claims')
    .insert(claim)
    .select()
    .single();

  if (error || !data) {
    console.error('Failed to create claim:', error);
    return null;
  }

  return data as Claim;
}

/**
 * Fetch claims for a merchant.
 */
export async function getClaimsByMerchant(merchantId: string): Promise<Claim[]> {
  const { data, error } = await db
    .from('claims')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get claims:', error);
    return [];
  }

  return data as Claim[];
}

/**
 * Update claim status (e.g. accepted, declined).
 */
export async function updateClaimStatus(
  id: string,
  status: Claim['status']
): Promise<boolean> {
  const { error } = await db
    .from('claims')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  return !error;
}
