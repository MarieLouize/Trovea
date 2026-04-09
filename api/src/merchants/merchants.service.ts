import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

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
}
