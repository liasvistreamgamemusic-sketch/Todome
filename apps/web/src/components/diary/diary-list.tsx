'use client';

import { useCallback } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { useDiaryStore } from '@todome/store';
import type { Diary } from '@todome/db';
import { useDiaries, useCreateDiary, useDeleteDiary, useUserId } from '@/hooks/queries';
import { DiaryListItem } from './diary-list-item';

type Props = {
  onSelectDiary?: (id: string) => void;
};

export function DiaryList({ onSelectDiary }: Props = {}) {
  const selectedDiaryId = useDiaryStore((s) => s.selectedDiaryId);
  const selectDiary = useDiaryStore((s) => s.selectDiary);

  const userId = useUserId();
  const { data: diaries = [] } = useDiaries();
  const createDiaryMutation = useCreateDiary();
  const deleteDiaryMutation = useDeleteDiary();

  const handleNewDiary = useCallback(() => {
    if (!userId) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    // Check if today's diary already exists
    const existing = diaries.find((d) => d.date === today);
    if (existing) {
      if (onSelectDiary) onSelectDiary(existing.id);
      else selectDiary(existing.id);
      return;
    }
    const now = new Date().toISOString();
    const diary: Diary = {
      id: crypto.randomUUID(),
      user_id: userId,
      date: today,
      events_text: null,
      summary: null,
      rating: null,
      mood: null,
      weather: null,
      gratitude: [],
      tags: [],
      is_deleted: false,
      created_at: now,
      updated_at: now,
    };
    createDiaryMutation.mutate(diary);
    if (onSelectDiary) onSelectDiary(diary.id);
    else selectDiary(diary.id);
  }, [userId, diaries, createDiaryMutation, selectDiary, onSelectDiary]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteDiaryMutation.mutate(id);
      if (selectedDiaryId === id) selectDiary(null);
    },
    [deleteDiaryMutation, selectedDiaryId, selectDiary],
  );

  const handleClick = useCallback(
    (id: string) => {
      if (onSelectDiary) onSelectDiary(id);
      else selectDiary(id);
    },
    [onSelectDiary, selectDiary],
  );

  return (
    <div className="w-full md:w-[300px] h-full md:border-r flex flex-col glass md:shrink-0">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-text-secondary" />
            <span className="text-sm font-semibold text-text-primary">日記</span>
          </div>
          <button
            type="button"
            onClick={handleNewDiary}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            今日の日記
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {diaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <BookOpen className="h-8 w-8 text-text-tertiary mb-2 opacity-40" />
            <p className="text-text-tertiary text-sm mb-2">日記がありません</p>
            <button
              type="button"
              onClick={handleNewDiary}
              className="text-xs text-accent hover:text-accent/80 transition-colors"
            >
              今日の日記を書く
            </button>
          </div>
        ) : (
          <div>
            {diaries.map((diary) => (
              <DiaryListItem
                key={diary.id}
                diary={diary}
                isActive={selectedDiaryId === diary.id}
                onClick={handleClick}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
