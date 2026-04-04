'use client';

import { WifiOff } from 'lucide-react';
import { useOnline } from '@todome/hooks';
import { useUiStore, useTranslation } from '@todome/store';

export function OfflineBanner() {
  const isOnline = useOnline();
  const pendingOpCount = useUiStore((s) => s.pendingOpCount);
  const { t } = useTranslation();

  if (isOnline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500/90 px-3 py-1.5 text-xs font-medium text-amber-950 dark:bg-amber-600/90 dark:text-amber-50">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>{t('offline.youAreOffline')}</span>
      {pendingOpCount > 0 && (
        <span className="rounded-full bg-amber-700/20 px-1.5 py-0.5 text-[10px]">
          {t('offline.pendingChanges', { count: pendingOpCount })}
        </span>
      )}
    </div>
  );
}
