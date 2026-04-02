'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile } from '../types';

interface ProfileState {
  activeProfileId: string | null;
  setActiveProfile: (profileId: string) => void;
  getActiveProfile: (profiles: Profile[]) => Profile | null;
  clearActiveProfile: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      activeProfileId: null,

      setActiveProfile: (profileId) => set({ activeProfileId: profileId }),

      getActiveProfile: (profiles) => {
        const id = get().activeProfileId;
        return profiles.find((p) => p.id === id) ?? profiles.find((p) => p.isDefault) ?? profiles[0] ?? null;
      },

      clearActiveProfile: () => set({ activeProfileId: null }),
    }),
    { name: 'vithos-active-profile' }
  )
);
