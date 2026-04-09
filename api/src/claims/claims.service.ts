import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { MerchantsService } from '../merchants/merchants.service';

@Injectable()
export class ClaimsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly merchantsService: MerchantsService,
  ) {}

  async create(dto: any) {
    const { data, error } = await this.supabase
      .getClient()
      .from('claims')
      .insert(dto)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getPendingForProduct(productId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .rpc('get_pending_claim_for_product', { p_product_id: productId })
      .single();

    if (error) return null;
    return data;
  }

  async getByMerchant(ownerId: string) {
    const merchant = await this.merchantsService.getByOwnerId(ownerId);
    const { data, error } = await this.supabase
      .getClient()
      .from('claims')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async updateStatus(id: string, status: string, ownerId: string) {
    const merchant = await this.merchantsService.getByOwnerId(ownerId);
    
    const { data: claim, error: fetchError } = await this.supabase
      .getClient()
      .from('claims')
      .select('merchant_id')
      .eq('id', id)
      .single();

    if (fetchError || !claim) throw new NotFoundException('Claim not found');
    if (claim.merchant_id !== merchant.id) throw new ForbiddenException();

    const { error } = await this.supabase
      .getClient()
      .from('claims')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  async uploadProof(id: string, file: Express.Multer.File) {
    const { data: claim, error: fetchError } = await this.supabase
      .getClient()
      .from('claims')
      .select('merchant_id')
      .eq('id', id)
      .single();

    if (fetchError || !claim) throw new NotFoundException('Claim not found');

    const fileExt = file.originalname.split('.').pop();
    const filePath = `${claim.merchant_id}/${id}/proof.${fileExt}`;

    const { error: uploadError } = await this.supabase
      .getClient()
      .storage
      .from('claim-proofs')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = this.supabase
      .getClient()
      .storage
      .from('claim-proofs')
      .getPublicUrl(filePath);

    const { error: updateError } = await this.supabase
      .getClient()
      .from('claims')
      .update({ proof_url: publicUrl, proof_submitted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) throw updateError;

    return { publicUrl };
  }
}
