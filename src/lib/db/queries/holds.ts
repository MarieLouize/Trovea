import { db } from '@/lib/db';
import type { Hold } from '../types';

/**
 * Create a new hold request.
 */
export async function createHold(
  hold: Omit<Hold, 'id' | 'created_at' | 'updated_at'>
): Promise<Hold | null> {
  const { data, error } = await db
    .from('holds')
    .insert(hold)
    .select()
    .single();

  if (error || !data) {
    console.error('Failed to create hold:', error);
    return null;
  }

  return data as Hold;
}

/**
 * Fetch all currently active (non-expired, non-released) holds for a store.
 */
export async function getActiveHoldsByMerchant(merchantId: string): Promise<Hold[]> {
  const { data, error } = await db
    .from('holds')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString());

  if (error) {
    console.error('Failed to get active holds:', error);
    return [];
  }

  return data as Hold[];
}

/**
 * Manually release a hold.
 */
export async function releaseHold(id: string): Promise<boolean> {
  const { error } = await db
    .from('holds')
    .update({ status: 'released', updated_at: new Date().toISOString() })
    .eq('id', id);

  return !error;
}
