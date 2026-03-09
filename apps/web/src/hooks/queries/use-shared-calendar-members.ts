'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  loadSharedCalendarMembers,
  createInviteToken,
  claimInvite,
  removeSharedCalendarMember,
  updateMemberVisibility,
} from '@todome/db';
import { queryKeys } from './keys';
import { useUserId } from './use-auth';

export function useSharedCalendarMembers(calendarId: string | null) {
  return useQuery({
    queryKey: queryKeys.sharedCalendars.members(calendarId ?? ''),
    queryFn: () => loadSharedCalendarMembers(calendarId!),
    enabled: !!calendarId,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (calendarId: string) => createInviteToken(calendarId),
    onSuccess: (_data, calendarId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sharedCalendars.members(calendarId),
      });
    },
  });
}

export function useClaimInvite() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (token: string) => claimInvite(token, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedCalendars'] });
    },
  });
}

export function useRemoveSharedCalendarMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => removeSharedCalendarMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedCalendars'] });
    },
  });
}

export function useToggleMemberVisibility() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: ({
      memberId,
      isVisible,
    }: {
      memberId: string;
      isVisible: boolean;
    }) => updateMemberVisibility(memberId, isVisible),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sharedCalendars.all(userId ?? ''),
      });
      queryClient.invalidateQueries({
        queryKey: ['sharedCalendarEvents'],
      });
    },
  });
}
