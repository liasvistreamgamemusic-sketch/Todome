'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useKeyboardShortcut } from '@todome/hooks';
import { useUiStore } from '@todome/store';

export const KeyboardShortcuts = () => {
  const router = useRouter();
  const toggleCommandPalette = useUiStore((s) => s.toggleCommandPalette);

  const handleNewNote = useCallback(() => {
    router.push('/notes?new=true');
  }, [router]);

  const handleNewTodo = useCallback(() => {
    router.push('/todos?new=true');
  }, [router]);

  const handleSettings = useCallback(() => {
    router.push('/settings');
  }, [router]);

  const handleSave = useCallback(() => {
    // Dispatch a custom event that individual editors can listen to
    document.dispatchEvent(new CustomEvent('todome:save'));
  }, []);

  const handleEscape = useCallback(() => {
    // Dispatch a custom event for closing panels/modals
    document.dispatchEvent(new CustomEvent('todome:escape'));
  }, []);

  useKeyboardShortcut('cmd+n', handleNewNote);
  useKeyboardShortcut('cmd+k', toggleCommandPalette);
  useKeyboardShortcut('cmd+s', handleSave);
  useKeyboardShortcut('cmd+shift+t', handleNewTodo);
  useKeyboardShortcut('cmd+,', handleSettings);
  useKeyboardShortcut('escape', handleEscape);

  return null;
};
