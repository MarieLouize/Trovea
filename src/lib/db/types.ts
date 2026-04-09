// This file will eventually be replaced by `supabase gen types typescript --schema trovea`
// once the project is connected to a live Supabase instance.
// For now, re-export application types as the DB row types.

export type {
  Merchant,
  Drop,
  Enquiry,
  AvailabilityWindow,
  Booking,
  StoreReport,
  AdminLogEntry,
} from '../types/merchant.types';

export type {
  Product,
} from '../types/product.types';

export type {
  Receipt,
} from '../types/receipt.types';

export type {
  ClaimRequest as Claim,
} from '../types/store-config.types';

export interface Profile {
  id: string;
  display_name: string;
  whatsapp: string | null;
  role: 'curator' | 'buyer' | 'admin';
  created_at: string;
  updated_at: string;
}
