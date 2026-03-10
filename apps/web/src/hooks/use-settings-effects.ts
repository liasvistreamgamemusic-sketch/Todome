'use client';

import { useEffect } from 'react';
import { useUiStore } from '@todome/store';

function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function useSettingsEffects(): void {
  const fontSize = useUiStore((s) => s.fontSize);
  const locale = useUiStore((s) => s.locale);

  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (isTauriEnv()) return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
}
