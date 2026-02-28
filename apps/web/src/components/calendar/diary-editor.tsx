'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { format, isToday } from 'date-fns';
import { X, BookOpen } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { createCalendarEvent, updateCalendarEvent as persistUpdateEvent, supabase } from '@todome/db';
import { useCalendarStore } from '@todome/store';

type Props = {
  date: Date;
  onClose: () => void;
};

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const AUTO_SAVE_DELAY = 1000;

export const DiaryEditor = ({ date, onClose }: Props) => {
  const events = useCalendarStore((s) => s.events);
  const updateEvent = useCalendarStore((s) => s.updateEvent);
  const addEvent = useCalendarStore((s) => s.addEvent);

  // Find or prepare a diary event for this date
  const dateKey = format(date, 'yyyy-MM-dd');
  const diaryEvent = events.find(
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
        placeholder: '今日の出来事を書きましょう...',
      }),
    ],
    content: diaryEvent?.diary_content
      ? JSON.parse(diaryEvent.diary_content)
      : undefined,
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

  const saveDiary = useCallback(async () => {
    if (!editor) return;
    const content = JSON.stringify(editor.getJSON());
    const now = new Date().toISOString();

    if (eventIdRef.current) {
      const patch = { diary_content: content, updated_at: now };
      updateEvent(eventIdRef.current, patch);
      const current = events.find((e) => e.id === eventIdRef.current);
      if (current) {
        persistUpdateEvent(eventIdRef.current, patch, current).catch(console.error);
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const newId = crypto.randomUUID();
      eventIdRef.current = newId;
      const newEvent = {
        id: newId,
        user_id: user?.id ?? '',
        title: `日記 - ${format(date, 'M月d日')}`,
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
        is_deleted: false,
        created_at: now,
        updated_at: now,
      };
      addEvent(newEvent);
      createCalendarEvent(newEvent).catch(console.error);
    }
    setSaved(true);
  }, [editor, dateKey, date, events, updateEvent, addEvent]);

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
                {format(date, 'yyyy年M月d日')} ({DAY_LABELS[dayOfWeek]})
                {today && (
                  <span className="ml-1.5 text-xs font-normal text-[var(--accent)]">
                    今日
                  </span>
                )}
              </span>
              <span className="text-[10px] text-text-tertiary">
                {saved ? '保存済み' : '保存中...'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-text-tertiary hover:bg-bg-secondary hover:text-text-primary transition"
            aria-label="閉じる"
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
