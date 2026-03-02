'use client';

import { useRealtimeSync } from '@/hooks/queries';
import { BottomNav } from './bottom-nav';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  useRealtimeSync();

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scrollbar-thin pb-14">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};
