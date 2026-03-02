'use client';

import { useRealtimeSync } from '@/hooks/queries';
import { BottomNav } from './bottom-nav';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  useRealtimeSync();

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <main className="relative flex-1 overflow-y-auto scrollbar-thin pb-14">
        {children}
        <span className="fixed bottom-14 right-2 text-[8px] text-text-tertiary/30 select-none pointer-events-none z-40">
          v{process.env.APP_VERSION}
        </span>
      </main>
      <BottomNav />
    </div>
  );
};
