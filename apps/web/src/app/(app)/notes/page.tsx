'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { NoteList } from '@/components/notes/note-list';
import { NoteEditor } from '@/components/notes/note-editor';
import { useNoteStore } from '@todome/store';
import { useIsMobile } from '@todome/hooks';
import type { Note } from '@todome/store';
import { supabase, createNote } from '@todome/db';

async function createEmptyNote(): Promise<Note> {
  const { data: { session } } = await supabase.auth.getSession();
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    user_id: session?.user?.id ?? '',
    title: '',
    content: { type: 'doc', content: [] },
    plain_text: '',
    folder_id: null,
    tags: [],
    is_pinned: false,
    is_archived: false,
    is_deleted: false,
    created_at: now,
    updated_at: now,
    synced_at: null,
  };
}

export default function NotesPage() {
  const isMobile = useIsMobile();
  const selectedNoteId = useNoteStore((s) => s.selectedNoteId);
  const selectNote = useNoteStore((s) => s.selectNote);
  const hydrated = useNoteStore((s) => s.hydrated);
  const noteCount = useNoteStore((s) =>
    s.notes.filter((n) => !n.is_deleted && !n.is_archived).length,
  );

  // モバイル: ドロワー一覧（初期表示で開く）
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerInitRef = useRef(false);

  // hydrated 後にドロワーを開く（SSR中は表示しない）
  useEffect(() => {
    if (isMobile && hydrated && !drawerInitRef.current) {
      drawerInitRef.current = true;
      setDrawerOpen(true);
    }
  }, [isMobile, hydrated]);

  // 左端スワイプでドロワーを開く
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

  // ドロワーでメモを選択 → ドロワーを閉じて selectNote
  const handleDrawerSelect = useCallback((id: string) => {
    selectNote(id);
    setDrawerOpen(false);
  }, [selectNote]);

  useEffect(() => {
    if (!hydrated) return;
    if (selectedNoteId) return;

    const { addNote, selectNote, filteredNotes } = useNoteStore.getState();
    const visible = filteredNotes();

    if (visible.length > 0 && visible[0]) {
      selectNote(visible[0].id);
    } else {
      createEmptyNote().then((newNote) => {
        addNote(newNote);
        createNote(newNote).catch(console.error);
        selectNote(newNote.id);
      }).catch(console.error);
    }
  }, [hydrated, selectedNoteId, noteCount]);

  return (
    <div className="flex h-full">
      {isMobile ? (
        <div
          className="relative h-full w-full"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* エディタは常にレンダリング（背景に見える） */}
          {selectedNoteId && (
            <NoteEditor noteId={selectedNoteId} onMenu={() => setDrawerOpen(true)} />
          )}

          {/* ドロワーオーバーレイ */}
          {drawerOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/30"
                onClick={() => setDrawerOpen(false)}
                aria-hidden="true"
              />
              <div className="fixed inset-y-0 left-0 z-50 w-[80%] max-w-[320px] animate-slide-in">
                <NoteList onSelectNote={handleDrawerSelect} />
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <NoteList />
          <div className="flex-1 min-w-0">
            {selectedNoteId && <NoteEditor noteId={selectedNoteId} />}
          </div>
        </>
      )}
    </div>
  );
}
