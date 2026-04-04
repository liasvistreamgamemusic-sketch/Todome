'use client';

import { useRealtimeSync } from '@/hooks/queries';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { BottomNav } from './bottom-nav';
import { OfflineBanner } from './offline-banner';
import { SyncStatusIndicator } from './sync-status-indicator';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  useRealtimeSync();
  useOfflineSync();

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <OfflineBanner />
      <SyncStatusIndicator />
      <main className="relative flex-1 overflow-y-auto scrollbar-thin">
        {children}
        <span className="absolute bottom-0 right-2 text-[8px] text-text-tertiary/30 select-none pointer-events-none z-10">
          v{process.env.APP_VERSION}
        </span>
      </main>
      <BottomNav />
    </div>
  );
};
