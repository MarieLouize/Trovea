import { db } from '@/lib/db';
import type { Enquiry } from '@/lib/types';

export const getEnquiriesByMerchant = async (merchantId: string): Promise<Enquiry[]> => {
  const { data, error } = await db
    .from('enquiries')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Enquiry[];
};

export const createEnquiry = async (
  enquiry: Omit<Enquiry, 'id' | 'created_at' | 'updated_at'>
): Promise<Enquiry | null> => {
  const { data, error } = await db
    .from('enquiries')
    .insert(enquiry)
    .select()
    .single();

  if (error || !data) return null;
  return data as Enquiry;
};

export const updateEnquiry = async (
  id: string,
  patch: Partial<Enquiry>
): Promise<boolean> => {
  const { error } = await db
    .from('enquiries')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);

  return !error;
};
