'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/authStore';
import { fetchProfiles, createProfile } from '@/lib/api/profiles';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();
  const initialized = useRef(false);

  useEffect(() => {
    // Always start in loading state — prevents stale store state from
    // triggering auth guards before the real session is confirmed
    setLoading(true);
    initialized.current = false;

    // Subscribe to auth changes FIRST so we don't miss events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Skip until getSession() has resolved — prevents flicker from
      // INITIAL_SESSION / TOKEN_REFRESHED firing before we're ready
      if (!initialized.current) return;

      if (session?.user) {
        const u = session.user;
        setUser({
          id: u.id,
          email: u.email ?? '',
          name: (u.user_metadata?.name as string) ?? u.email ?? '',
        });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      // Ignore all other null-session events (TOKEN_REFRESHED race conditions etc.)
    });

    // getSession() is the authoritative initial check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;

        // Ensure a default profile exists BEFORE revealing the dashboard.
        // This prevents the brief "Create your first profile" flash on
        // first login while the DB trigger is still running.
        try {
          const profiles = await fetchProfiles();
          if (profiles.length === 0) {
            const name = (u.user_metadata?.name as string) || u.email?.split('@')[0] || 'Me';
            await createProfile({ name, relationship: 'self' });
          }
        } catch {
          // Non-fatal — DB trigger likely created the profile already
        }

        // Only now clear isLoading so the dashboard can render
        setUser({
          id: u.id,
          email: u.email ?? '',
          name: (u.user_metadata?.name as string) ?? u.email ?? '',
        });
      } else {
        setUser(null);
      }

      // Now that initial state is set, allow onAuthStateChange to handle live updates
      initialized.current = true;
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  return <>{children}</>;
}
