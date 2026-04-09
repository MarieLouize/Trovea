import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class ReceiptsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getBySealId(sealId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('receipts')
      .select('*')
      .eq('seal_id', sealId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Receipt with seal ${sealId} not found`);
    }

    return data;
  }
}
