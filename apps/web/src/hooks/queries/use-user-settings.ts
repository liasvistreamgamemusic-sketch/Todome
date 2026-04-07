'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { loadUserSettings, upsertUserSettings } from '@todome/db';
import type { UserSettings } from '@todome/db';
import { queryKeys } from './keys';
import { useUserId } from './use-auth';

export function useUserSettings() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.userSettings(userId ?? ''),
    queryFn: () => loadUserSettings(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (patch: Partial<Pick<UserSettings, 'email_reminders_enabled' | 'lock_password_hash' | 'lock_salt'>>) =>
      upsertUserSettings(userId!, patch),
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userSettings(userId) });
      }
    },
  });
}
