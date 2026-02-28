'use client';

import { useCallback, useEffect } from 'react';
import { useUiStore } from '@todome/store';
import { CommandPalette } from './command-palette';

export const CommandPaletteProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const toggleCommandPalette = useUiStore((s) => s.toggleCommandPalette);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    },
    [toggleCommandPalette],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
};
