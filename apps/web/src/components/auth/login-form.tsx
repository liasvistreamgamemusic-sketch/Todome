'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@todome/ui';
import { Input } from '@todome/ui';
import { clsx } from 'clsx';

type LoginFormProps = {
  onToggleMode: () => void;
};

export const LoginForm = ({ onToggleMode }: LoginFormProps) => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!email.trim() || !password.trim()) {
        setError('メールアドレスとパスワードを入力してください');
        return;
      }

      setLoading(true);
      try {
        const { supabase } = await import('@todome/db');
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError) {
          setError(
            authError.message === 'Invalid login credentials'
              ? 'メールアドレスまたはパスワードが正しくありません'
              : authError.message,
          );
          return;
        }

        router.push('/notes');
        router.refresh();
      } catch {
        setError('ログインに失敗しました。もう一度お試しください。');
      } finally {
        setLoading(false);
      }
    },
    [email, password, router],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <Input
          type="email"
          label="メールアドレス"
          placeholder="example@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail />}
          autoComplete="email"
          required
        />
        <Input
          type={showPassword ? 'text' : 'password'}
          label="パスワード"
          placeholder="パスワードを入力"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-text-tertiary hover:text-text-primary transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          autoComplete="current-password"
          required
        />
      </div>

      {error && (
        <div
          className={clsx(
            'rounded-lg border border-[#D32F2F]/20 bg-[#D32F2F]/5 px-3 py-2',
            'text-sm text-[#D32F2F]',
          )}
          role="alert"
        >
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        loading={loading}
      >
        ログイン
      </Button>

      <p className="text-center text-sm text-text-secondary">
        アカウントをお持ちでない方は{' '}
        <button
          type="button"
          onClick={onToggleMode}
          className="font-medium text-[var(--accent)] hover:underline"
        >
          新規登録
        </button>
      </p>
    </form>
  );
};
