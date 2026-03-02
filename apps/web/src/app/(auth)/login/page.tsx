'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@todome/db';
import { LoginForm } from '@/components/auth/login-form';
import { SignupForm } from '@/components/auth/signup-form';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        window.location.href = '/notes';
      } else {
        setReady(true);
      }
    });
  }, []);

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
