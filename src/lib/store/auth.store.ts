import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  signInWithOTP: (phone: string) => Promise<{ error: string | null }>;
  verifyOTP: (phone: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  initSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,

  signInWithOTP: async (phone) => {
    // Normalise Nigerian phone numbers
    const cleanPhone = phone.startsWith('0')
      ? '+234' + phone.slice(1)
      : phone;

    const { error } = await supabase.auth.signInWithOtp({
      phone: cleanPhone,
    });
    return { error: error?.message ?? null };
  },

  verifyOTP: async (phone, token) => {
    const cleanPhone = phone.startsWith('0')
      ? '+234' + phone.slice(1)
      : phone;

    const { data, error } = await supabase.auth.verifyOtp({
      phone: cleanPhone,
      token,
      type: 'sms',
    });

    if (data.session) {
      set({
        session: data.session,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    }

    return { error: error?.message ?? null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, isAuthenticated: false });
  },

  initSession: async () => {
    set({ isLoading: true });
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      set({
        session,
        user: session.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
      });
    });
  },
}));
