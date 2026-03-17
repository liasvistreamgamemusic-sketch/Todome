'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUserId } from '@/hooks/queries/use-auth';
import { useClaimInvite } from '@/hooks/queries';
import { supabase } from '@todome/db';

type InviteState = 'loading' | 'ready' | 'claiming' | 'success' | 'error';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const userId = useUserId();
  const claimInvite = useClaimInvite();

  const [state, setState] = useState<InviteState>('loading');
  const [calendarName, setCalendarName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchInvite() {
      // Tables not yet in Database type — use untyped query via `as never`
      const { data: member, error: memberErr } = await (supabase
        .from('shared_calendar_members' as never)
        .select('shared_calendar_id, status')
        .eq('invite_token' as never, token as never)
        .single() as unknown as Promise<{ data: { shared_calendar_id: string; status: string } | null; error: unknown }>);

      if (cancelled) return;

      if (memberErr || !member) {
        setError('招待リンクが無効です');
        setState('error');
        return;
      }

      if (member.status !== 'pending') {
        setError('この招待は既に使用されています');
        setState('error');
        return;
      }

      const { data: calendar } = await (supabase
        .from('shared_calendars' as never)
        .select('title, owner_id')
        .eq('id' as never, member.shared_calendar_id as never)
        .single() as unknown as Promise<{ data: { title: string; owner_id: string } | null; error: unknown }>);

      if (cancelled) return;

      // Prevent owner from joining their own calendar
      if (userId && calendar?.owner_id === userId) {
        setError('自分が作成したカレンダーには参加できません');
        setState('error');
        return;
      }

      setCalendarName(calendar?.title ?? '共有カレンダー');
      setState('ready');
    }

    void fetchInvite();
    return () => { cancelled = true; };
  }, [token, userId]);

  const handleAccept = () => {
    if (!userId) {
      router.push('/login');
      return;
    }

    setState('claiming');
    claimInvite.mutate(token, {
      onSuccess: () => {
        setState('success');
        setTimeout(() => router.push('/calendar'), 1500);
      },
      onError: () => {
        setError('参加に失敗しました');
        setState('error');
      },
    });
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center p-4">
      <div className="glass w-full max-w-sm rounded-2xl border p-8">
        {state === 'loading' && <LoadingView />}
        {state === 'error' && <ErrorView message={error!} />}
        {state === 'ready' && (
          <ReadyView
            calendarName={calendarName!}
            onAccept={handleAccept}
          />
        )}
        {state === 'claiming' && (
          <ClaimingView calendarName={calendarName!} />
        )}
        {state === 'success' && <SuccessView />}
      </div>
    </div>
  );
}

/* ---------- Sub-views ---------- */

function LoadingView() {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      <p className="text-sm text-text-secondary">招待を確認しています...</p>
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <CalendarIcon className="text-text-tertiary" />
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}

function ReadyView({
  calendarName,
  onAccept,
}: {
  calendarName: string;
  onAccept: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-2 text-center">
      <CalendarIcon className="text-accent" />
      <div className="space-y-1">
        <p className="text-xs text-text-tertiary">共有カレンダーへの招待</p>
        <h1 className="text-lg font-semibold text-text-primary">
          {calendarName}
        </h1>
      </div>
      <button
        type="button"
        onClick={onAccept}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-bg-primary transition-opacity hover:opacity-80 active:opacity-70"
      >
        参加する
      </button>
    </div>
  );
}

function ClaimingView({ calendarName }: { calendarName: string }) {
  return (
    <div className="flex flex-col items-center gap-6 py-2 text-center">
      <CalendarIcon className="text-accent" />
      <div className="space-y-1">
        <p className="text-xs text-text-tertiary">共有カレンダーへの招待</p>
        <h1 className="text-lg font-semibold text-text-primary">
          {calendarName}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
        <p className="text-sm text-text-secondary">参加しています...</p>
      </div>
    </div>
  );
}

function SuccessView() {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
        <svg
          className="h-6 w-6 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </div>
      <p className="text-sm text-text-secondary">
        参加しました！カレンダーに移動します...
      </p>
    </div>
  );
}

/* ---------- Shared icon ---------- */

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`h-12 w-12 ${className ?? ''}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  );
}
