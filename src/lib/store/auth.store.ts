import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  _authListenerSubscription: { unsubscribe: () => void } | null;

  // Actions
  signInWithOTP: (phone: string) => Promise<{ error: string | null }>;
  verifyOTP: (phone: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  initSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  _authListenerSubscription: null,

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
    const { _authListenerSubscription } = get();
    if (_authListenerSubscription) {
      _authListenerSubscription.unsubscribe();
    }
    await supabase.auth.signOut();
    set({ session: null, user: null, isAuthenticated: false, _authListenerSubscription: null });
  },

  initSession: async () => {
    const state = get();
    if (state._authListenerSubscription) return; // already initialized

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
      });
    });

    set({ _authListenerSubscription: subscription });
  },
}));
