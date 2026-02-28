'use client';

import { useEffect } from 'react';
import { NoteList } from '@/components/notes/note-list';
import { NoteEditor } from '@/components/notes/note-editor';
import { useNoteStore } from '@todome/store';
import type { Note } from '@todome/store';
import { createNote } from '@todome/db';

function createEmptyNote(): Note {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    user_id: '',
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
  const selectedNoteId = useNoteStore((s) => s.selectedNoteId);
  // プリミティブな値のみサブスクライブして無限ループを防ぐ
  const noteCount = useNoteStore((s) =>
    s.notes.filter((n) => !n.is_deleted && !n.is_archived).length,
  );

  useEffect(() => {
    // 既に選択中なら何もしない
    if (selectedNoteId) return;

    const { addNote, selectNote, filteredNotes } = useNoteStore.getState();
    const visible = filteredNotes();

    if (visible.length > 0 && visible[0]) {
      selectNote(visible[0].id);
    } else {
      const newNote = createEmptyNote();
      addNote(newNote);
      createNote(newNote).catch(console.error);
      selectNote(newNote.id);
    }
  }, [selectedNoteId, noteCount]);

  return (
    <div className="flex h-full">
      <NoteList />
      <div className="flex-1 min-w-0">
        {selectedNoteId && <NoteEditor noteId={selectedNoteId} />}
      </div>
    </div>
  );
}
