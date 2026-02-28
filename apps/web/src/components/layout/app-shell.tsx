'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUiStore } from '@todome/store';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { Header } from './header';
import { clsx } from 'clsx';

const DESKTOP_QUERY = '(min-width: 768px)';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const sidebarRef = useRef<HTMLDivElement>(null);

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

  const closeMobileSidebar = useCallback(() => {
    const store = useUiStore.getState();
    if (store.sidebarOpen) {
      store.toggleSidebar();
    }
  }, []);

  const showMobileOverlay = mounted && !isDesktop && sidebarOpen;

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Desktop sidebar */}
      {isDesktop && <Sidebar />}

      {/* Mobile sidebar overlay */}
      {showMobileOverlay && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-200"
            onClick={closeMobileSidebar}
            aria-hidden="true"
          />
          <div
            ref={sidebarRef}
            className="fixed inset-y-0 left-0 z-50 w-sidebar animate-slide-in"
          >
            <Sidebar />
          </div>
        </>
      )}

      {/* Main content area */}
      <div className="flex flex-1 min-w-0 flex-col">
        {mounted && !isDesktop && <Header />}

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
