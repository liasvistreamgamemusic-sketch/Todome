'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@todome/ui';
import { Input } from '@todome/ui';
import { clsx } from 'clsx';

type SignupFormProps = {
  onToggleMode: () => void;
};

const PASSWORD_MIN_LENGTH = 8;

export const SignupForm = ({ onToggleMode }: SignupFormProps) => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateForm = useCallback((): string | null => {
    if (!email.trim()) {
      return 'メールアドレスを入力してください';
    }
    if (!password) {
      return 'パスワードを入力してください';
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      return `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`;
    }
    if (password !== confirmPassword) {
      return 'パスワードが一致しません';
    }
    return null;
  }, [email, password, confirmPassword]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        return;
      }

      setLoading(true);
      try {
        const { supabase } = await import('@todome/db');
        const { error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (authError) {
          setError(authError.message);
          return;
        }

        router.push('/notes');
        router.refresh();
      } catch {
        setError('アカウントの作成に失敗しました。もう一度お試しください。');
      } finally {
        setLoading(false);
      }
    },
    [email, password, validateForm, router],
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
        <div>
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
            autoComplete="new-password"
            required
          />
          <p className="mt-1 text-xs text-text-tertiary">
            {PASSWORD_MIN_LENGTH}文字以上で入力してください
          </p>
        </div>
        <Input
          type={showPassword ? 'text' : 'password'}
          label="パスワード確認"
          placeholder="パスワードを再入力"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock />}
          autoComplete="new-password"
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
        アカウント作成
      </Button>

      <p className="text-center text-sm text-text-secondary">
        すでにアカウントをお持ちの方は{' '}
        <button
          type="button"
          onClick={onToggleMode}
          className="font-medium text-[var(--accent)] hover:underline"
        >
          ログイン
        </button>
      </p>
    </form>
  );
};
