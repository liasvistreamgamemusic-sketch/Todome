import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TZ = 'Asia/Tokyo'
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI','Hiragino Sans','Noto Sans JP',sans-serif"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TodoReminder {
  type: 'todo'
  id: string
  user_id: string
  title: string
  detail: string | null
  priority: number
  due_date: string | null
  remind_at: string
  remind_repeat: string | null
  tags: string[]
  subtasks: { id: string; title: string; completed: boolean }[]
  note_ids: string[]
  is_flagged: boolean
}

interface EventReminder {
  type: 'event'
  id: string
  user_id: string
  title: string
  description: string | null
  start_at: string
  end_at: string
  is_all_day: boolean
  location: string | null
  remind_at: string
  todo_ids: string[]
  note_ids: string[]
}

type ReminderItem = TodoReminder | EventReminder

interface RelatedItem {
  id: string
  title: string
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', {
    timeZone: TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ja-JP', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`
}

function formatTimeRange(start: string, end: string, allDay: boolean): string {
  if (allDay) return `${formatDate(start)} 終日`
  return `${formatDate(start)} ${formatTime(start)} 〜 ${formatTime(end)}`
}

function priorityInfo(p: number): {
  text: string
  color: string
  bg: string
  border: string
} {
  switch (p) {
    case 1:
      return { text: '最高', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' }
    case 2:
      return { text: '高', color: '#ea580c', bg: '#fff7ed', border: '#fdba74' }
    case 3:
      return { text: '中', color: '#ca8a04', bg: '#fefce8', border: '#fde047' }
    default:
      return { text: '低', color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function sanitizeSubject(str: string): string {
  return str.replace(/[\r\n]+/g, ' ')
}

// ---------------------------------------------------------------------------
// Email HTML builders
// ---------------------------------------------------------------------------

/** Small uppercase section label */
function label(text: string): string {
  return `<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;font-weight:600;margin-bottom:6px;">${escapeHtml(text)}</div>`
}

/** Thin horizontal divider */
const DIVIDER =
  '<tr><td style="padding:0 28px;"><div style="border-top:1px solid #e5e7eb;"></div></td></tr>'

/** Wrap content in the shared email shell */
function wrapEmail(subtitle: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:${FONT};">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;">
<tr><td align="center" style="padding:24px 16px;">
<table cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;width:100%;">

<!-- Header -->
<tr><td bgcolor="#f59e0b" style="background-color:#f59e0b;background:linear-gradient(135deg,#f59e0b 0%,#ea580c 100%);border-radius:12px 12px 0 0;padding:24px 28px;">
<div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">REMINDER</div>
<div style="font-size:16px;font-weight:500;color:#ffffff;">${escapeHtml(subtitle)}</div>
</td></tr>

<!-- Body -->
<tr><td style="background:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
<table cellpadding="0" cellspacing="0" border="0" width="100%">${body}</table>
</td></tr>

<!-- Footer -->
<tr><td style="background:#fafafa;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:14px 28px;text-align:center;">
<div style="font-size:11px;color:#a1a1aa;">このメールはリマインダー機能により自動送信されています</div>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`
}

// ---------------------------------------------------------------------------
// Event email
// ---------------------------------------------------------------------------

function buildEventEmail(
  item: EventReminder,
  relatedTodos: RelatedItem[],
  relatedNotes: RelatedItem[],
): string {
  const time = formatTimeRange(item.start_at, item.end_at, item.is_all_day)
  const parts: string[] = []

  // Title
  parts.push(`<tr><td style="padding:24px 28px 16px;">
<div style="font-size:20px;font-weight:700;color:#111827;line-height:1.4;">${escapeHtml(item.title)}</div>
</td></tr>`)

  // Time — amber accent block
  parts.push(`<tr><td style="padding:0 28px 16px;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 6px 6px 0;">
<tr><td style="padding:12px 16px;">
${label('時間')}
<div style="font-size:15px;color:#92400e;font-weight:600;">${time}</div>
</td></tr>
</table>
</td></tr>`)

  // Location
  if (item.location) {
    parts.push(`<tr><td style="padding:0 28px 16px;">
${label('場所')}
<div style="font-size:14px;color:#374151;">${escapeHtml(item.location)}</div>
</td></tr>`)
  }

  // Description
  if (item.description) {
    parts.push(DIVIDER)
    parts.push(`<tr><td style="padding:16px 28px;">
<div style="background:#f9fafb;border-left:3px solid #d1d5db;border-radius:0 6px 6px 0;padding:12px 16px;">
${label('メモ')}
<div style="font-size:14px;color:#4b5563;line-height:1.6;white-space:pre-wrap;">${escapeHtml(item.description)}</div>
</div>
</td></tr>`)
  }

  // Related TODOs
  if (relatedTodos.length > 0) {
    parts.push(DIVIDER)
    const rows = relatedTodos
      .map(
        (t) =>
          `<tr>
<td style="width:6px;padding:4px 0;vertical-align:top;"><div style="width:6px;height:6px;background:#f59e0b;border-radius:50%;margin-top:6px;"></div></td>
<td style="padding:4px 0 4px 10px;font-size:14px;color:#374151;">${escapeHtml(t.title)}</td>
</tr>`,
      )
      .join('')
    parts.push(`<tr><td style="padding:16px 28px;">
${label('関連 TODO')}
<table cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>
</td></tr>`)
  }

  // Related notes
  if (relatedNotes.length > 0) {
    parts.push(DIVIDER)
    const rows = relatedNotes
      .map(
        (n) =>
          `<tr>
<td style="width:6px;padding:4px 0;vertical-align:top;"><div style="width:6px;height:6px;background:#6b7280;border-radius:50%;margin-top:6px;"></div></td>
<td style="padding:4px 0 4px 10px;font-size:14px;color:#374151;">${escapeHtml(n.title)}</td>
</tr>`,
      )
      .join('')
    parts.push(`<tr><td style="padding:16px 28px;">
${label('関連メモ')}
<table cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>
</td></tr>`)
  }

  // Bottom spacing
  parts.push('<tr><td style="padding:0 0 8px;">&nbsp;</td></tr>')

  return wrapEmail('まもなく予定があります', parts.join('\n'))
}

// ---------------------------------------------------------------------------
// Todo email
// ---------------------------------------------------------------------------

function buildTodoEmail(
  item: TodoReminder,
  relatedNotes: RelatedItem[],
): string {
  const pri = priorityInfo(item.priority)
  const parts: string[] = []

  // Title + badges
  parts.push(`<tr><td style="padding:24px 28px 12px;">
<div style="font-size:20px;font-weight:700;color:#111827;line-height:1.4;margin-bottom:10px;">${escapeHtml(item.title)}</div>
<table cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:8px;"><span style="display:inline-block;background:${pri.bg};color:${pri.color};font-size:12px;font-weight:600;padding:3px 12px;border-radius:12px;border:1px solid ${pri.border};">優先度: ${pri.text}</span></td>
${item.is_flagged ? '<td><span style="display:inline-block;background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;padding:3px 12px;border-radius:12px;border:1px solid #fca5a5;">フラグ</span></td>' : ''}
</tr></table>
</td></tr>`)

  // Due date
  if (item.due_date) {
    parts.push(`<tr><td style="padding:4px 28px 16px;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 6px 6px 0;">
<tr><td style="padding:12px 16px;">
${label('期限')}
<div style="font-size:15px;color:#92400e;font-weight:600;">${formatDateTime(item.due_date)}</div>
</td></tr>
</table>
</td></tr>`)
  }

  // Detail
  if (item.detail) {
    parts.push(DIVIDER)
    parts.push(`<tr><td style="padding:16px 28px;">
<div style="background:#f9fafb;border-left:3px solid #d1d5db;border-radius:0 6px 6px 0;padding:12px 16px;">
${label('詳細')}
<div style="font-size:14px;color:#4b5563;line-height:1.6;white-space:pre-wrap;">${escapeHtml(item.detail)}</div>
</div>
</td></tr>`)
  }

  // Tags
  if (item.tags?.length > 0) {
    const tagSpans = item.tags
      .map(
        (t) =>
          `<span style="display:inline-block;background:#eff6ff;color:#3b82f6;font-size:12px;padding:2px 10px;border-radius:12px;margin:2px 4px 2px 0;">#${escapeHtml(t)}</span>`,
      )
      .join('')
    parts.push(`<tr><td style="padding:8px 28px 12px;">${tagSpans}</td></tr>`)
  }

  // Subtasks
  if (item.subtasks?.length > 0) {
    const done = item.subtasks.filter((s) => s.completed).length
    const total = item.subtasks.length
    parts.push(DIVIDER)
    const rows = item.subtasks
      .map((s) => {
        // CSS checkbox: filled square for done, empty square for pending
        const box = s.completed
          ? '<div style="width:14px;height:14px;background:#f59e0b;border-radius:3px;margin-top:2px;"></div>'
          : '<div style="width:14px;height:14px;border:2px solid #d1d5db;border-radius:3px;margin-top:2px;"></div>'
        const textStyle = s.completed
          ? 'font-size:14px;color:#9ca3af;text-decoration:line-through;'
          : 'font-size:14px;color:#374151;'
        return `<tr>
<td style="width:14px;padding:4px 0;vertical-align:top;">${box}</td>
<td style="padding:4px 0 4px 10px;${textStyle}">${escapeHtml(s.title)}</td>
</tr>`
      })
      .join('')
    parts.push(`<tr><td style="padding:16px 28px;">
${label(`サブタスク (${done}/${total})`)}
<table cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>
</td></tr>`)
  }

  // Related notes
  if (relatedNotes.length > 0) {
    parts.push(DIVIDER)
    const rows = relatedNotes
      .map(
        (n) =>
          `<tr>
<td style="width:6px;padding:4px 0;vertical-align:top;"><div style="width:6px;height:6px;background:#6b7280;border-radius:50%;margin-top:6px;"></div></td>
<td style="padding:4px 0 4px 10px;font-size:14px;color:#374151;">${escapeHtml(n.title)}</td>
</tr>`,
      )
      .join('')
    parts.push(`<tr><td style="padding:16px 28px;">
${label('関連メモ')}
<table cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>
</td></tr>`)
  }

  parts.push('<tr><td style="padding:0 0 8px;">&nbsp;</td></tr>')

  return wrapEmail('タスクのリマインダー', parts.join('\n'))
}

// ---------------------------------------------------------------------------
// Email sender
// ---------------------------------------------------------------------------

async function sendEmail(
  webhookUrl: string | undefined,
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!webhookUrl) return { ok: false, error: 'GAS_WEBHOOK_URL not set' }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, html }),
        signal: controller.signal,
      })
      if (!res.ok) {
        const body = await res.text()
        return { ok: false, error: `GAS ${res.status}: ${body}` }
      }
      return { ok: true }
    } finally {
      clearTimeout(timer)
    }
  } catch (err) {
    return { ok: false, error: `fetch error: ${(err as Error).message}` }
  }
}

