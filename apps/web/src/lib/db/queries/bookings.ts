import { db } from '@/lib/db';
import type { Booking, AvailabilityWindow } from '@/lib/types';

export const getBookingsByMerchant = async (merchantId: string): Promise<Booking[]> => {
  const { data, error } = await db
    .from('bookings')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('scheduled_at', { ascending: true });

  if (error || !data) return [];
  return data as Booking[];
};

export const getWindowsByMerchant = async (merchantId: string): Promise<AvailabilityWindow[]> => {
  const { data, error } = await db
    .from('availability_windows')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('opens_at', { ascending: false });

  if (error || !data) return [];
  return data as AvailabilityWindow[];
};

export const createWindow = async (
  window: Omit<AvailabilityWindow, 'id'>
): Promise<AvailabilityWindow | null> => {
  const { data, error } = await db
    .from('availability_windows')
    .insert(window)
    .select()
    .single();

  if (error || !data) return null;
  return data as AvailabilityWindow;
};
