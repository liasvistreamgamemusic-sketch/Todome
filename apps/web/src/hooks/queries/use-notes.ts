'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  loadNotes,
  loadFolders,
  createNote,
  updateNote,
  deleteNote,
  createFolder,
  updateFolder,
  deleteFolder,
} from '@todome/db';
import type { Note, Folder } from '@todome/db';
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
      const key = queryKeys.notes.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Note[]>(key);
      queryClient.setQueryData<Note[]>(key, (old) => [note, ...(old ?? [])]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.notes.all(userId!), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all(userId!) });
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
      const previous = queryClient.getQueryData<Note[]>(key);
      queryClient.setQueryData<Note[]>(key, (old) =>
        (old ?? []).map((n) => (n.id === id ? { ...n, ...patch } : n)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.notes.all(userId!), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all(userId!) });
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
      const previous = queryClient.getQueryData<Note[]>(key);
      queryClient.setQueryData<Note[]>(key, (old) =>
        (old ?? []).filter((n) => n.id !== id),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.notes.all(userId!), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all(userId!) });
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
