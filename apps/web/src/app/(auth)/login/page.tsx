'use client';

import { useState } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { SignupForm } from '@/components/auth/signup-form';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
  };

  return mode === 'login' ? (
    <LoginForm onToggleMode={toggleMode} />
  ) : (
    <SignupForm onToggleMode={toggleMode} />
  );
}