// ---------------------------------------------------------------------------
// Relation resolution
// ---------------------------------------------------------------------------

async function resolveRelations(
  supabase: ReturnType<typeof createClient>,
  items: ReminderItem[],
): Promise<{
  todoMap: Map<string, string>
  noteMap: Map<string, string>
}> {
  const todoIds = new Set<string>()
  const noteIds = new Set<string>()

  for (const item of items) {
    if (item.type === 'event') {
      for (const id of item.todo_ids ?? []) todoIds.add(id)
    }
    for (const id of item.note_ids ?? []) noteIds.add(id)
  }

  const todoMap = new Map<string, string>()
  const noteMap = new Map<string, string>()

  const [todosResult, notesResult] = await Promise.all([
    todoIds.size > 0
      ? supabase.from('todos').select('id, title').in('id', [...todoIds])
      : Promise.resolve({ data: [] }),
    noteIds.size > 0
      ? supabase.from('notes').select('id, title').in('id', [...noteIds])
      : Promise.resolve({ data: [] }),
  ])

  for (const t of todosResult.data ?? []) todoMap.set(t.id, t.title)
  for (const n of notesResult.data ?? []) noteMap.set(n.id, n.title)

  return { todoMap, noteMap }
}

// ---------------------------------------------------------------------------
// Reminder lifecycle
// ---------------------------------------------------------------------------

