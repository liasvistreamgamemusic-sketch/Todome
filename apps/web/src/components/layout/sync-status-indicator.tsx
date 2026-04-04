'use client';

import { useEffect, useState } from 'react';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { useUiStore, useTranslation } from '@todome/store';

export function SyncStatusIndicator() {
  const syncStatus = useUiStore((s) => s.syncStatus);
  const syncError = useUiStore((s) => s.syncError);
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (syncStatus === 'synced') {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
    if (syncStatus === 'syncing' || syncStatus === 'error') {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [syncStatus]);

  if (!visible || syncStatus === 'idle') return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 text-xs">
      {syncStatus === 'syncing' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
          <span className="text-text-secondary">{t('offline.syncing')}</span>
        </>
      )}
      {syncStatus === 'synced' && (
        <>
          <Check className="h-3 w-3 text-green-500" />
          <span className="text-text-secondary">{t('offline.synced')}</span>
        </>
      )}
      {syncStatus === 'error' && (
        <span className="flex items-center gap-1.5" title={syncError ?? undefined}>
          <AlertTriangle className="h-3 w-3 text-red-500" />
          <span className="text-red-600 dark:text-red-400">
            {t('offline.syncError')}
          </span>
        </span>
      )}
    </div>
  );
}
