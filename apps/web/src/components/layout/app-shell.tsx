'use client';

import { useEffect, useRef, useState } from 'react';
import { useUiStore } from '@todome/store';
import { useDataProvider } from '@/hooks/use-data-provider';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { clsx } from 'clsx';

const DESKTOP_QUERY = '(min-width: 768px)';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  // Loads data from Supabase or localDb on mount and syncs every 30s.
  // Runs in the background — UI renders immediately with empty state then fills in.
  const { isLoading: _isDataLoading } = useDataProvider();

  // SSR-safe media query — default true (desktop) to avoid hydration flash
  const [isDesktop, setIsDesktop] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    setIsDesktop(mql.matches);
    setMounted(true);

    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Auto-adjust sidebar on breakpoint change (skip initial mount)
  const prevIsDesktopRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!mounted) return;
    if (prevIsDesktopRef.current === null) {
      prevIsDesktopRef.current = isDesktop;
      return;
    }
    if (prevIsDesktopRef.current !== isDesktop) {
      const store = useUiStore.getState();
      if (isDesktop && !store.sidebarOpen) {
        store.toggleSidebar();
      } else if (!isDesktop && store.sidebarOpen) {
        store.toggleSidebar();
      }
      prevIsDesktopRef.current = isDesktop;
    }
  }, [isDesktop, mounted]);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Desktop sidebar */}
      {isDesktop && <Sidebar />}

      {/* Main content area */}
      <div className="flex flex-1 min-w-0 flex-col">
        <main
          className={clsx(
            'flex-1 overflow-y-auto scrollbar-thin',
            mounted && !isDesktop && 'pb-14',
          )}
        >
          {children}
        </main>

        {mounted && !isDesktop && <BottomNav />}
      </div>
    </div>
  );
};