function calcNextRemindAt(current: string, repeat: string): string | null {
  const date = new Date(current)
  switch (repeat) {
    case 'daily':
      date.setDate(date.getDate() + 1)
      break
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'monthly': {
      const day = date.getDate()
      date.setDate(1)
      date.setMonth(date.getMonth() + 1)
      const maxDay = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
      ).getDate()
      date.setDate(Math.min(day, maxDay))
      break
    }
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
    default:
      return null
  }
  return date.toISOString()
}

async function markReminded(
  supabase: ReturnType<typeof createClient>,
  items: ReminderItem[],
  now: string,
): Promise<void> {
  const todoIds = items.filter((i) => i.type === 'todo').map((i) => i.id)
  const eventIds = items.filter((i) => i.type === 'event').map((i) => i.id)

  if (todoIds.length > 0) {
    await supabase.from('todos').update({ reminded_at: now }).in('id', todoIds)
  }
  if (eventIds.length > 0) {
    await supabase
      .from('calendar_events')
      .update({ reminded_at: now })
      .in('id', eventIds)
  }

  for (const item of items) {
    if (
      item.type === 'todo' &&
      item.remind_repeat &&
      item.remind_repeat !== 'none'
    ) {
      const next = calcNextRemindAt(item.remind_at, item.remind_repeat)
      if (next) {
        await supabase
          .from('todos')
          .update({ remind_at: next, reminded_at: null })
          .eq('id', item.id)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

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
    const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    // Fetch todos with pending reminders
    const { data: todos, error: todosError } = await supabase
      .from('todos')
      .select(
        'id, user_id, title, detail, priority, due_date, remind_at, remind_repeat, tags, subtasks, note_ids, is_flagged',
      )
      .lte('remind_at', now)
      .gte('remind_at', windowStart)
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
      .select(
        'id, user_id, title, description, start_at, end_at, is_all_day, location, remind_at, todo_ids, note_ids',
      )
      .lte('remind_at', now)
      .gte('remind_at', windowStart)
      .is('reminded_at', null)
      .eq('is_deleted', false)

    if (eventsError) {
      console.error('Failed to fetch events:', eventsError)
      throw eventsError
    }

    // Combine into discriminated union
    const reminders: ReminderItem[] = [
      ...(todos ?? []).map((t) => ({ ...t, type: 'todo' as const })),
      ...(events ?? []).map((e) => ({ ...e, type: 'event' as const })),
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
        await markReminded(supabase, items, now)
        continue
      }

      // Get user email
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.admin.getUserById(userId)

      if (userError || !user?.email) {
        console.error(`Failed to get user email for ${userId}:`, userError)
        skipped += items.length
        await markReminded(supabase, items, now)
        continue
      }

      // Resolve related item titles in bulk
      const { todoMap, noteMap } = await resolveRelations(supabase, items)

      // Send individual emails — track which succeeded
      const sentItems: ReminderItem[] = []
      const failedItems: ReminderItem[] = []

      for (const item of items) {
        const subject = `【リマインダー】${sanitizeSubject(item.title)}`
        let html: string

        if (item.type === 'event') {
          const relTodos: RelatedItem[] = (item.todo_ids ?? [])
            .filter((id) => todoMap.has(id))
            .map((id) => ({ id, title: todoMap.get(id)! }))
          const relNotes: RelatedItem[] = (item.note_ids ?? [])
            .filter((id) => noteMap.has(id))
            .map((id) => ({ id, title: noteMap.get(id)! }))
          html = buildEventEmail(item, relTodos, relNotes)
        } else {
          const relNotes: RelatedItem[] = (item.note_ids ?? [])
            .filter((id) => noteMap.has(id))
            .map((id) => ({ id, title: noteMap.get(id)! }))
          html = buildTodoEmail(item, relNotes)
        }

        const result = await sendEmail(gasWebhookUrl, user.email, subject, html)
        if (result.ok) {
          sent++
          sentItems.push(item)
        } else {
          errors.push(`${item.title}: ${result.error}`)
          failedItems.push(item)
        }
      }

      // Only mark successfully sent items as reminded
      if (sentItems.length > 0) {
        await markReminded(supabase, sentItems, now)
      }
    }

    return new Response(
      JSON.stringify({ sent, skipped, total: reminders.length, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
