import { db } from '@/lib/db';
import type { Receipt } from '@/lib/types';

export const getReceiptsByMerchant = async (merchantId: string): Promise<Receipt[]> => {
  const { data, error } = await db
    .from('receipts')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Receipt[];
};

export const getReceiptBySealId = async (sealId: string): Promise<Receipt | null> => {
  // Use the RPC function defined in Phase 3B migrations
  const { data, error } = await db
    .rpc('get_receipt_by_seal_id', { p_seal_id: sealId })
    .single();

  if (error || !data) return null;
  return data as Receipt;
};

// Receipts are append-only — only status fields can be updated
export const updateReceiptStatus = async (
  id: string,
  patch: Pick<Receipt, 'payment_status'> |
         Pick<Receipt, 'shipment_status'> |
         Pick<Receipt, 'delivery_status'> |
         { log: Receipt['log'] }
): Promise<boolean> => {
  const { error } = await db
    .from('receipts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);

  return !error;
};

// Creates a new receipt — no ID needed, DB generates it
export const createReceipt = async (
  receipt: Omit<Receipt, 'id' | 'created_at' | 'updated_at'>
): Promise<Receipt | null> => {
  const { data, error } = await db
    .from('receipts')
    .insert(receipt)
    .select()
    .single();

  if (error || !data) return null;
  return data as Receipt;
};
