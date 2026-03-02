'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { NoteList } from '@/components/notes/note-list';
import { NoteEditor } from '@/components/notes/note-editor';
import { useNoteStore } from '@todome/store';
import { useIsMobile } from '@todome/hooks';
import type { Note } from '@todome/db';
import { useNotes, useCreateNote, useUserId } from '@/hooks/queries';
import { filterAndSortNotes } from '@/lib/note-filters';

export default function NotesPage() {
  const isMobile = useIsMobile();
  const selectedNoteId = useNoteStore((s) => s.selectedNoteId);
  const selectNote = useNoteStore((s) => s.selectNote);
  const selectedFolderId = useNoteStore((s) => s.selectedFolderId);
  const searchQuery = useNoteStore((s) => s.searchQuery);
  const sortBy = useNoteStore((s) => s.sortBy);

  const userId = useUserId();
  const { data: notes } = useNotes();
  const createNote = useCreateNote();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerInitRef = useRef(false);
  const autoCreatedRef = useRef(false);

  useEffect(() => {
    if (isMobile && notes && !drawerInitRef.current) {
      drawerInitRef.current = true;
      setDrawerOpen(true);
    }
  }, [isMobile, notes]);

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

  const handleDrawerSelect = useCallback((id: string) => {
    selectNote(id);
    setDrawerOpen(false);
  }, [selectNote]);

  // Auto-select or create note
  useEffect(() => {
    if (!notes || !userId) return;

    const visible = filterAndSortNotes(notes, { folderId: selectedFolderId, searchQuery, sortBy });

    if (selectedNoteId && visible.some((n) => n.id === selectedNoteId)) return;

    if (visible.length > 0 && visible[0]) {
      selectNote(visible[0].id);
    } else if (!autoCreatedRef.current) {
      autoCreatedRef.current = true;
      const now = new Date().toISOString();
      const newNote: Note = {
        id: crypto.randomUUID(),
        user_id: userId,
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
      createNote.mutate(newNote);
      selectNote(newNote.id);
    }
  }, [notes, userId, selectedNoteId, selectedFolderId, searchQuery, sortBy, selectNote, createNote]);

  return (
    <div className="flex h-full">
      {isMobile ? (
        <div
          className="relative h-full w-full"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {selectedNoteId && (
            <NoteEditor noteId={selectedNoteId} onMenu={() => setDrawerOpen(true)} />
          )}
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
