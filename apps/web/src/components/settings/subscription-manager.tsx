'use client';

import { useState, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import { Plus, Trash2, RefreshCw, AlertCircle, X } from 'lucide-react';
import { Button } from '@todome/ui';
import type { CalendarSubscription, CalendarProvider } from '@todome/db';
import {
  useCalendarSubscriptions,
  useCreateCalendarSubscription,
  useUpdateCalendarSubscription,
  useDeleteCalendarSubscription,
} from '@/hooks/queries';
import { useSubscriptionStore } from '@todome/store';
import { useIcsSync } from '@/hooks/use-ics-sync';
import { detectProvider, inferSubscriptionName } from '@/lib/ics-parser';
import { fetchIcs } from '@/lib/ics-fetch';
import { ProviderIcon } from '@/components/calendar/provider-icon';

const PRESET_COLORS: string[] = [
  '#4285F4', '#EA4335', '#FBBC04', '#34A853',
  '#FF6D01', '#46BDC6', '#7986CB', '#E67C73',
];

const DEFAULT_SUB_COLOR = '#7986CB';

export const SubscriptionManager = () => {
  const { data: subscriptions = [] } = useCalendarSubscriptions();
  const createSub = useCreateCalendarSubscription();
  const updateSub = useUpdateCalendarSubscription();
  const deleteSub = useDeleteCalendarSubscription();
  const { syncAll, syncSubscription } = useIcsSync();
  const syncStatus = useSubscriptionStore((s) => s.syncStatus);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const [addName, setAddName] = useState('');
  const [addColor, setAddColor] = useState(DEFAULT_SUB_COLOR);
  const [addProvider, setAddProvider] = useState<CalendarProvider>('other');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handleUrlBlur = useCallback(async () => {
    if (!addUrl.trim()) return;
    const provider = detectProvider(addUrl);
    setAddProvider(provider);

    try {
      const result = await fetchIcs(addUrl, null);
      if (result) {
        const name = inferSubscriptionName(result.body, addUrl);
        if (name && !addName) {
          setAddName(name);
        }
      }
    } catch {
      // Ignore - user will set name manually
    }
  }, [addUrl, addName]);

  const handleAdd = useCallback(async () => {
    if (!addUrl.trim() || !addName.trim()) return;
    setAddLoading(true);
    setAddError(null);

    try {
      const result = await fetchIcs(addUrl, null);
      if (!result) {
        setAddError('カレンダーデータを取得できませんでした');
        setAddLoading(false);
        return;
      }

      const provider = detectProvider(addUrl);
      const sub: CalendarSubscription = {
        id: crypto.randomUUID(),
        user_id: '', // Will be set by RLS
        name: addName.trim(),
        url: addUrl.trim(),
        color: addColor,
        provider,
        is_enabled: true,
        last_synced_at: null,
        etag: null,
        error_message: null,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      createSub.mutate(sub);

      // Reset form
      setAddUrl('');
      setAddName('');
      setAddColor(DEFAULT_SUB_COLOR);
      setAddProvider('other');
      setShowAddForm(false);

      // Sync immediately
      setTimeout(() => syncSubscription(sub), 500);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : '追加に失敗しました');
    } finally {
      setAddLoading(false);
    }
  }, [addUrl, addName, addColor, createSub, syncSubscription]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteSub.mutate(id);
    },
    [deleteSub],
  );

  const handleToggle = useCallback(
    (sub: CalendarSubscription) => {
      updateSub.mutate({
        id: sub.id,
        patch: { is_enabled: !sub.is_enabled },
      });
    },
    [updateSub],
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary">外部カレンダー</p>
          <p className="text-xs text-text-secondary mt-0.5">
            ICS URLで他のカレンダーの予定を表示
          </p>
        </div>
        <div className="flex items-center gap-2">
          {subscriptions.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={syncAll}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              全て同期
            </Button>
          )}
        </div>
      </div>

      {/* Subscription list */}
      {subscriptions.map((sub) => {
        const status = syncStatus[sub.id] ?? 'idle';
        return (
          <div
            key={sub.id}
            className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-bg-primary px-4 py-3"
          >
            <ProviderIcon provider={sub.provider} size={18} />
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: sub.color }}
            />
            <div className="flex flex-1 flex-col min-w-0">
              <span className="text-sm font-medium text-text-primary truncate">
                {sub.name}
              </span>
              <span className="text-[10px] text-text-tertiary truncate">
                {sub.last_synced_at
                  ? `最終同期: ${new Date(sub.last_synced_at).toLocaleString('ja-JP')}`
                  : '未同期'}
                {status === 'syncing' && ' (同期中...)'}
              </span>
              {sub.error_message && (
                <span className="flex items-center gap-1 text-[10px] text-[#D32F2F]">
                  <AlertCircle className="h-3 w-3" />
                  {sub.error_message}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={sub.is_enabled}
                onClick={() => handleToggle(sub)}
                className={clsx(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                  sub.is_enabled ? 'bg-[var(--accent)]' : 'bg-bg-tertiary',
                )}
              >
                <span
                  className={clsx(
                    'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                    sub.is_enabled ? 'translate-x-4' : 'translate-x-0',
                  )}
                />
              </button>

              {/* Sync */}
              <button
                type="button"
                onClick={() => syncSubscription(sub)}
                disabled={status === 'syncing'}
                className="rounded-md p-1.5 text-text-tertiary hover:bg-bg-secondary transition-colors disabled:opacity-50"
                title="同期"
              >
                <RefreshCw className={clsx('h-3.5 w-3.5', status === 'syncing' && 'animate-spin')} />
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => handleDelete(sub.id)}
                className="rounded-md p-1.5 text-text-tertiary hover:text-[#D32F2F] hover:bg-bg-secondary transition-colors"
                title="削除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Add form */}
      {showAddForm ? (
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-bg-primary p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">カレンダーを追加</span>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setAddError(null);
              }}
              className="rounded-md p-1 text-text-tertiary hover:bg-bg-secondary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-xs text-text-secondary" htmlFor="ics-url">ICS URL</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  ref={urlInputRef}
                  id="ics-url"
                  type="url"
                  value={addUrl}
                  onChange={(e) => setAddUrl(e.target.value)}
                  onBlur={handleUrlBlur}
                  placeholder="https://calendar.google.com/..."
                  className={clsx(
                    'flex-1 rounded-lg border border-[var(--border)] bg-bg-secondary px-3 py-2 text-sm text-text-primary',
                    'placeholder:text-text-tertiary',
                    'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]',
                  )}
                />
                {addProvider !== 'other' && (
                  <ProviderIcon provider={addProvider} size={20} />
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-text-secondary" htmlFor="ics-name">名前</label>
              <input
                id="ics-name"
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="マイカレンダー"
                className={clsx(
                  'mt-1 w-full rounded-lg border border-[var(--border)] bg-bg-secondary px-3 py-2 text-sm text-text-primary',
                  'placeholder:text-text-tertiary',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]',
                )}
              />
            </div>

            <div>
              <label className="text-xs text-text-secondary">色</label>
              <div className="mt-1 flex gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAddColor(color)}
                    className={clsx(
                      'h-6 w-6 rounded-full transition-transform',
                      addColor === color && 'ring-2 ring-offset-2 ring-[var(--accent)] scale-110',
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {addError && (
            <p className="flex items-center gap-1 text-xs text-[#D32F2F]">
              <AlertCircle className="h-3.5 w-3.5" />
              {addError}
            </p>
          )}

          <Button
            size="sm"
            onClick={handleAdd}
            loading={addLoading}
            disabled={!addUrl.trim() || !addName.trim()}
            className="w-full"
          >
            追加
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className={clsx(
            'flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-4 py-3',
            'text-sm text-text-secondary hover:bg-bg-secondary hover:border-text-tertiary transition-colors',
          )}
        >
          <Plus className="h-4 w-4" />
          カレンダーを追加
        </button>
      )}
    </div>
  );
};
