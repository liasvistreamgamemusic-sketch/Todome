'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  loadAllSharedCalendarMembers,
  getMemberDisplayNames,
} from '@todome/db';
import type { SharedCalendarMember } from '@todome/db';
import { useSharedCalendars, queryKeys } from './queries';

const MEMBER_COLORS = [
  '#4285F4', '#EA4335', '#34A853', '#FF6D01',
  '#7986CB', '#46BDC6', '#E67C73', '#FBBC04',
] as const;

export type MemberInfo = {
  displayName: string;
  color: string;
};

/**
 * Resolves shared calendar member user IDs to display names and auto-assigned colors.
 * Colors are assigned based on member index within each calendar (consistent for all viewers).
 */
export function useMemberMap() {
  const { data: calendars = [] } = useSharedCalendars();

  const calendarIds = useMemo(
    () => calendars.map((c) => c.id),
    [calendars],
  );

  const { data: allMembersRaw = [] } = useQuery({
    queryKey: queryKeys.sharedCalendars.allMembers(calendarIds),
    queryFn: () => loadAllSharedCalendarMembers(calendarIds),
    enabled: calendarIds.length > 0,
  });

  // Build member list with stable index per calendar for color assignment
  const allMembers = useMemo(() => {
    const members: { userId: string; calendarId: string; index: number }[] = [];
    // Group by calendar to assign per-calendar indices
    const byCalendar = new Map<string, SharedCalendarMember[]>();
    for (const m of allMembersRaw) {
      const list = byCalendar.get(m.shared_calendar_id) ?? [];
      list.push(m);
      byCalendar.set(m.shared_calendar_id, list);
    }
    for (const [calendarId, calMembers] of byCalendar) {
      const active = calMembers.filter((m) => m.status === 'active' && m.user_id);
      active.forEach((m, idx) => {
        members.push({ userId: m.user_id!, calendarId, index: idx });
      });
    }
    return members;
  }, [allMembersRaw]);

  const uniqueUserIds = useMemo(
    () => [...new Set(allMembers.map((m) => m.userId))],
    [allMembers],
  );

  const { data: displayNames = new Map<string, string>() } = useQuery({
    queryKey: queryKeys.sharedCalendars.displayNames(uniqueUserIds),
    queryFn: () => getMemberDisplayNames(uniqueUserIds),
    enabled: uniqueUserIds.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const memberMap = useMemo(() => {
    const map = new Map<string, MemberInfo>();
    for (const member of allMembers) {
      if (map.has(member.userId)) continue; // First occurrence wins
      map.set(member.userId, {
        displayName: displayNames.get(member.userId) ?? member.userId.slice(0, 8),
        color: MEMBER_COLORS[member.index % MEMBER_COLORS.length]!,
      });
    }
    return map;
  }, [allMembers, displayNames]);

  return memberMap;
}
