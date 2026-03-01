'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@todome/db';

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session?.user) {
        setAuthState('authenticated');
      } else {
        window.location.href = '/login';
      }
    }

    void checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = '/login';
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (authState !== 'authenticated') {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  return <>{children}</>;
}
