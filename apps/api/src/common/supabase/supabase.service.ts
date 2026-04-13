import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private clientInstance: SupabaseClient;

  getClient() {
    if (this.clientInstance) return this.clientInstance;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      this.logger.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing');
      throw new Error('Supabase configuration missing');
    }

    this.clientInstance = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    return this.clientInstance;
  }
}
