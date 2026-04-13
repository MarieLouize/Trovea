import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class MerchantsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getByHandle(handle: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('merchants')
      .select('*')
      .eq('handle', handle)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Store with handle @${handle} not found`);
    }

    return data;
  }

  async getByOwnerId(ownerId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('merchants')
      .select('*')
      .eq('owner_id', ownerId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Merchant for owner ${ownerId} not found`);
    }

    return data;
  }

  async update(ownerId: string, dto: any) {
    const { data, error } = await this.supabase
      .getClient()
      .from('merchants')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('owner_id', ownerId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update merchant: ${error?.message}`);
    }

    return data;
  }
}
