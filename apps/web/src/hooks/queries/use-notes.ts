'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  loadNoteSummaries,
  loadNote,
  loadFolders,
  createNote,
  updateNote,
  deleteNote,
  createFolder,
  updateFolder,
  deleteFolder,
} from '@todome/db';
import type { Note, NoteSummary, Folder } from '@todome/db';
import { queryKeys } from './keys';
import { useUserId } from './use-auth';

// ---------------------------------------------------------------------------
// Notes – summary list (excludes heavy `content` field)
// ---------------------------------------------------------------------------

export function useNotes() {
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.notes.all(userId ?? ''),
    queryFn: () => loadNoteSummaries(userId!),
    enabled: !!userId,
  });
}

// ---------------------------------------------------------------------------
// Note – single note with full content (for the editor)
// ---------------------------------------------------------------------------

export function useNote(noteId: string | null) {
  return useQuery({
    queryKey: queryKeys.notes.detail(noteId ?? ''),
    queryFn: () => loadNote(noteId!),
    enabled: !!noteId,
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------

export function useFolders() {
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.folders.all(userId ?? ''),
    queryFn: () => loadFolders(userId!),
    enabled: !!userId,
  });
}

// ---------------------------------------------------------------------------
// Mutations – Notes
// ---------------------------------------------------------------------------

function toSummary(note: Note): NoteSummary {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { content, ...summary } = note;
  return summary;
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (note: Note) => createNote(note),
    onMutate: async (note) => {
      const key = queryKeys.notes.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NoteSummary[]>(key);
      queryClient.setQueryData<NoteSummary[]>(key, (old) => [toSummary(note), ...(old ?? [])]);
      queryClient.setQueryData<Note | null>(queryKeys.notes.detail(note.id), note);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.notes.all(userId!), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Note> }) =>
      updateNote(id, patch),
    onMutate: async ({ id, patch }) => {
      const key = queryKeys.notes.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NoteSummary[]>(key);
      queryClient.setQueryData<NoteSummary[]>(key, (old) =>
        (old ?? []).map((n) => (n.id === id ? { ...n, ...patch } : n)),
      );
      // Also update the detail cache if it exists
      const detailKey = queryKeys.notes.detail(id);
      const cached = queryClient.getQueryData<Note | null>(detailKey);
      if (cached) {
        queryClient.setQueryData<Note | null>(detailKey, { ...cached, ...patch });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.notes.all(userId!), context.previous);
      }
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onMutate: async (id) => {
      const key = queryKeys.notes.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NoteSummary[]>(key);
      queryClient.setQueryData<NoteSummary[]>(key, (old) =>
        (old ?? []).filter((n) => n.id !== id),
      );
      queryClient.removeQueries({ queryKey: queryKeys.notes.detail(id) });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.notes.all(userId!), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations – Folders
// ---------------------------------------------------------------------------

export function useCreateFolder() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (folder: Folder) => createFolder(folder),
    onMutate: async (folder) => {
      const key = queryKeys.folders.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Folder[]>(key);
      queryClient.setQueryData<Folder[]>(key, (old) => [...(old ?? []), folder]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.folders.all(userId!), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.folders.all(userId!) });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Folder> }) =>
      updateFolder(id, patch),
    onMutate: async ({ id, patch }) => {
      const key = queryKeys.folders.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Folder[]>(key);
      queryClient.setQueryData<Folder[]>(key, (old) =>
        (old ?? []).map((f) => (f.id === id ? { ...f, ...patch } : f)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.folders.all(userId!), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.folders.all(userId!) });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onMutate: async (id) => {
      const key = queryKeys.folders.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Folder[]>(key);
      queryClient.setQueryData<Folder[]>(key, (old) =>
        (old ?? []).filter((f) => f.id !== id),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.folders.all(userId!), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.folders.all(userId!) });
    },
  });
}
