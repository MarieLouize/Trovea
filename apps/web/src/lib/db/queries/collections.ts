import { db } from '@/lib/db';
import type { Collection } from '@/lib/types';

export const getCollectionsByMerchant = async (merchantId: string): Promise<Collection[]> => {
  const { data, error } = await db
    .from('collections')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('display_order', { ascending: true });

  if (error || !data) return [];
  return data as Collection[];
};

export const createCollection = async (
  collection: Omit<Collection, 'id' | 'created_at' | 'updated_at'>
): Promise<Collection | null> => {
  const { data, error } = await db
    .from('collections')
    .insert(collection)
    .select()
    .single();

  if (error || !data) return null;
  return data as Collection;
};

export const updateCollection = async (
  id: string,
  patch: Partial<Collection>
): Promise<boolean> => {
  const { error } = await db
    .from('collections')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);

  return !error;
};

export const deleteCollection = async (id: string): Promise<boolean> => {
  const { error } = await db
    .from('collections')
    .delete()
    .eq('id', id);

  return !error;
};
