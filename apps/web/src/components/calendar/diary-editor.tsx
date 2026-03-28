'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { format, isToday } from 'date-fns';
import { X, BookOpen } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { TiptapDocument } from '@todome/db';
import { useTranslation } from '@todome/store';
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useUserId,
} from '@/hooks/queries';

type Props = {
  date: Date;
  onClose: () => void;
};

const DAY_LABELS_KEYS = [
  'common.weekday.sun', 'common.weekday.mon', 'common.weekday.tue',
  'common.weekday.wed', 'common.weekday.thu', 'common.weekday.fri',
  'common.weekday.sat',
] as const;
const AUTO_SAVE_DELAY = 1000;

export const DiaryEditor = ({ date, onClose }: Props) => {
  const { t, locale } = useTranslation();
  const { data: events } = useCalendarEvents();
  const createCalendarEvent = useCreateCalendarEvent();
  const updateCalendarEvent = useUpdateCalendarEvent();
  const userId = useUserId();

  // Find or prepare a diary event for this date
  const dateKey = format(date, 'yyyy-MM-dd');
  const diaryEvent = (events ?? []).find(
    (e) =>
      !e.is_deleted &&
      e.diary_content !== null &&
      e.start_at.startsWith(dateKey),
  );

  const [saved, setSaved] = useState(true);
  const eventIdRef = useRef<string | null>(diaryEvent?.id ?? null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: t('diary.diaryEditorPlaceholder'),
      }),
    ],
    content: diaryEvent?.diary_content ?? undefined,
    editorProps: {
      attributes: {
        class: clsx(
          'prose prose-sm max-w-none min-h-[200px] px-1 py-2 outline-none',
          'text-text-primary',
          '[&_p]:my-1 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm',
          '[&_.is-empty]:before:content-[attr(data-placeholder)]',
          '[&_.is-empty]:before:text-text-tertiary [&_.is-empty]:before:float-left',
          '[&_.is-empty]:before:h-0 [&_.is-empty]:before:pointer-events-none',
        ),
      },
    },
    onUpdate: () => {
      setSaved(false);
    },
  });

  const saveDiary = useCallback(() => {
    if (!editor) return;
    const content = editor.getJSON() as TiptapDocument;
    const now = new Date().toISOString();

    if (eventIdRef.current) {
      updateCalendarEvent.mutate({
        id: eventIdRef.current,
        patch: { diary_content: content, updated_at: now },
      });
    } else {
      const newId = crypto.randomUUID();
      eventIdRef.current = newId;
      createCalendarEvent.mutate({
        id: newId,
        user_id: userId ?? '',
        title: t('diary.diaryTitle', { date: locale === 'ja' ? format(date, 'M月d日') : format(date, 'MMM d') }),
        description: null,
        start_at: `${dateKey}T00:00:00.000Z`,
        end_at: `${dateKey}T23:59:59.999Z`,
        is_all_day: true,
        location: null,
        color: null,
        diary_content: content,
        remind_at: null,
        repeat_rule: null,
        repeat_parent_id: null,
        todo_ids: [],
        note_ids: [],
        is_deleted: false,
        created_at: now,
        updated_at: now,
      });
    }
    setSaved(true);
  }, [editor, dateKey, date, userId, updateCalendarEvent, createCalendarEvent]);

  // Debounced auto-save using a timer ref
  useEffect(() => {
    if (saved) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      saveDiary();
    }, AUTO_SAVE_DELAY);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [saved, saveDiary]);

  const today = isToday(date);
  const dayOfWeek = date.getDay();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className={clsx(
          'relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl',
          'bg-bg-primary shadow-xl border border-[var(--border)]',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-text-secondary" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-text-primary">
                {locale === 'ja' ? format(date, 'yyyy年M月d日') : format(date, 'MMMM d, yyyy')} ({t(DAY_LABELS_KEYS[dayOfWeek]!)})
                {today && (
                  <span className="ml-1.5 text-xs font-normal text-[var(--accent)]">
                    {t('common.today')}
                  </span>
                )}
              </span>
              <span className="text-[10px] text-text-tertiary">
                {saved ? t('diary.saved') : t('diary.saving')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-text-tertiary hover:bg-bg-secondary hover:text-text-primary transition"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};
