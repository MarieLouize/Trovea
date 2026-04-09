import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class AdminService {
  constructor(private readonly supabase: SupabaseService) {}

  async getAllMerchants(suspendedOnly?: boolean) {
    let query = this.supabase.getClient().from('merchants').select('*');
    if (suspendedOnly) {
      query = query.eq('is_suspended', true);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async suspendMerchant(id: string, note: string, adminId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('merchants')
      .update({ is_suspended: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await this.logAction('Store suspended', id, adminId, note);
    return data;
  }

  async unsuspendMerchant(id: string, adminId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('merchants')
      .update({ is_suspended: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await this.logAction('Store unsuspended', id, adminId, 'Merchant unsuspended by admin');
    return data;
  }

  async setMerchantTier(id: string, tier: string, adminId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('merchants')
      .update({ verification_tier: tier, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await this.logAction(`Verification tier set to ${tier}`, id, adminId, `Tier changed to ${tier}`);
    return data;
  }

  async getReports() {
    const { data, error } = await this.supabase
      .getClient()
      .from('store_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getAdminLog(limit = 100) {
    const { data, error } = await this.supabase
      .getClient()
      .from('admin_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  private async logAction(action: string, targetMerchantId: string | null, adminId: string, note: string) {
    const { error } = await this.supabase
      .getClient()
      .from('admin_log')
      .insert({
        action,
        target_merchant_id: targetMerchantId,
        admin_id: adminId,
        note,
      });
    if (error) console.error('Failed to log admin action:', error);
  }
}
