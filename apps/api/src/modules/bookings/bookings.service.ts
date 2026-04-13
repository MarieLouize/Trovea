import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { MerchantsService } from '../merchants/merchants.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly merchantsService: MerchantsService,
  ) {}

  // ─── Bookings ─────────────────────────────────────────────────────────────

  async create(dto: any) {
    const { data, error } = await this.supabase
      .getClient()
      .from('bookings')
      .insert({ ...dto, status: 'pending' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getByMerchant(ownerId: string) {
    const merchant = await this.merchantsService.getByOwnerId(ownerId);
    const { data, error } = await this.supabase
      .getClient()
      .from('bookings')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  async update(id: string, dto: any, ownerId: string) {
    const merchant = await this.merchantsService.getByOwnerId(ownerId);
    
    // Ownership check
    const { data: booking, error: fetchError } = await this.supabase
      .getClient()
      .from('bookings')
      .select('merchant_id')
      .eq('id', id)
      .single();

    if (fetchError || !booking) throw new NotFoundException('Booking not found');
    if (booking.merchant_id !== merchant.id) throw new ForbiddenException();

    const { data, error } = await this.supabase
      .getClient()
      .from('bookings')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ─── Windows ──────────────────────────────────────────────────────────────

  async getWindowsByMerchant(ownerId: string) {
    const merchant = await this.merchantsService.getByOwnerId(ownerId);
    const { data, error } = await this.supabase
      .getClient()
      .from('availability_windows')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('opens_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async createWindow(dto: any, ownerId: string) {
    const merchant = await this.merchantsService.getByOwnerId(ownerId);
    const { data, error } = await this.supabase
      .getClient()
      .from('availability_windows')
      .insert({ ...dto, merchant_id: merchant.id, status: 'upcoming', total_orders: 0 })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateWindow(id: string, dto: any, ownerId: string) {
    const merchant = await this.merchantsService.getByOwnerId(ownerId);
    
    const { data: window, error: fetchError } = await this.supabase
      .getClient()
      .from('availability_windows')
      .select('merchant_id')
      .eq('id', id)
      .single();

    if (fetchError || !window) throw new NotFoundException('Window not found');
    if (window.merchant_id !== merchant.id) throw new ForbiddenException();

    const { data, error } = await this.supabase
      .getClient()
      .from('availability_windows')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteWindow(id: string, ownerId: string) {
    const merchant = await this.merchantsService.getByOwnerId(ownerId);
    
    const { data: window, error: fetchError } = await this.supabase
      .getClient()
      .from('availability_windows')
      .select('merchant_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !window) throw new NotFoundException('Window not found');
    if (window.merchant_id !== merchant.id) throw new ForbiddenException();
    if (window.status !== 'upcoming') throw new ForbiddenException('Can only delete upcoming windows');

    const { error } = await this.supabase
      .getClient()
      .from('availability_windows')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  async getOpenWindows(merchantId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .rpc('get_open_windows_for_merchant', { p_merchant_id: merchantId });

    if (error) throw error;
    return data;
  }
}
