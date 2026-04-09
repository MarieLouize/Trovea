import { apiClient } from './client';
import type { Product, Collection } from '@/lib/types';

export async function getProductsByMerchant(merchantId: string): Promise<Product[]> {
  const { data } = await apiClient.get(`/products/merchant/${merchantId}`);
  return data;
}

export async function getCollectionsByMerchant(merchantId: string): Promise<Collection[]> {
  const { data } = await apiClient.get(`/products/merchant/${merchantId}/collections`);
  return data;
}

export async function getProductById(id: string): Promise<Product> {
  const { data } = await apiClient.get(`/products/${id}`);
  return data;
}
