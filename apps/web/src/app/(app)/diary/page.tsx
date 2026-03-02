'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { DiaryList } from '@/components/diary/diary-list';
import { DiaryEditor } from '@/components/diary/diary-editor';
import { useDiaryStore } from '@todome/store';
import { useIsMobile } from '@todome/hooks';
import type { Diary } from '@todome/db';
import { useDiaries, useCreateDiary, useUserId } from '@/hooks/queries';

export default function DiaryPage() {
  const isMobile = useIsMobile();
  const selectedDiaryId = useDiaryStore((s) => s.selectedDiaryId);
  const selectDiary = useDiaryStore((s) => s.selectDiary);

  const userId = useUserId();
  const { data: diaries } = useDiaries();
  const createDiary = useCreateDiary();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');

  const [drawerOpen, setDrawerOpen] = useState(true);
  const dateHandledRef = useRef<string | null>(null);

  // Handle ?date= query param
  useEffect(() => {
    if (!dateParam || !diaries || !userId) return;
    if (dateHandledRef.current === dateParam) return;
    dateHandledRef.current = dateParam;

    const existing = diaries.find((d) => d.date === dateParam);
    if (existing) {
      selectDiary(existing.id);
    } else {
      const now = new Date().toISOString();
      const newDiary: Diary = {
        id: crypto.randomUUID(),
        user_id: userId,
        date: dateParam,
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
      createDiary.mutate(newDiary);
      selectDiary(newDiary.id);
    }
  }, [dateParam, diaries, userId, selectDiary, createDiary]);

  // Auto-select first diary if none selected (and no date param)
  useEffect(() => {
    if (!diaries || !userId || dateParam) return;
    if (selectedDiaryId && diaries.some((d) => d.id === selectedDiaryId)) return;
    if (diaries.length > 0 && diaries[0]) {
      selectDiary(diaries[0].id);
    }
  }, [diaries, userId, selectedDiaryId, dateParam, selectDiary]);

  const touchStartRef = useRef({ x: 0, y: 0 });
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    if (touchStartRef.current.x < 30 && dx > 60 && dy < 100) {
      setDrawerOpen(true);
    }
  }, []);

  const handleDrawerSelect = useCallback(
    (id: string) => {
      selectDiary(id);
      setDrawerOpen(false);
    },
    [selectDiary],
  );

  return (
    <div className="flex h-full">
      {isMobile ? (
        <div
          className="relative h-full w-full"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {selectedDiaryId && (
            <DiaryEditor
              diaryId={selectedDiaryId}
              onMenu={() => setDrawerOpen(true)}
            />
          )}
          {!selectedDiaryId && (
            <DiaryEditor
              diaryId=""
              onMenu={() => setDrawerOpen(true)}
            />
          )}
          {drawerOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/30"
                onClick={() => setDrawerOpen(false)}
                aria-hidden="true"
              />
              <div className="fixed inset-y-0 left-0 z-50 w-[80%] max-w-[320px] animate-slide-in">
                <DiaryList onSelectDiary={handleDrawerSelect} />
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <DiaryList />
          <div className="flex-1 min-w-0">
            {selectedDiaryId ? (
              <DiaryEditor diaryId={selectedDiaryId} />
            ) : (
              <DiaryEditor diaryId="" />
            )}
          </div>
        </>
      )}
    </div>
  );
}
