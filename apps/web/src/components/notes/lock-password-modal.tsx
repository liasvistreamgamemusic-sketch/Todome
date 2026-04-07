'use client';

import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Modal, Input, Button } from '@todome/ui';
import { useTranslation, useNoteStore } from '@todome/store';
import { generateSalt, hashPassword, verifyPassword } from '@/lib/lock-crypto';
import { isWebAuthnSupported, authenticatePasskey } from '@/lib/webauthn';
import { useUserSettings, useUpdateUserSettings } from '@/hooks/queries';

type Props = {
  open: boolean;
  onClose: () => void;
  mode: 'set' | 'verify';
  onSuccess: () => void;
};

export function LockPasswordModal({ open, onClose, mode, onSuccess }: Props) {
  const { t } = useTranslation();
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const setLockPasswordVerified = useNoteStore((s) => s.setLockPasswordVerified);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-attempt biometric auth when verifying and passkey is registered
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open || mode !== 'verify') return;
    const credentialId = settings?.webauthn_credential_id;
    if (!credentialId) return;

    let cancelled = false;
    (async () => {
      const supported = await isWebAuthnSupported();
      if (!supported || cancelled) return;
      const success = await authenticatePasskey(credentialId);
      if (success && !cancelled) {
        setLockPasswordVerified(true);
        handleClose();
        onSuccess();
      }
    })();

    return () => { cancelled = true; };
  }, [open, mode]);

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setError('');
    setShowPassword(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'set') {
        if (password.length < 4) {
          setError(t('notes.lock.passwordTooShort'));
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError(t('notes.lock.passwordMismatch'));
          setLoading(false);
          return;
        }
        const salt = await generateSalt();
        const hash = await hashPassword(password, salt);
        await updateSettings.mutateAsync({ lock_password_hash: hash, lock_salt: salt });
        setLockPasswordVerified(true);
        handleClose();
        onSuccess();
      } else {
        if (!settings?.lock_salt || !settings?.lock_password_hash) {
          setError(t('notes.lock.noPasswordSet'));
          setLoading(false);
          return;
        }
        const isValid = await verifyPassword(password, settings.lock_salt, settings.lock_password_hash);
        if (isValid) {
          setLockPasswordVerified(true);
          handleClose();
          onSuccess();
        } else {
          setError(t('notes.lock.incorrectPassword'));
        }
      }
    } catch {
      setError(t('notes.lock.error'));
    } finally {
      setLoading(false);
    }
  };

  const toggleIcon = (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      className="text-text-tertiary hover:text-text-primary transition-colors"
      tabIndex={-1}
    >
      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={mode === 'set' ? t('notes.lock.setPassword') : t('notes.lock.enterPassword')}
      description={mode === 'set' ? t('notes.lock.setPasswordDescription') : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type={showPassword ? 'text' : 'password'}
          label={t('notes.lock.password')}
          placeholder={t('notes.lock.passwordPlaceholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock />}
          rightIcon={toggleIcon}
          error={mode === 'verify' ? error : undefined}
          autoFocus
        />

        {mode === 'set' && (
          <Input
            type={showPassword ? 'text' : 'password'}
            label={t('notes.lock.confirmPassword')}
            placeholder={t('notes.lock.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            leftIcon={<Lock />}
            error={error || undefined}
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={handleClose} type="button">
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            loading={loading}
            disabled={!password || (mode === 'set' && !confirmPassword)}
          >
            {mode === 'set' ? t('notes.lock.setButton') : t('notes.lock.unlockButton')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
