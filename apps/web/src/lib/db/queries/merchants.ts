import { db } from '@/lib/db';
import type { Merchant } from '@/lib/types';

export const getMerchantByHandle = async (handle: string): Promise<Merchant | null> => {
  const { data, error } = await db
    .from('merchants')
    .select('*')
    .eq('handle', handle)
    .is('deleted_at', null)
    .single();

  if (error || !data) return null;
  return data as Merchant;
};

export const getMerchantById = async (id: string): Promise<Merchant | null> => {
  const { data, error } = await db
    .from('merchants')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as Merchant;
};

export const updateMerchant = async (
  id: string,
  patch: Partial<Merchant>
): Promise<boolean> => {
  const { error } = await db
    .from('merchants')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);

  return !error;
};

export const getMerchantByOwnerId = async (ownerId: string): Promise<Merchant | null> => {
  const { data, error } = await db
    .from('merchants')
    .select('*')
    .eq('owner_id', ownerId)
    .single();

  if (error || !data) return null;
  return data as Merchant;
};
