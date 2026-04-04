'use client';

import { useEffect } from 'react';
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
  getCachedNoteSummaries,
  getCachedNoteById,
  getCachedFolders,
  cacheNoteSummaries,
  cacheNote,
  cacheFolders,
  removeCachedNote,
  offlineCreateNote,
  offlineUpdateNote,
  offlineDeleteNote,
  offlineCreateFolder,
  offlineUpdateFolder,
  offlineDeleteFolder,
} from '@todome/db';
import type { Note, NoteSummary, Folder } from '@todome/db';
import { useOnline } from '@todome/hooks';
import { queryKeys } from './keys';
import { useUserId } from './use-auth';

// ---------------------------------------------------------------------------
// Seed helpers – load IndexedDB cache into TanStack Query on mount
// ---------------------------------------------------------------------------

function useSeedFromCache() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  useEffect(() => {
    if (!userId) return;
    // Only seed if TanStack Query has no data yet (cold start)
    const sumKey = queryKeys.notes.summaries(userId);
    const foldKey = queryKeys.folders.all(userId);

    if (!queryClient.getQueryData(sumKey)) {
      getCachedNoteSummaries(userId).then((cached) => {
        if (cached.length > 0 && !queryClient.getQueryData(sumKey)) {
          queryClient.setQueryData(sumKey, cached);
        }
      });
    }

    if (!queryClient.getQueryData(foldKey)) {
      getCachedFolders(userId).then((cached) => {
        if (cached.length > 0 && !queryClient.getQueryData(foldKey)) {
          queryClient.setQueryData(foldKey, cached);
        }
      });
    }
  }, [userId, queryClient]);
}

/** Seed a single note detail from IndexedDB cache (only if content exists) */
function useSeedNoteDetail(noteId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!noteId) return;
    const key = queryKeys.notes.detail(noteId);
    if (!queryClient.getQueryData(key)) {
      getCachedNoteById(noteId).then((cached) => {
        // Only seed if we have real content — seeding with content: null
        // causes Tiptap to initialize empty and ignore the later Supabase fetch
        if (cached?.content && !queryClient.getQueryData(key)) {
          queryClient.setQueryData(key, cached);
        }
      });
    }
  }, [noteId, queryClient]);
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

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
  const isOnline = useOnline();
  useSeedFromCache();

  return useQuery({
    queryKey: queryKeys.notes.summaries(userId ?? ''),
    queryFn: async () => {
      if (!isOnline) {
        return (await getCachedNoteSummaries(userId!)) ?? [];
      }
      const data = await loadNoteSummaries(userId!);
      cacheNoteSummaries(data, userId!);
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Realtime handles invalidation
  });
}

export function useNote(noteId: string | null) {
  const queryClient = useQueryClient();
  const userId = useUserId();
  useSeedNoteDetail(noteId);

  return useQuery({
    queryKey: queryKeys.notes.detail(noteId ?? ''),
    queryFn: async () => {
      const data = await loadNoteById(noteId!);
      if (data) cacheNote(data);
      return data;
    },
    enabled: !!noteId,
    staleTime: 5 * 60 * 1000, // Realtime handles invalidation
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
  const isOnline = useOnline();
  useSeedFromCache();

  return useQuery({
    queryKey: queryKeys.folders.all(userId ?? ''),
    queryFn: async () => {
      if (!isOnline) {
        return (await getCachedFolders(userId!)) ?? [];
      }
      const data = await loadFolders(userId!);
      cacheFolders(data, userId!);
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Realtime handles invalidation
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const isOnline = useOnline();

  return useMutation({
    mutationFn: (note: Note) => offlineCreateNote(isOnline, note),
    onMutate: async (note) => {
      const allKey = queryKeys.notes.all(userId!);
      const sumKey = queryKeys.notes.summaries(userId!);
      const detailKey = queryKeys.notes.detail(note.id);
      await queryClient.cancelQueries({ queryKey: allKey });
      await queryClient.cancelQueries({ queryKey: sumKey });
      const previousAll = queryClient.getQueryData<Note[]>(allKey);
      const previousSum = queryClient.getQueryData<NoteSummary[]>(sumKey);
      queryClient.setQueryData<Note[]>(allKey, (old) => [note, ...(old ?? [])]);
      const { content: _, ...summary } = note;
      queryClient.setQueryData<NoteSummary[]>(sumKey, (old) => [summary, ...(old ?? [])]);
      // Seed detail cache so NoteEditor renders immediately
      queryClient.setQueryData<Note>(detailKey, note);
      cacheNote(note);
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
    onSettled: (_data, _err, note) => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.notes.all(userId!) });
        queryClient.invalidateQueries({ queryKey: queryKeys.notes.summaries(userId!) });
        queryClient.invalidateQueries({ queryKey: queryKeys.notes.detail(note.id) });
      }
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const isOnline = useOnline();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Note> }) =>
      offlineUpdateNote(isOnline, id, patch, userId!),
    onMutate: async ({ id, patch }) => {
      const allKey = queryKeys.notes.all(userId!);
      const sumKey = queryKeys.notes.summaries(userId!);
      const detailKey = queryKeys.notes.detail(id);
      await queryClient.cancelQueries({ queryKey: allKey });
      await queryClient.cancelQueries({ queryKey: sumKey });
      const previousAll = queryClient.getQueryData<Note[]>(allKey);
      const previousSum = queryClient.getQueryData<NoteSummary[]>(sumKey);
      const previousDetail = queryClient.getQueryData<Note>(detailKey);
      queryClient.setQueryData<Note[]>(allKey, (old) =>
        (old ?? []).map((n) => (n.id === id ? { ...n, ...patch } : n)),
      );
      queryClient.setQueryData<NoteSummary[]>(sumKey, (old) =>
        (old ?? []).map((n) => (n.id === id ? { ...n, ...patch } : n)),
      );
      if (previousDetail) {
        const updated = { ...previousDetail, ...patch };
        queryClient.setQueryData<Note>(detailKey, updated);
        cacheNote(updated);
      }
      return { previousAll, previousSum, previousDetail, noteId: id };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousAll) {
        queryClient.setQueryData(queryKeys.notes.all(userId!), context.previousAll);
      }
      if (context?.previousSum) {
        queryClient.setQueryData(queryKeys.notes.summaries(userId!), context.previousSum);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(
          queryKeys.notes.detail(context.noteId),
          context.previousDetail,
        );
      }
    },
    onSettled: (_data, _err, { id }) => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.notes.all(userId!) });
        queryClient.invalidateQueries({ queryKey: queryKeys.notes.summaries(userId!) });
        queryClient.invalidateQueries({ queryKey: queryKeys.notes.detail(id) });
      }
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const isOnline = useOnline();

  return useMutation({
    mutationFn: (id: string) => offlineDeleteNote(isOnline, id, userId!),
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
      removeCachedNote(id);
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
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.notes.all(userId!) });
        queryClient.invalidateQueries({ queryKey: queryKeys.notes.summaries(userId!) });
      }
    },
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const isOnline = useOnline();

  return useMutation({
    mutationFn: (folder: Folder) => offlineCreateFolder(isOnline, folder),
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
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.folders.all(userId!) });
      }
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const isOnline = useOnline();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Folder> }) =>
      offlineUpdateFolder(isOnline, id, patch, userId!),
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
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.folders.all(userId!) });
      }
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const isOnline = useOnline();

  return useMutation({
    mutationFn: (id: string) => offlineDeleteFolder(isOnline, id, userId!),
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
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.folders.all(userId!) });
      }
    },
  });
}
