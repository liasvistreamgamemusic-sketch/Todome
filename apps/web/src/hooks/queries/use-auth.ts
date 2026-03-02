'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@todome/db';

/**
 * Returns the authenticated user's ID, or null if not authenticated.
 * Listens for auth state changes (login/logout).
 */
export function useUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUserId(null);
          window.location.href = '/login';
        } else {
          setUserId(session?.user?.id ?? null);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  return userId;
}
