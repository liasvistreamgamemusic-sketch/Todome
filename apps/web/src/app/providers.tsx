'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { CommandPaletteProvider } from '@/components/command-palette/command-palette-provider';
import { KeyboardShortcuts } from '@/components/shortcuts/keyboard-shortcuts';
import { useSettingsEffects } from '@/hooks/use-settings-effects';
import { useReminderScheduler } from '@/hooks/use-reminder-scheduler';

// Tauri: cors-fetch plugin proxies ALL https:// fetch by default, which breaks
// Next.js internal navigation. Exclude Tauri's own origin (tauri.localhost and
// localhost) so internal requests use native fetch, while external URLs
// (Supabase API, ICS calendar feeds, etc.) are proxied through Rust's reqwest.
if (typeof window !== 'undefined' && 'CORSFetch' in window) {
  (window as unknown as { CORSFetch: { config: (opts: { exclude: RegExp[] }) => void } }).CORSFetch.config({
    exclude: [/tauri\.localhost/, /^https?:\/\/localhost[:/]/],
  });
}

function SettingsAndReminders(): null {
  useSettingsEffects();
  useReminderScheduler();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: true,
            networkMode: 'offlineFirst',
          },
          mutations: {
            networkMode: 'offlineFirst',
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <CommandPaletteProvider>
          <KeyboardShortcuts />
          <SettingsAndReminders />
          {children}
        </CommandPaletteProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
