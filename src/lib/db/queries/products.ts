import { db } from '@/lib/db';
import type { Product, Collection } from '@/lib/types';

export const getProductsByMerchant = async (merchantId: string): Promise<Product[]> => {
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('merchant_id', merchantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Product[];
};

export const getCollectionsByMerchant = async (merchantId: string): Promise<Collection[]> => {
  const { data, error } = await db
    .from('collections')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('display_order', { ascending: true });

  if (error || !data) return [];
  return data as Collection[];
};

export const updateProduct = async (
  id: string,
  patch: Partial<Product>
): Promise<boolean> => {
  const { error } = await db
    .from('products')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);

  return !error;
};

export const createProduct = async (
  product: Omit<Product, 'id' | 'created_at' | 'updated_at'>
): Promise<Product | null> => {
  const { data, error } = await db
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error || !data) return null;
  return data as Product;
};
