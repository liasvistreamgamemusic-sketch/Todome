'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Menu,
  ArrowLeft,
  BookOpen,
  Trash2,
  Save,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';
import { clsx } from 'clsx';
import { format, parse } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useDiaryStore } from '@todome/store';
import type { Diary, DiaryMood, DiaryWeather, TiptapDocument } from '@todome/db';
import { TiptapEditor } from '@/components/editor/tiptap-editor';
import { useDiaries, useUpdateDiary, useDeleteDiary } from '@/hooks/queries';
import { DiaryRating } from './diary-rating';
import { DiaryMoodPicker } from './diary-mood-picker';
import { DiaryWeatherPicker } from './diary-weather-picker';
import { DiaryGratitude } from './diary-gratitude';
import { DiaryAutoEvents } from './diary-auto-events';
import { DiaryAutoTodos } from './diary-auto-todos';

type Props = {
  diaryId: string;
  onBack?: () => void;
  onMenu?: () => void;
};

type SaveStatus = 'saved' | 'saving' | 'error';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export function DiaryEditor({ diaryId, onBack, onMenu }: Props) {
  const { data: allDiaries } = useDiaries();
  const updateDiaryMutation = useUpdateDiary();
  const deleteDiaryMutation = useDeleteDiary();
  const selectDiary = useDiaryStore((s) => s.selectDiary);

  const diary = allDiaries?.find((d) => d.id === diaryId) ?? null;

  const [date, setDate] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [mood, setMood] = useState<DiaryMood | null>(null);
  const [weather, setWeather] = useState<DiaryWeather | null>(null);
  const [gratitude, setGratitude] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDiaryIdRef = useRef<string>(diaryId);
  const lastLocalSaveAtRef = useRef<string | null>(null);
  const lastSyncedAtRef = useRef<string | null>(null);

  // Sync local state when diaryId changes or remote data arrives
  useEffect(() => {
    if (prevDiaryIdRef.current !== diaryId) {
      prevDiaryIdRef.current = diaryId;
      lastLocalSaveAtRef.current = null;
      lastSyncedAtRef.current = null;
    }
    if (!diary) return;

    if (diary.updated_at === lastSyncedAtRef.current) return;
    if (diary.updated_at === lastLocalSaveAtRef.current) {
      lastSyncedAtRef.current = diary.updated_at;
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setDate(diary.date);
    setRating(diary.rating);
    setMood(diary.mood);
    setWeather(diary.weather);
    setGratitude(diary.gratitude);
    lastSyncedAtRef.current = diary.updated_at;
    setSaveStatus('saved');
  }, [diaryId, diary]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const debouncedSave = useCallback(
    (patch: Partial<Diary>) => {
      setSaveStatus('saving');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        const now = new Date().toISOString();
        const fullPatch = { ...patch, updated_at: now };
        lastLocalSaveAtRef.current = now;
        updateDiaryMutation.mutate(
          { id: diaryId, patch: fullPatch },
          {
            onSuccess: () => setSaveStatus('saved'),
            onError: () => setSaveStatus('error'),
          },
        );
      }, 500);
    },
    [diaryId, updateDiaryMutation],
  );

  const handleRatingChange = useCallback(
    (value: number | null) => {
      setRating(value);
      debouncedSave({ rating: value as Diary['rating'] });
    },
    [debouncedSave],
  );

  const handleMoodChange = useCallback(
    (value: DiaryMood | null) => {
      setMood(value);
      debouncedSave({ mood: value });
    },
    [debouncedSave],
  );

  const handleWeatherChange = useCallback(
    (value: DiaryWeather | null) => {
      setWeather(value);
      debouncedSave({ weather: value });
    },
    [debouncedSave],
  );

  const handleGratitudeChange = useCallback(
    (value: string[]) => {
      setGratitude(value);
      debouncedSave({ gratitude: value });
    },
    [debouncedSave],
  );

  const handleEventsTextChange = useCallback(
    (content: Record<string, unknown>, _plainText: string) => {
      debouncedSave({ events_text: content as unknown as TiptapDocument });
    },
    [debouncedSave],
  );

  const handleSummaryChange = useCallback(
    (content: Record<string, unknown>, _plainText: string) => {
      debouncedSave({ summary: content as unknown as TiptapDocument });
    },
    [debouncedSave],
  );

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value;
      setDate(newDate);
      debouncedSave({ date: newDate });
      setShowDatePicker(false);
    },
    [debouncedSave],
  );

  const handleDelete = useCallback(() => {
    deleteDiaryMutation.mutate(diaryId);
    selectDiary(null);
  }, [diaryId, deleteDiaryMutation, selectDiary]);

  if (!diary) {
    return (
      <div className="flex flex-col h-full bg-white/80 dark:bg-black/40 backdrop-blur-sm">
        {onMenu && (
          <div className="flex items-center px-4 py-2 border-b border-border shrink-0">
            <button
              type="button"
              onClick={onMenu}
              className="p-2 rounded-md text-text-secondary hover:bg-bg-secondary transition-colors"
              aria-label="日記一覧"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center text-text-tertiary">
          <div className="text-center">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">日記を選択してください</p>
          </div>
        </div>
      </div>
    );
  }

  // Parse date for display
  const dateObj = parse(date || diary.date, 'yyyy-MM-dd', new Date());
  const dayOfWeek = DAY_LABELS[dateObj.getDay()];

  return (
    <div className="flex flex-col h-full bg-white/80 dark:bg-black/40 backdrop-blur-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1">
          {onMenu && (
            <button
              type="button"
              onClick={onMenu}
              className="p-2 rounded-md text-text-secondary hover:bg-bg-secondary transition-colors mr-1"
              aria-label="日記一覧"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          {onBack && !onMenu && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-md text-text-secondary hover:bg-bg-secondary transition-colors mr-1"
              aria-label="戻る"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-1 text-xs text-text-tertiary mr-2">
            {saveStatus === 'saving' && (
              <>
                <Save className="h-3 w-3 animate-pulse" />
                <span>保存中...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Save className="h-3 w-3" />
                <span>保存済み</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="h-3 w-3 text-red-500" />
                <span className="text-red-500">保存エラー</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 rounded-md text-text-tertiary hover:bg-red-500/10 hover:text-red-500 transition-colors"
            title="削除"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-4 md:px-6 py-4 space-y-6 max-w-3xl mx-auto">
          {/* Date header */}
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-text-secondary" />
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text-primary">
                {format(dateObj, 'yyyy年M月d日', { locale: ja })} ({dayOfWeek})
              </h1>
              <button
                type="button"
                onClick={() => setShowDatePicker((v) => !v)}
                className="p-1 rounded-md text-text-tertiary hover:bg-bg-secondary transition-colors"
                title="日付を変更"
              >
                <CalendarDays className="h-4 w-4" />
              </button>
            </div>
            {showDatePicker && (
              <input
                type="date"
                value={date || diary.date}
                onChange={handleDateChange}
                className="text-sm bg-bg-secondary border border-border rounded-md px-2 py-1 text-text-primary"
                autoFocus
              />
            )}
          </div>

          {/* Mood & Weather */}
          <div className="flex flex-wrap items-center gap-4">
            <DiaryMoodPicker value={mood} onChange={handleMoodChange} />
            <DiaryWeatherPicker value={weather} onChange={handleWeatherChange} />
          </div>

          {/* Rating */}
          <DiaryRating value={rating} onChange={handleRatingChange} />

          {/* Auto sections */}
          <DiaryAutoEvents date={date || diary.date} />
          <DiaryAutoTodos date={date || diary.date} />

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Events text (今日の出来事) */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-text-secondary">今日の出来事</h2>
            <TiptapEditor
              content={diary.events_text}
              onChange={handleEventsTextChange}
              placeholder="何があったか、どう思ったか..."
              contentKey={`${diaryId}-events`}
            />
          </div>

          {/* Gratitude */}
          <DiaryGratitude value={gratitude} onChange={handleGratitudeChange} />

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Summary (総括) */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-text-secondary">総括</h2>
            <TiptapEditor
              content={diary.summary}
              onChange={handleSummaryChange}
              placeholder="今日を振り返って..."
              contentKey={`${diaryId}-summary`}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
