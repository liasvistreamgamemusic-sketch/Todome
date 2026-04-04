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
import { useNoteStore, useTranslation } from '@todome/store';
import type { Note, NoteSummary } from '@todome/db';
import { TiptapEditor } from '@/components/editor/tiptap-editor';
import type { Editor } from '@/components/editor/tiptap-editor';
import { EditorToolbar } from '@/components/editor/editor-toolbar';
import { useNote, useNoteSummaries, useFolders, useUpdateNote, useDeleteNote, useUserId } from '@/hooks/queries';
import { uploadFile, getPublicUrl, createAttachment } from '@todome/db';

type NoteEditorProps = {
  noteId: string;
  onBack?: () => void;
  onMenu?: () => void;
  onCreateNote?: () => void;
};

type SaveStatus = 'saved' | 'saving' | 'error';

export function NoteEditor({ noteId, onBack, onMenu, onCreateNote }: NoteEditorProps) {
  const { t } = useTranslation();
  const { data: noteData, isPlaceholderData } = useNote(noteId);
  const { data: allSummaries } = useNoteSummaries();
  const { data: folders = [] } = useFolders();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  const selectNote = useNoteStore((s) => s.selectNote);

  const userId = useUserId();
  const note = noteData ?? null;

  const handleFileUpload = useCallback(
    async (file: File): Promise<string> => {
      if (!userId) throw new Error('Not authenticated');
      const { storagePath } = await uploadFile(file, userId, 'note', noteId);
      await createAttachment({
        id: crypto.randomUUID(),
        user_id: userId,
        parent_type: 'note',
        parent_id: noteId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        storage_path: storagePath,
        created_at: new Date().toISOString(),
      });
      return getPublicUrl(storagePath);
    },
    [userId, noteId],
  );

  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevNoteIdRef = useRef<string>(noteId);
  // Track the updated_at we last wrote to distinguish our saves from remote changes
  const lastLocalSaveAtRef = useRef<string | null>(null);
  // Track the last updated_at we synced from to detect new remote versions
  const lastSyncedAtRef = useRef<string | null>(null);

  // Check if a note is empty (no title and no content)
  const isNoteEmpty = useCallback((n: Note | NoteSummary | null): boolean => {
    if (!n) return true;
    const hasTitle = n.title.trim().length > 0;
    const hasContent = (n.plain_text ?? '').trim().length > 0;
    return !hasTitle && !hasContent;
  }, []);

  // Delete empty note from DB
  const purgeAndPersist = useCallback(
    (id: string) => {
      const targetNote = allSummaries?.find((n) => n.id === id) ?? null;
      if (targetNote?.is_archived) return;
      if (isNoteEmpty(targetNote)) {
        deleteNoteMutation.mutate(id);
      }
    },
    [allSummaries, isNoteEmpty, deleteNoteMutation],
  );

  // Sync local state when noteId changes or remote data arrives
  useEffect(() => {
    if (prevNoteIdRef.current !== noteId) {
      purgeAndPersist(prevNoteIdRef.current);
      prevNoteIdRef.current = noteId;
      lastLocalSaveAtRef.current = null;
      lastSyncedAtRef.current = null;
    }
    if (!note) return;

    // Skip if we already synced this exact version
    if (note.updated_at === lastSyncedAtRef.current) return;

    // Skip echo-back from our own save (our save timestamp matches)
    if (note.updated_at === lastLocalSaveAtRef.current) {
      lastSyncedAtRef.current = note.updated_at;
      return;
    }

    // Remote change or initial load — accept it
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setTitle(note.title);
    lastSyncedAtRef.current = note.updated_at;
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
      setSaveStatus('saving');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        const now = new Date().toISOString();
        const fullPatch = { ...patch, updated_at: now };
        lastLocalSaveAtRef.current = now;
        updateNoteMutation.mutate(
          { id: noteId, patch: fullPatch },
          {
            onSuccess: () => setSaveStatus('saved'),
            onError: () => setSaveStatus('error'),
          },
        );
      }, 500);
    },
    [noteId, updateNoteMutation],
  );

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // IME composition guard – suppress saves while composing (e.g. Japanese input)
  const isComposingRef = useRef(false);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
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
      debouncedSave({
        content: content as unknown as Note['content'],
        plain_text: plainText,
      });
    },
    [debouncedSave],
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
        {t('notes.notFound')}
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
              aria-label={t('notes.noteList')}
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          {onBack && !onMenu && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-md text-text-secondary hover:bg-bg-secondary transition-colors mr-1"
              aria-label={t('common.back')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          {/* Save status */}
          <div className="flex items-center gap-1 text-xs text-text-tertiary mr-2">
            {saveStatus === 'saving' && (
              <>
                <Save className="h-3 w-3 animate-pulse" />
                <span>{t('notes.saving')}</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Save className="h-3 w-3" />
                <span>{t('notes.saved')}</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="h-3 w-3 text-red-500" />
                <span className="text-red-500">{t('notes.saveError')}</span>
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
              title={t('notes.newNote')}
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
                title={t('common.restore')}
              >
                <ArchiveRestore className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 rounded-md text-text-tertiary hover:bg-red-500/10 hover:text-red-500 transition-colors"
                title={t('common.deletePermanently')}
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
                title={note.is_pinned ? t('notes.unpin') : t('notes.pin')}
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
                title={t('notes.archive')}
              >
                <Archive className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 rounded-md text-text-tertiary hover:bg-red-500/10 hover:text-red-500 transition-colors"
                title={t('common.delete')}
              >
                <Trash2 className="h-4 w-4" />
              </button>

              {/* More menu */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowMoreMenu((v) => !v)}
                  className="p-1.5 rounded-md text-text-tertiary hover:bg-bg-secondary transition-colors"
                  title={t('notes.more')}
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
                      {note.is_pinned ? t('notes.unpin') : t('notes.pin')}
                    </button>
                    <button
                      type="button"
                      onClick={handleArchive}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2"
                    >
                      <Archive className="h-4 w-4" />
                      {t('notes.archive')}
                    </button>
                    <div className="border-t border-border my-1" />
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2 text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('common.delete')}
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
          placeholder={t('notes.title')}
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
            <span>{currentFolder?.name ?? t('notes.uncategorized')}</span>
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
                {t('notes.uncategorized')}
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

      {/* Editor toolbar (fixed, outside scroll area) */}
      {editorInstance && (
        <div className="shrink-0">
          <EditorToolbar editor={editorInstance} onFileUpload={userId ? handleFileUpload : undefined} />
        </div>
      )}

      {/* Editor (scrollable) */}
      <div className="flex-1 min-h-0 px-4 md:px-6 pb-4 md:pb-6 overflow-y-auto">
        {isPlaceholderData ? (
          <div className="space-y-3 pt-4 animate-pulse">
            <div className="h-4 bg-bg-secondary rounded w-full" />
            <div className="h-4 bg-bg-secondary rounded w-5/6" />
            <div className="h-4 bg-bg-secondary rounded w-4/6" />
            <div className="h-4 bg-bg-secondary rounded w-full" />
            <div className="h-4 bg-bg-secondary rounded w-3/6" />
          </div>
        ) : (
          <TiptapEditor
            content={note.content}
            onChange={handleContentChange}
            contentKey={noteId}
            hideToolbar
            onEditorReady={setEditorInstance}
            onFileUpload={userId ? handleFileUpload : undefined}
          />
        )}
      </div>
    </div>
  );
}
