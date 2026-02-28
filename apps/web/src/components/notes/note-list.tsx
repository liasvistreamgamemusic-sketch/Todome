'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  Plus, List, LayoutGrid, ArrowUpDown,
  FolderPlus, Check, X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNoteStore } from '@todome/store';
import type { Note, NoteSortBy, Folder } from '@todome/store';
import { useKeyboardShortcut, useClickOutside } from '@todome/hooks';
import {
  supabase, createNote, createFolder,
  updateNote as persistNote, deleteNote as persistDeleteNote,
} from '@todome/db';
import { NoteListItem } from './note-list-item';
import { NoteCard } from './note-card';
import { NoteSearch } from './note-search';
import { exportNoteAsText, exportNoteAsPdf } from '../settings/export-data';

const SORT_OPTIONS: { value: NoteSortBy; label: string }[] = [
  { value: 'updated_at', label: '更新日' },
  { value: 'created_at', label: '作成日' },
  { value: 'title', label: 'タイトル' },
  { value: 'manual', label: '手動' },
];

const FOLDER_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

export function NoteList() {
  const filteredNotes = useNoteStore((s) => s.filteredNotes);
  const notes = filteredNotes();
  const selectedNoteId = useNoteStore((s) => s.selectedNoteId);
  const viewMode = useNoteStore((s) => s.viewMode);
  const sortBy = useNoteStore((s) => s.sortBy);
  const folders = useNoteStore((s) => s.folders);
  const selectNote = useNoteStore((s) => s.selectNote);
  const setViewMode = useNoteStore((s) => s.setViewMode);
  const setSortBy = useNoteStore((s) => s.setSortBy);
  const addNote = useNoteStore((s) => s.addNote);
  const addFolder = useNoteStore((s) => s.addFolder);
  const pinNote = useNoteStore((s) => s.pinNote);
  const unpinNote = useNoteStore((s) => s.unpinNote);
  const archiveNote = useNoteStore((s) => s.archiveNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const moveNoteToFolder = useNoteStore((s) => s.moveNoteToFolder);

  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState<string>(FOLDER_COLORS[4] ?? '#3b82f6');

  const sortMenuRef = useRef<HTMLDivElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useClickOutside(sortMenuRef, () => setShowSortMenu(false));

  const { pinned, unpinned } = useMemo(() => {
    const p: Note[] = [], u: Note[] = [];
    for (const n of notes) (n.is_pinned ? p : u).push(n);
    return { pinned: p, unpinned: u };
  }, [notes]);

  const handleNewNote = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const now = new Date().toISOString();
    const n: Note = {
      id: crypto.randomUUID(), user_id: session?.user?.id ?? '', title: '',
      content: { type: 'doc', content: [] }, plain_text: '',
      folder_id: null, tags: [], is_pinned: false,
      is_archived: false, is_deleted: false,
      created_at: now, updated_at: now, synced_at: null,
    };
    addNote(n);
    selectNote(n.id);
    createNote(n).catch(console.error);
  }, [addNote, selectNote]);

  useKeyboardShortcut('cmd+n', handleNewNote);

  const handleCreateFolder = useCallback(async () => {
    if (!folderName.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    const now = new Date().toISOString();
    const f: Folder = {
      id: crypto.randomUUID(), user_id: session?.user?.id ?? '', name: folderName.trim(),
      color: folderColor, icon: null, parent_id: null,
      sort_order: folders.length, created_at: now, updated_at: now,
    };
    addFolder(f);
    createFolder(f).catch(console.error);
    setFolderName('');
    setFolderColor(FOLDER_COLORS[4] ?? '#3b82f6');
    setShowFolderForm(false);
  }, [folderName, folderColor, folders.length, addFolder]);

  // action handlers passed to each item — all persist to DB via repository layer
  const handlePin = useCallback((id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const patch = { is_pinned: !note.is_pinned };
    note.is_pinned ? unpinNote(id) : pinNote(id);
    persistNote(id, patch, note).catch(console.error);
  }, [notes, pinNote, unpinNote]);

  const handleArchive = useCallback((id: string) => {
    const note = notes.find((n) => n.id === id);
    archiveNote(id);
    if (selectedNoteId === id) selectNote(null);
    if (note) persistNote(id, { is_archived: true }, note).catch(console.error);
  }, [notes, archiveNote, selectedNoteId, selectNote]);

  const handleDelete = useCallback((id: string) => {
    const note = notes.find((n) => n.id === id);
    deleteNote(id);
    if (selectedNoteId === id) selectNote(null);
    if (note) persistDeleteNote(id, note).catch(console.error);
  }, [notes, deleteNote, selectedNoteId, selectNote]);

  const handleMoveToFolder = useCallback((id: string, folderId: string | null) => {
    const note = notes.find((n) => n.id === id);
    moveNoteToFolder(id, folderId);
    if (note) persistNote(id, { folder_id: folderId }, note).catch(console.error);
  }, [notes, moveNoteToFolder]);

  const handleExportText = useCallback((id: string) => {
    const note = notes.find((n) => n.id === id);
    if (note) exportNoteAsText(note);
  }, [notes]);

  const handleExportPdf = useCallback((id: string) => {
    const note = notes.find((n) => n.id === id);
    if (note) exportNoteAsPdf(note);
  }, [notes]);

  const handleContextMenu = useCallback((e: React.MouseEvent, _id: string) => {
    e.preventDefault();
    // right-click is handled by the item's own dropdown
  }, []);

  const itemProps = {
    folders,
    onClick: selectNote,
    onContextMenu: handleContextMenu,
    onPin: handlePin,
    onArchive: handleArchive,
    onDelete: handleDelete,
    onMoveToFolder: handleMoveToFolder,
    onExportText: handleExportText,
    onExportPdf: handleExportPdf,
  };

  const renderNote = (note: Note) => {
    const props = { ...itemProps, note, isActive: selectedNoteId === note.id };
    return viewMode === 'card'
      ? <NoteCard key={note.id} {...props} />
      : <NoteListItem key={note.id} {...props} />;
  };

  return (
    <div className="w-[300px] h-full border-r flex flex-col glass shrink-0">
      <div className="px-3 pt-3 pb-2 space-y-2 shrink-0">
        <NoteSearch />

        <div className="flex items-center justify-between">
          <button type="button" onClick={handleNewNote}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80 transition-colors">
            <Plus className="h-3.5 w-3.5" />新規メモ
          </button>

          <div className="flex items-center gap-1">
            <button type="button" title="フォルダを作成"
              onClick={() => { setShowFolderForm((v) => !v); setTimeout(() => folderInputRef.current?.focus(), 50); }}
              className="p-1 rounded text-text-tertiary hover:bg-bg-secondary transition-colors">
              <FolderPlus className="h-3.5 w-3.5" />
            </button>

            <button type="button"
              onClick={() => setViewMode(viewMode === 'list' ? 'card' : 'list')}
              className="p-1 rounded text-text-tertiary hover:bg-bg-secondary transition-colors"
              title={viewMode === 'list' ? 'カード表示' : 'リスト表示'}>
              {viewMode === 'list' ? <LayoutGrid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
            </button>

            <div className="relative" ref={sortMenuRef}>
              <button type="button" title="並び替え"
                onClick={() => setShowSortMenu((v) => !v)}
                className="p-1 rounded text-text-tertiary hover:bg-bg-secondary transition-colors">
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-bg-primary border border-border rounded-lg shadow-lg z-20 py-1">
                  {SORT_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                      className={clsx('w-full text-left px-3 py-1.5 text-xs hover:bg-bg-secondary',
                        sortBy === opt.value && 'font-medium text-accent bg-bg-secondary')}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {showFolderForm && (
          <div className="rounded-lg border border-border bg-bg-secondary p-2 space-y-2">
            <input ref={folderInputRef} type="text" value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') { setShowFolderForm(false); setFolderName(''); }
              }}
              placeholder="フォルダ名"
              className="w-full text-xs bg-transparent border-none outline-none text-text-primary placeholder:text-text-tertiary" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {FOLDER_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setFolderColor(c)}
                    className="h-4 w-4 rounded-full transition-all"
                    style={{ backgroundColor: c, outline: folderColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => { setShowFolderForm(false); setFolderName(''); }}
                  className="p-0.5 rounded text-text-tertiary hover:text-text-primary transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={handleCreateFolder} disabled={!folderName.trim()}
                  className="p-0.5 rounded text-accent hover:text-accent/80 transition-colors disabled:opacity-40">
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <p className="text-text-tertiary text-sm mb-2">メモがありません</p>
            <button type="button" onClick={handleNewNote}
              className="text-xs text-accent hover:text-accent/80 transition-colors">新規メモを作成</button>
          </div>
        ) : viewMode === 'card' ? (
          <div className="px-3 pb-3 space-y-3">
            {pinned.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary px-1 pt-1">ピン留め</p>
                <div className="grid grid-cols-1 gap-2">{pinned.map(renderNote)}</div>
                {unpinned.length > 0 && <div className="border-t border-border" />}
              </>
            )}
            {unpinned.length > 0 && <div className="grid grid-cols-1 gap-2">{unpinned.map(renderNote)}</div>}
          </div>
        ) : (
          <div>
            {pinned.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary px-3 py-1.5">ピン留め</p>
                {pinned.map(renderNote)}
                {unpinned.length > 0 && <div className="border-t border-border" />}
              </>
            )}
            {unpinned.map(renderNote)}
          </div>
        )}
      </div>
    </div>
  );
}
