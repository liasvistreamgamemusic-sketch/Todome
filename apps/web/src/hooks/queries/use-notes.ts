'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  loadNotes,
  loadNoteSummaries,
  loadNoteById,
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

export function useNotes() {
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.notes.all(userId ?? ''),
    queryFn: () => loadNotes(userId!),
    enabled: !!userId,
  });
}

export function useNoteSummaries() {
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.notes.summaries(userId ?? ''),
    queryFn: () => loadNoteSummaries(userId!),
    enabled: !!userId,
  });
}

export function useNote(noteId: string | null) {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.notes.detail(noteId ?? ''),
    queryFn: () => loadNoteById(noteId!),
    enabled: !!noteId,
    placeholderData: () => {
      if (!noteId || !userId) return undefined;
      const summaries = queryClient.getQueryData<NoteSummary[]>(
        queryKeys.notes.summaries(userId),
      );
      const summary = summaries?.find((n) => n.id === noteId);
      if (!summary) return undefined;
      return { ...summary, content: null } as Note;
    },
  });
}

export function useFolders() {
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.folders.all(userId ?? ''),
    queryFn: () => loadFolders(userId!),
    enabled: !!userId,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (note: Note) => createNote(note),
    onMutate: async (note) => {
      const allKey = queryKeys.notes.all(userId!);
      const sumKey = queryKeys.notes.summaries(userId!);
      await queryClient.cancelQueries({ queryKey: allKey });
      await queryClient.cancelQueries({ queryKey: sumKey });
      const previousAll = queryClient.getQueryData<Note[]>(allKey);
      const previousSum = queryClient.getQueryData<NoteSummary[]>(sumKey);
      queryClient.setQueryData<Note[]>(allKey, (old) => [note, ...(old ?? [])]);
      const { content: _, ...summary } = note;
      queryClient.setQueryData<NoteSummary[]>(sumKey, (old) => [summary, ...(old ?? [])]);
      return { previousAll, previousSum };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousAll) {
        queryClient.setQueryData(queryKeys.notes.all(userId!), context.previousAll);
      }
      if (context?.previousSum) {
        queryClient.setQueryData(queryKeys.notes.summaries(userId!), context.previousSum);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all(userId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.summaries(userId!) });
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
      const allKey = queryKeys.notes.all(userId!);
      const sumKey = queryKeys.notes.summaries(userId!);
      await queryClient.cancelQueries({ queryKey: allKey });
      await queryClient.cancelQueries({ queryKey: sumKey });
      const previousAll = queryClient.getQueryData<Note[]>(allKey);
      const previousSum = queryClient.getQueryData<NoteSummary[]>(sumKey);
      queryClient.setQueryData<Note[]>(allKey, (old) =>
        (old ?? []).map((n) => (n.id === id ? { ...n, ...patch } : n)),
      );
      queryClient.setQueryData<NoteSummary[]>(sumKey, (old) =>
        (old ?? []).map((n) => (n.id === id ? { ...n, ...patch } : n)),
      );
      return { previousAll, previousSum };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousAll) {
        queryClient.setQueryData(queryKeys.notes.all(userId!), context.previousAll);
      }
      if (context?.previousSum) {
        queryClient.setQueryData(queryKeys.notes.summaries(userId!), context.previousSum);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all(userId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.summaries(userId!) });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onMutate: async (id) => {
      const allKey = queryKeys.notes.all(userId!);
      const sumKey = queryKeys.notes.summaries(userId!);
      await queryClient.cancelQueries({ queryKey: allKey });
      await queryClient.cancelQueries({ queryKey: sumKey });
      const previousAll = queryClient.getQueryData<Note[]>(allKey);
      const previousSum = queryClient.getQueryData<NoteSummary[]>(sumKey);
      queryClient.setQueryData<Note[]>(allKey, (old) =>
        (old ?? []).filter((n) => n.id !== id),
      );
      queryClient.setQueryData<NoteSummary[]>(sumKey, (old) =>
        (old ?? []).filter((n) => n.id !== id),
      );
      return { previousAll, previousSum };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousAll) {
        queryClient.setQueryData(queryKeys.notes.all(userId!), context.previousAll);
      }
      if (context?.previousSum) {
        queryClient.setQueryData(queryKeys.notes.summaries(userId!), context.previousSum);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all(userId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.summaries(userId!) });
    },
  });
}

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
