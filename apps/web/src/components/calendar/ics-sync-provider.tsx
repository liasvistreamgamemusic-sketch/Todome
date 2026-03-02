'use client';

import { useIcsSync } from '@/hooks/use-ics-sync';

/**
 * Invisible provider component that mounts the ICS sync hook.
 * Place in app layout so sync runs on app load.
 */
export const IcsSyncProvider = () => {
  useIcsSync();
  return null;
};
