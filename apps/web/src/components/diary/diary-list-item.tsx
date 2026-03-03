'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { Star, Trash2, MoreVertical } from 'lucide-react';
import { clsx } from 'clsx';
import type { Diary, TiptapNode } from '@todome/db';

type Props = {
  diary: Diary;
  isActive: boolean;
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
};

const MOOD_EMOJI: Record<string, string> = {
  great: '😄',
  good: '🙂',
  neutral: '😐',
  bad: '😟',
  terrible: '😢',
};

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export const DiaryListItem = memo(function DiaryListItem({
  diary,
  isActive,
  onClick,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMenuBtn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((v) => !v);
  };

  // Parse date string 'YYYY-MM-DD'
  const dateParts = diary.date.split('-').map(Number);
  const dateObj = new Date(dateParts[0]!, dateParts[1]! - 1, dateParts[2]);
  const dayOfWeek = DAY_LABELS[dateObj.getDay()];
  const month = dateParts[1];
  const day = dateParts[2];

  // Extract plain text preview from events_text Tiptap doc
  const previewText = (() => {
    const doc = diary.events_text;
    if (!doc?.content) return '';
    const texts: string[] = [];
    const walk = (nodes: TiptapNode[]) => {
      for (const node of nodes) {
        if (node.text) texts.push(node.text);
        if (node.content) walk(node.content);
      }
    };
    walk(doc.content);
    return texts.join(' ').slice(0, 100);
  })();

  return (
    <div
      role="button"
      tabIndex={0}
      className={clsx(
        'w-full text-left px-3 py-2.5 border-b border-border group relative',
        'transition-colors duration-100 cursor-pointer select-none',
        'hover:bg-bg-secondary',
        isActive && 'bg-bg-tertiary',
      )}
      onClick={() => onClick(diary.id)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(diary.id)}
    >
      <div className="flex items-start gap-2 pr-6">
        {/* Date badge */}
        <div className="flex flex-col items-center shrink-0 w-10">
          <span className="text-[10px] text-text-tertiary">{dayOfWeek}</span>
          <span className="text-lg font-bold text-text-primary">{day}</span>
          <span className="text-[10px] text-text-tertiary">{month}月</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Mood + Rating row */}
          <div className="flex items-center gap-2 mb-0.5">
            {diary.mood && (
              <span className="text-sm">{MOOD_EMOJI[diary.mood]}</span>
            )}
            {diary.rating && (
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={clsx(
                      'h-2.5 w-2.5',
                      s <= diary.rating!
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-text-tertiary',
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Preview text */}
          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
            {previewText || '内容なし'}
          </p>

        </div>
      </div>

      {/* Menu button */}
      <button
        ref={btnRef}
        type="button"
        aria-label="メニュー"
        onClick={handleMenuBtn}
        className={clsx(
          'absolute right-2 top-1/2 -translate-y-1/2 p-2 md:p-1 rounded z-10',
          'text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors',
          'opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100',
          open && 'opacity-100 bg-bg-tertiary text-text-primary',
        )}
      >
        <MoreVertical className="h-4 w-4 md:h-3.5 md:w-3.5" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 w-36 bg-bg-primary border border-border rounded-lg shadow-xl z-50 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(diary.id);
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2 text-red-500"
          >
            <Trash2 className="h-4 w-4" />
            削除
          </button>
        </div>
      )}
    </div>
  );
});
