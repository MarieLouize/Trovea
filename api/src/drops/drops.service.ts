import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { MerchantsService } from '../merchants/merchants.service';

@Injectable()
export class DropsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly merchantsService: MerchantsService,
  ) {}

  async getByMerchant(ownerId: string) {
    const merchant = await this.merchantsService.getByOwnerId(ownerId);
    const { data, error } = await this.supabase
      .getClient()
      .from('drops')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('scheduled_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async create(dto: any, ownerId: string) {
    const merchant = await this.merchantsService.getByOwnerId(ownerId);
    const { data, error } = await this.supabase
      .getClient()
      .from('drops')
      .insert({ ...dto, merchant_id: merchant.id, status: 'scheduled' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, dto: any, ownerId: string) {
    const merchant = await this.merchantsService.getByOwnerId(ownerId);
    
    const { data: drop, error: fetchError } = await this.supabase
      .getClient()
      .from('drops')
      .select('merchant_id')
      .eq('id', id)
      .single();

    if (fetchError || !drop) throw new NotFoundException('Drop not found');
    if (drop.merchant_id !== merchant.id) throw new ForbiddenException();

    const { data, error } = await this.supabase
      .getClient()
      .from('drops')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string, ownerId: string) {
    const merchant = await this.merchantsService.getByOwnerId(ownerId);
    
    const { data: drop, error: fetchError } = await this.supabase
      .getClient()
      .from('drops')
      .select('merchant_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !drop) throw new NotFoundException('Drop not found');
    if (drop.merchant_id !== merchant.id) throw new ForbiddenException();
    if (drop.status !== 'scheduled') throw new ForbiddenException('Can only delete scheduled drops');

    const { error } = await this.supabase
      .getClient()
      .from('drops')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }
}
