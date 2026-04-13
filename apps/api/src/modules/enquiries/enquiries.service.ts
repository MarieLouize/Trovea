import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { MerchantsService } from '../merchants/merchants.service';

@Injectable()
export class EnquiriesService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly merchantsService: MerchantsService,
  ) {}

  async create(dto: any) {
    const { data, error } = await this.supabase
      .getClient()
      .from('enquiries')
      .insert({ ...dto, status: 'new' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getByMerchant(ownerId: string) {
    const merchant = await this.merchantsService.getByOwnerId(ownerId);
    const { data, error } = await this.supabase
      .getClient()
      .from('enquiries')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async updateStatus(id: string, status: string, ownerId: string) {
    const merchant = await this.merchantsService.getByOwnerId(ownerId);
    
    // Ownership check
    const { data: enquiry, error: fetchError } = await this.supabase
      .getClient()
      .from('enquiries')
      .select('merchant_id')
      .eq('id', id)
      .single();

    if (fetchError || !enquiry) throw new NotFoundException('Enquiry not found');
    if (enquiry.merchant_id !== merchant.id) throw new ForbiddenException();

    const { data, error } = await this.supabase
      .getClient()
      .from('enquiries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
