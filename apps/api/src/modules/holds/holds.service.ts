import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { MerchantsService } from '../merchants/merchants.service';

@Injectable()
export class HoldsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly merchantsService: MerchantsService,
  ) {}

  async create(dto: any) {
    const { data, error } = await this.supabase
      .getClient()
      .rpc('create_hold_with_lock', {
        p_product_id: dto.product_id,
        p_buyer_id: dto.buyer_id,
        p_expires_at: dto.expires_at,
        p_idempotency_key: dto.idempotency_key,
      });

    if (error) {
      if (error.code === 'P0003') throw new ForbiddenException('Product out of stock');
      if (error.code === 'P0004') throw new ForbiddenException('Item already on hold');
      throw error;
    }
    return data;
  }

  async getActiveForProduct(productId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .rpc('get_active_hold_for_product', { p_product_id: productId })
      .single();

    if (error) return null;
    return data;
  }

  async getByMerchant(ownerId: string) {
    const merchant = await this.merchantsService.getByOwnerId(ownerId);
    const { data, error } = await this.supabase
      .getClient()
      .from('holds')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async release(id: string, ownerId: string) {
    const merchant = await this.merchantsService.getByOwnerId(ownerId);
    
    // Check ownership
    const { data: hold, error: fetchError } = await this.supabase
      .getClient()
      .from('holds')
      .select('merchant_id')
      .eq('id', id)
      .single();

    if (fetchError || !hold) throw new NotFoundException('Hold not found');
    if (hold.merchant_id !== merchant.id) throw new ForbiddenException();

    const { error } = await this.supabase
      .getClient()
      .from('holds')
      .update({ status: 'released' })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }
}
