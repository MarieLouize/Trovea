import { db } from '@/lib/db';
import type { Drop } from '@/lib/types';

export const getDropsByMerchant = async (merchantId: string): Promise<Drop[]> => {
  const { data, error } = await db
    .from('drops')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('scheduled_at', { ascending: false });

  if (error || !data) return [];
  return data as Drop[];
};

export const updateDrop = async (id: string, patch: Partial<Drop>): Promise<boolean> => {
  const { error } = await db.from('drops').update(patch).eq('id', id);
  return !error;
};
