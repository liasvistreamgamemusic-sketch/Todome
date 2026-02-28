import { useCallback, useEffect } from 'react';

interface KeyboardShortcutOptions {
  enabled?: boolean;
}

interface ParsedShortcut {
  meta: boolean;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

const isMac = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};

const parseShortcut = (shortcut: string): ParsedShortcut => {
  const parts = shortcut.split('+').map((p) => p.trim().toLowerCase());
  const mac = isMac();

  return {
    meta: parts.includes('cmd') && mac,
    ctrl: parts.includes('ctrl') || (parts.includes('cmd') && !mac),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option'),
    key: parts.filter(
      (p) => !['cmd', 'ctrl', 'shift', 'alt', 'option'].includes(p),
    )[0] ?? '',
  };
};

export const useKeyboardShortcut = (
  shortcut: string,
  callback: () => void,
  options: KeyboardShortcutOptions = {},
): void => {
  const { enabled = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const parsed = parseShortcut(shortcut);

      const keyMatch = event.key.toLowerCase() === parsed.key;
      const metaMatch = parsed.meta ? event.metaKey : !event.metaKey;
      const ctrlMatch = parsed.ctrl ? event.ctrlKey : !event.ctrlKey;
      const shiftMatch = parsed.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = parsed.alt ? event.altKey : !event.altKey;

      if (keyMatch && metaMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        callback();
      }
    },
    [shortcut, callback, enabled],
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
};
