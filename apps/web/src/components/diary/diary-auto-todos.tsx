'use client';

import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useTodos } from '@/hooks/queries';
import { useTranslation } from '@todome/store';

const PRIORITY_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#3b82f6',
  4: '#9ca3af',
};

type Props = {
  date: string; // 'YYYY-MM-DD'
};

export function DiaryAutoTodos({ date }: Props) {
  const { t } = useTranslation();
  const { data: todos = [] } = useTodos();

  const completedTodos = useMemo(() => {
    return todos.filter((t) => {
      if (t.is_deleted) return false;
      if (t.status !== 'completed' || !t.completed_at) return false;
      return t.completed_at.substring(0, 10) === date;
    });
  }, [todos, date]);

  if (completedTodos.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        <span className="text-xs font-medium text-text-secondary">{t('diary.completedTodos')}</span>
        <span className="text-[10px] text-text-tertiary">({completedTodos.length})</span>
      </div>
      <div className="space-y-1 pl-5">
        {completedTodos.map((todo) => (
          <div
            key={todo.id}
            className="flex items-center gap-2 text-sm py-0.5"
          >
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: PRIORITY_COLORS[todo.priority] ?? '#9ca3af' }}
            />
            <span className="text-text-primary line-through opacity-70 truncate">
              {todo.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
