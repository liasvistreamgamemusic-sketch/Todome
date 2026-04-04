'use client';

import { useEffect } from 'react';
import { useUiStore } from '@todome/store';
import { isTauriEnv } from '@/lib/notifications';
import { subscribeToPush, isPushSupported } from '@/lib/push-subscription';

export function useSettingsEffects(): void {
  const fontSize = useUiStore((s) => s.fontSize);
  const locale = useUiStore((s) => s.locale);
  const notificationsEnabled = useUiStore((s) => s.notificationsEnabled);

  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Register service worker (PWA only)
  useEffect(() => {
    if (isTauriEnv()) return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  // Auto-subscribe to push when notifications are enabled
  useEffect(() => {
    if (isTauriEnv()) return;
    if (!notificationsEnabled) return;
    if (!isPushSupported()) return;
    subscribeToPush().catch(() => {});
  }, [notificationsEnabled]);
}
