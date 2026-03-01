'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@todome/db';

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session?.user) {
        setAuthState('authenticated');
      } else {
        router.replace('/login');
      }
    }

    void checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  if (authState !== 'authenticated') {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  return <>{children}</>;
}
