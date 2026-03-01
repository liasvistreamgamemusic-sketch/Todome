'use client';

import { useEffect } from 'react';
import { supabase } from '@todome/db';

export default function Home() {
  useEffect(() => {
    async function redirect() {
      const { data: { session } } = await supabase.auth.getSession();
      window.location.href = session?.user ? '/notes' : '/login';
    }
    void redirect();
  }, []);

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-bg-primary">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>
  );
}
