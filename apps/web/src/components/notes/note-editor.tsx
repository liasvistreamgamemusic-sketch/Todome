'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Menu,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Trash2,
  MoreHorizontal,
  FolderOpen,
  Save,
  AlertCircle,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNoteStore } from '@todome/store';
import type { Note, NoteSummary } from '@todome/db';
import { TiptapEditor } from '@/components/editor/tiptap-editor';
import { useNote, useNotes, useFolders, useUpdateNote, useDeleteNote } from '@/hooks/queries';

type NoteEditorProps = {
  noteId: string;
  onBack?: () => void;
  onMenu?: () => void;
  onCreateNote?: () => void;
};

type SaveStatus = 'saved' | 'saving' | 'error';

export function NoteEditor({ noteId, onBack, onMenu, onCreateNote }: NoteEditorProps) {
  const { data: note } = useNote(noteId);
  const { data: allNotes } = useNotes();
  const { data: folders = [] } = useFolders();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  const selectNote = useNoteStore((s) => s.selectNote);


  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevNoteIdRef = useRef<string>(noteId);
  // Track whether the user has manually edited the title (disables auto-title from content)
  const hasManualTitleRef = useRef(false);
  // Track the updated_at we last wrote to distinguish our saves from remote changes
  const lastLocalSaveAtRef = useRef<string | null>(null);
  // Track the last updated_at we synced from to detect new remote versions
  const lastSyncedAtRef = useRef<string | null>(null);
  // Cooldown after local save — skip incoming content during this window
  const saveCooldownRef = useRef(false);
  const saveCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Suppress saves until the editor content has been initialized from the loaded note
  const initialLoadRef = useRef(true);
  // Track the last saved content JSON to skip no-op saves (prevents updated_at changes on open)
  const lastSavedContentRef = useRef<string | null>(null);

  // Check if a note is empty (no title and no content)
  const isNoteEmpty = useCallback((n: NoteSummary | null): boolean => {
    if (!n) return true;
    const hasTitle = n.title.trim().length > 0;
    const hasContent = (n.plain_text ?? '').trim().length > 0;
    return !hasTitle && !hasContent;
  }, []);

  // Delete empty note from DB
  const purgeAndPersist = useCallback(
    (id: string) => {
      const targetNote = allNotes?.find((n) => n.id === id) ?? null;
      if (targetNote?.is_archived) return;
      if (isNoteEmpty(targetNote)) {
        deleteNoteMutation.mutate(id);
      }
    },
    [allNotes, isNoteEmpty, deleteNoteMutation],
  );

  // Sync local state when noteId changes or remote data arrives
  useEffect(() => {
    if (prevNoteIdRef.current !== noteId) {
      purgeAndPersist(prevNoteIdRef.current);
      prevNoteIdRef.current = noteId;
      hasManualTitleRef.current = false;
      initialLoadRef.current = true;
      lastLocalSaveAtRef.current = null;
      lastSyncedAtRef.current = null;
      lastSavedContentRef.current = null;
      saveCooldownRef.current = false;
      if (saveCooldownTimerRef.current) clearTimeout(saveCooldownTimerRef.current);
    }
    if (!note) return;

    // Skip if we already synced this exact version
    if (note.updated_at === lastSyncedAtRef.current) return;

    // Skip echo-back from our own save (our save timestamp matches)
    if (note.updated_at === lastLocalSaveAtRef.current) {
      lastSyncedAtRef.current = note.updated_at;
      return;
    }

    // Skip content updates during save cooldown (likely echo-backs)
    if (saveCooldownRef.current) {
      lastSyncedAtRef.current = note.updated_at;
      return;
    }

    // Remote change or initial load — accept it
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setTitle(note.title);
    if (!note.title.trim()) {
      hasManualTitleRef.current = false;
    }
    lastSyncedAtRef.current = note.updated_at;
    initialLoadRef.current = false;
    // Record loaded content so we can skip no-op saves when content hasn't actually changed
    if (note.content) {
      lastSavedContentRef.current = JSON.stringify(note.content);
    }
    setSaveStatus('saved');
  }, [noteId, note, purgeAndPersist]);

  // Purge on unmount (when navigating away from notes page)
  useEffect(() => {
    const currentNoteId = noteId;
    return () => {
      // Cannot use hooks in cleanup; use the ref-based approach
      // The purge will happen on next mount or note switch
      void currentNoteId;
    };
  }, [noteId]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) {
        setShowFolderMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const debouncedSave = useCallback(
    (patch: Partial<Note>) => {
      // Skip no-op content saves (e.g. editor re-emitting loaded content on open)
      if (patch.content && !patch.title) {
        const contentStr = JSON.stringify(patch.content);
        if (contentStr === lastSavedContentRef.current) {
          return;
        }
      }

      setSaveStatus('saving');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        const now = new Date().toISOString();
        const fullPatch = { ...patch, updated_at: now };
        lastLocalSaveAtRef.current = now;
        // Activate cooldown to ignore echo-backs for 2 seconds
        saveCooldownRef.current = true;
        if (saveCooldownTimerRef.current) clearTimeout(saveCooldownTimerRef.current);
        saveCooldownTimerRef.current = setTimeout(() => { saveCooldownRef.current = false; }, 2000);
        updateNoteMutation.mutate(
          { id: noteId, patch: fullPatch },
          {
            onSuccess: () => {
              setSaveStatus('saved');
              if (fullPatch.content) {
                lastSavedContentRef.current = JSON.stringify(fullPatch.content);
              }
            },
            onError: () => setSaveStatus('error'),
          },
        );
      }, 500);
    },
    [noteId, updateNoteMutation],
  );

  // Cleanup debounce and cooldown timers
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (saveCooldownTimerRef.current) clearTimeout(saveCooldownTimerRef.current);
    };
  }, []);

  // IME composition guard – suppress saves while composing (e.g. Japanese input)
  const isComposingRef = useRef(false);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      hasManualTitleRef.current = true;
      setTitle(newTitle);
      if (!isComposingRef.current) {
        debouncedSave({ title: newTitle });
      }
    },
    [debouncedSave],
  );

  const handleTitleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      isComposingRef.current = false;
      debouncedSave({ title: e.currentTarget.value });
    },
    [debouncedSave],
  );

  const handleContentChange = useCallback(
    (content: Record<string, unknown>, plainText: string) => {
      // Skip saves triggered by the editor initializing with loaded content
      if (initialLoadRef.current) return;
      const autoTitle = !title.trim() && !hasManualTitleRef.current
        ? plainText.split('\n')[0]?.slice(0, 100) ?? ''
        : undefined;

      debouncedSave({
        content: content as unknown as Note['content'],
        plain_text: plainText,
        ...(autoTitle !== undefined ? { title: autoTitle } : {}),
      });

      if (autoTitle !== undefined) {
        setTitle(autoTitle);
      }
    },
    [debouncedSave, title],
  );

  const handleTogglePin = useCallback(() => {
    updateNoteMutation.mutate({ id: noteId, patch: { is_pinned: !note?.is_pinned } });
  }, [note, noteId, updateNoteMutation]);

  const handleArchive = useCallback(() => {
    updateNoteMutation.mutate({ id: noteId, patch: { is_archived: true } });
    selectNote(null);
  }, [noteId, updateNoteMutation, selectNote]);

  const handleRestore = useCallback(() => {
    updateNoteMutation.mutate({ id: noteId, patch: { is_archived: false } });
    selectNote(null);
  }, [noteId, updateNoteMutation, selectNote]);

  const handleDelete = useCallback(() => {
    deleteNoteMutation.mutate(noteId);
    selectNote(null);
  }, [noteId, deleteNoteMutation, selectNote]);

  const handleMoveToFolder = useCallback(
    (folderId: string | null) => {
      updateNoteMutation.mutate({ id: noteId, patch: { folder_id: folderId } });
      setShowFolderMenu(false);
    },
    [noteId, updateNoteMutation],
  );

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full text-text-tertiary">
        メモが見つかりません
      </div>
    );
  }

  const currentFolder = folders.find((f) => f.id === note.folder_id);

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
              aria-label="メモ一覧"
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
          {/* Save status */}
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
          {onCreateNote && (
            <button
              type="button"
              onClick={onCreateNote}
              className="p-1.5 rounded-md text-text-tertiary hover:bg-bg-secondary transition-colors"
              title="新規メモ"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          {note.is_archived ? (
            <>
              <button
                type="button"
                onClick={handleRestore}
                className="p-1.5 rounded-md text-text-tertiary hover:bg-bg-secondary transition-colors"
                title="復元"
              >
                <ArchiveRestore className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 rounded-md text-text-tertiary hover:bg-red-500/10 hover:text-red-500 transition-colors"
                title="完全に削除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleTogglePin}
                className={clsx(
                  'p-1.5 rounded-md transition-colors',
                  note.is_pinned
                    ? 'text-accent hover:bg-accent/10'
                    : 'text-text-tertiary hover:bg-bg-secondary',
                )}
                title={note.is_pinned ? 'ピン解除' : 'ピン留め'}
              >
                {note.is_pinned ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
              </button>

              <button
                type="button"
                onClick={handleArchive}
                className="p-1.5 rounded-md text-text-tertiary hover:bg-bg-secondary transition-colors"
                title="アーカイブ"
              >
                <Archive className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 rounded-md text-text-tertiary hover:bg-red-500/10 hover:text-red-500 transition-colors"
                title="削除"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              {/* More menu */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowMoreMenu((v) => !v)}
                  className="p-1.5 rounded-md text-text-tertiary hover:bg-bg-secondary transition-colors"
                  title="その他"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {showMoreMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-bg-primary border border-border rounded-lg shadow-lg z-30 py-1">
                    <button
                      type="button"
                      onClick={handleTogglePin}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2"
                    >
                      <Pin className="h-4 w-4" />
                      {note.is_pinned ? 'ピン解除' : 'ピン留め'}
                    </button>
                    <button
                      type="button"
                      onClick={handleArchive}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2"
                    >
                      <Archive className="h-4 w-4" />
                      アーカイブ
                    </button>
                    <div className="border-t border-border my-1" />
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2 text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                      削除
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Title & metadata */}
      <div className="px-4 md:px-6 pt-4 shrink-0">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={handleTitleCompositionEnd}
          placeholder="タイトル"
          className="w-full text-xl md:text-2xl font-bold text-text-primary bg-transparent border-none outline-none placeholder:text-text-tertiary"
        />

        {/* Folder selector */}
        <div className="relative mt-2 mb-2" ref={folderMenuRef}>
          <button
            type="button"
            onClick={() => setShowFolderMenu((v) => !v)}
            className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <FolderOpen className="h-3 w-3" />
            <span>{currentFolder?.name ?? '未分類'}</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {showFolderMenu && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-bg-primary border border-border rounded-lg shadow-lg z-30 py-1">
              <button
                type="button"
                onClick={() => handleMoveToFolder(null)}
                className={clsx(
                  'w-full text-left px-3 py-1.5 text-sm hover:bg-bg-secondary',
                  !note.folder_id && 'bg-bg-secondary font-medium',
                )}
              >
                未分類
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => handleMoveToFolder(folder.id)}
                  className={clsx(
                    'w-full text-left px-3 py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2',
                    note.folder_id === folder.id && 'bg-bg-secondary font-medium',
                  )}
                >
                  {folder.color && (
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: folder.color }}
                    />
                  )}
                  {folder.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 px-4 md:px-6 pb-4 md:pb-6 overflow-y-auto">
        <TiptapEditor
          content={note.content}
          onChange={handleContentChange}
        />
      </div>
    </div>
  );
}
