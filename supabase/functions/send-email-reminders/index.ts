import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderItem {
  id: string
  user_id: string
  title: string
  remind_at: string
  remind_repeat?: string | null
  type: 'todo' | 'event'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const gasWebhookUrl = Deno.env.get('GAS_WEBHOOK_URL')

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const now = new Date().toISOString()

    // Fetch todos with pending reminders
    const { data: todos, error: todosError } = await supabase
      .from('todos')
      .select('id, user_id, title, remind_at, remind_repeat')
      .lte('remind_at', now)
      .gte('remind_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .is('reminded_at', null)
      .not('status', 'in', '("completed","cancelled")')
      .eq('is_deleted', false)

    if (todosError) {
      console.error('Failed to fetch todos:', todosError)
      throw todosError
    }

    // Fetch calendar events with pending reminders
    const { data: events, error: eventsError } = await supabase
      .from('calendar_events')
      .select('id, user_id, title, remind_at')
      .lte('remind_at', now)
      .gte('remind_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .is('reminded_at', null)
      .eq('is_deleted', false)

    if (eventsError) {
      console.error('Failed to fetch events:', eventsError)
      throw eventsError
    }

    // Combine and group by user_id
    const reminders: ReminderItem[] = [
      ...(todos ?? []).map((t) => ({ ...t, type: 'todo' as const })),
      ...(events ?? []).map((e) => ({
        ...e,
        remind_repeat: null,
        type: 'event' as const,
      })),
    ]

    if (reminders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending reminders' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Group by user
    const byUser = new Map<string, ReminderItem[]>()
    for (const r of reminders) {
      const list = byUser.get(r.user_id) ?? []
      list.push(r)
      byUser.set(r.user_id, list)
    }

    let sent = 0
    let skipped = 0
    const errors: string[] = []

    for (const [userId, items] of byUser) {
      // Check user settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('email_reminders_enabled')
        .eq('user_id', userId)
        .single()

      if (!settings?.email_reminders_enabled) {
        skipped += items.length
        // Still mark as reminded to avoid re-processing
        await markReminded(supabase, items, now)
        continue
      }

      // Get user email via admin API
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)

      if (userError || !user?.email) {
        console.error(`Failed to get user email for ${userId}:`, userError)
        skipped += items.length
        await markReminded(supabase, items, now)
        continue
      }

      // Send individual emails per reminder
      for (const item of items) {
        const typeLabel = item.type === 'todo' ? 'Todo' : 'イベント'
        const remindTime = new Date(item.remind_at).toLocaleString('ja-JP', {
          timeZone: 'Asia/Tokyo',
        })

        const result = await sendEmail(gasWebhookUrl, user.email, item.title, typeLabel, remindTime)
        if (result.ok) {
          sent++
        } else {
          errors.push(`${item.title}: ${result.error}`)
        }
      }

      // Mark all items as reminded and handle repeat
      await markReminded(supabase, items, now)
    }

    return new Response(
      JSON.stringify({ sent, skipped, total: reminders.length, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})

async function sendEmail(
  webhookUrl: string | undefined,
  to: string,
  title: string,
  typeLabel: string,
  remindTime: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!webhookUrl) {
    return { ok: false, error: 'GAS_WEBHOOK_URL not set' }
  }

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 24px;">
    <h2 style="margin: 0; color: #2563eb;">Todome</h2>
  </div>
  <p style="font-size: 16px; margin-bottom: 8px;">リマインダー</p>
  <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
    <p style="margin: 0 0 8px; font-size: 18px; font-weight: 600;">${escapeHtml(title)}</p>
    <p style="margin: 0; color: #6b7280; font-size: 14px;">種類: ${typeLabel}</p>
    <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">リマインド時刻: ${remindTime}</p>
  </div>
  <p style="font-size: 12px; color: #9ca3af;">このメールは Todome のリマインダー機能により自動送信されています。</p>
</body>
</html>`

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject: `[Todome] リマインダー: ${escapeHtml(title)}`,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `GAS ${res.status}: ${body}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: `fetch error: ${(err as Error).message}` }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function markReminded(
  supabase: ReturnType<typeof createClient>,
  items: ReminderItem[],
  now: string,
): Promise<void> {
  const todoIds = items.filter((i) => i.type === 'todo').map((i) => i.id)
  const eventIds = items.filter((i) => i.type === 'event').map((i) => i.id)

  // Mark todos as reminded
  if (todoIds.length > 0) {
    await supabase
      .from('todos')
      .update({ reminded_at: now })
      .in('id', todoIds)
  }

  // Mark events as reminded
  if (eventIds.length > 0) {
    await supabase
      .from('calendar_events')
      .update({ reminded_at: now })
      .in('id', eventIds)
  }

  // Handle remind_repeat for todos
  for (const item of items) {
    if (item.type === 'todo' && item.remind_repeat && item.remind_repeat !== 'none') {
      const nextRemindAt = calcNextRemindAt(item.remind_at, item.remind_repeat)
      if (nextRemindAt) {
        await supabase
          .from('todos')
          .update({ remind_at: nextRemindAt, reminded_at: null })
          .eq('id', item.id)
      }
    }
  }
}

function calcNextRemindAt(current: string, repeat: string): string | null {
  const date = new Date(current)
  switch (repeat) {
    case 'daily':
      date.setDate(date.getDate() + 1)
      break
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
    default:
      return null
  }
  return date.toISOString()
}
