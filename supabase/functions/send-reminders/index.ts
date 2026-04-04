// ---------------------------------------------------------------------------
// Supabase Edge Function: send-reminders
//
// Triggered by pg_cron every minute. Queries todos and calendar events with
// due reminders, sends Web Push notifications, and marks them as reminded.
// ---------------------------------------------------------------------------

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@todome.app';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface ReminderRow {
  id: string;
  user_id: string;
  title: string;
  remind_at: string;
}

interface PushSubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

Deno.serve(async (req) => {
  // Only allow POST with a valid service-role bearer token
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date();
  const nowIso = now.toISOString();
  // Only process reminders from the last 10 minutes to avoid blasting old ones
  const windowStart = new Date(now.getTime() - 10 * 60_000).toISOString();

  // ---- Fetch due reminders ------------------------------------------------
  const [todosRes, eventsRes] = await Promise.all([
    supabase
      .from('todos')
      .select('id, user_id, title, remind_at')
      .gte('remind_at', windowStart)
      .lte('remind_at', nowIso)
      .not('status', 'in', '("completed","cancelled")')
      .eq('is_deleted', false)
      .or('reminded_at.is.null,reminded_at.lt.remind_at')
      .limit(200),
    supabase
      .from('calendar_events')
      .select('id, user_id, title, remind_at')
      .gte('remind_at', windowStart)
      .lte('remind_at', nowIso)
      .eq('is_deleted', false)
      .or('reminded_at.is.null,reminded_at.lt.remind_at')
      .limit(200),
  ]);

  const items: (ReminderRow & { type: 'todo' | 'event' })[] = [
    ...((todosRes.data ?? []) as ReminderRow[]).map((r) => ({ ...r, type: 'todo' as const })),
    ...((eventsRes.data ?? []) as ReminderRow[]).map((r) => ({ ...r, type: 'event' as const })),
  ];

  if (items.length === 0) {
    return Response.json({ sent: 0, failed: 0, items: 0 });
  }

  // ---- Group by user_id ---------------------------------------------------
  const byUser = new Map<string, typeof items>();
  for (const item of items) {
    const list = byUser.get(item.user_id) ?? [];
    list.push(item);
    byUser.set(item.user_id, list);
  }

  // ---- Fetch subscriptions for relevant users -----------------------------
  const userIds = [...byUser.keys()];
  const { data: allSubs } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds);

  const subsByUser = new Map<string, (PushSubRow & { user_id: string })[]>();
  for (const sub of (allSubs ?? []) as (PushSubRow & { user_id: string })[]) {
    const list = subsByUser.get(sub.user_id) ?? [];
    list.push(sub);
    subsByUser.set(sub.user_id, list);
  }

  // ---- Send push notifications --------------------------------------------
  let sent = 0;
  let failed = 0;
  const staleSubIds: string[] = [];
  const remindedTodoIds: string[] = [];
  const remindedEventIds: string[] = [];

  for (const [userId, userItems] of byUser) {
    const subs = subsByUser.get(userId);
    if (!subs || subs.length === 0) {
      // No subscriptions — still mark as reminded to avoid re-querying
      for (const item of userItems) {
        (item.type === 'todo' ? remindedTodoIds : remindedEventIds).push(item.id);
      }
      continue;
    }

    for (const item of userItems) {
      const payload = JSON.stringify({
        title: item.type === 'todo' ? 'Todo\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC' : '\u30AB\u30EC\u30F3\u30C0\u30FC\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC',
        body: `\u300C${item.title}\u300D${item.type === 'todo' ? '\u306E\u671F\u9650\u3067\u3059' : '\u307E\u3082\u306A\u304F\u958B\u59CB'}`,
        data: { type: item.type, id: item.id },
      });

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
          sent++;
        } catch (err: unknown) {
          failed++;
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            staleSubIds.push(sub.id);
          }
        }
      }

      (item.type === 'todo' ? remindedTodoIds : remindedEventIds).push(item.id);
    }
  }

  // ---- Batch updates -------------------------------------------------------
  const updates: Promise<unknown>[] = [];

  if (remindedTodoIds.length > 0) {
    updates.push(
      supabase.from('todos').update({ reminded_at: nowIso }).in('id', remindedTodoIds),
    );
  }
  if (remindedEventIds.length > 0) {
    updates.push(
      supabase.from('calendar_events').update({ reminded_at: nowIso }).in('id', remindedEventIds),
    );
  }
  if (staleSubIds.length > 0) {
    updates.push(
      supabase.from('push_subscriptions').delete().in('id', staleSubIds),
    );
  }

  await Promise.all(updates);

  return Response.json({ sent, failed, items: items.length });
});
