import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class ProductsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getByMerchant(merchantId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('products')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('status', 'live')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getCollections(merchantId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('collections')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getById(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }
}
