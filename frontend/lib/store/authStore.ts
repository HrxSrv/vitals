'use client';

import { create } from 'zustand';
import { supabase } from '../supabase';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),

  login: async (email, password) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false });
      throw error;
    }
    const u = data.user;
    set({
      user: {
        id: u.id,
        email: u.email ?? '',
        name: (u.user_metadata?.name as string) ?? u.email ?? '',
      },
      isAuthenticated: true,
      isLoading: false,
    });
  },

  signup: async (email, password, name) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      set({ isLoading: false });
      throw error;
    }
    const u = data.user;
    if (u) {
      set({
        user: { id: u.id, email: u.email ?? '', name },
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false });
  },

  refreshSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const u = session.user;
      set({
        user: {
          id: u.id,
          email: u.email ?? '',
          name: (u.user_metadata?.name as string) ?? u.email ?? '',
        },
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
