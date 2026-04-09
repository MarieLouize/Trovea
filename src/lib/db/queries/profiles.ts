import { db } from '@/lib/db';
import type { Profile } from '../types';

/**
 * Get a profile by its ID.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Failed to get profile:', error);
    return null;
  }

  return data;
}

/**
 * Create or update a profile.
 */
export async function upsertProfile(data: Partial<Profile> & { id: string }): Promise<boolean> {
  const { error } = await db
    .from('profiles')
    .upsert(data);

  if (error) {
    console.error('Failed to upsert profile:', error);
    return false;
  }

  return true;
}
