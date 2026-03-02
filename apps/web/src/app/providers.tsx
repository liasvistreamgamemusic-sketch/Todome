'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { CommandPaletteProvider } from '@/components/command-palette/command-palette-provider';
import { KeyboardShortcuts } from '@/components/shortcuts/keyboard-shortcuts';

// Tauri: cors-fetch plugin proxies ALL fetch by default, which breaks Next.js
// internal RSC flight requests. Restrict it to only proxy Supabase API calls.
if (typeof window !== 'undefined' && 'CORSFetch' in window) {
  (window as unknown as { CORSFetch: { config: (opts: { include: RegExp[] }) => void } }).CORSFetch.config({
    include: [/supabase\.co/],
  });
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
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <CommandPaletteProvider>
          <KeyboardShortcuts />
          {children}
        </CommandPaletteProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
