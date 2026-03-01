'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@todome/db';
import { LoginForm } from '@/components/auth/login-form';
import { SignupForm } from '@/components/auth/signup-form';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace('/notes');
      } else {
        setReady(true);
      }
    });
  }, [router]);

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
  };

  if (!ready) return null;

  return mode === 'login' ? (
    <LoginForm onToggleMode={toggleMode} />
  ) : (
    <SignupForm onToggleMode={toggleMode} />
  );
}
