'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  loadAttachments,
  createAttachment,
  deleteAttachment,
  uploadFile,
  deleteFile,
} from '@todome/db';
import type { Attachment } from '@todome/db';
import { queryKeys } from './keys';

export function useAttachments(parentType: string, parentId: string) {
  return useQuery({
    queryKey: queryKeys.attachments.byParent(parentType, parentId),
    queryFn: () => loadAttachments(parentType, parentId),
    enabled: !!parentId,
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      userId,
      parentType,
      parentId,
    }: {
      file: File;
      userId: string;
      parentType: string;
      parentId: string;
    }) => {
      // 1. Upload file to storage
      const { storagePath } = await uploadFile(file, userId, parentType, parentId);

      // 2. Create attachment record in DB
      const attachment: Attachment = {
        id: crypto.randomUUID(),
        user_id: userId,
        parent_type: parentType as Attachment['parent_type'],
        parent_id: parentId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        storage_path: storagePath,
        created_at: new Date().toISOString(),
      };

      try {
        await createAttachment(attachment);
      } catch (dbError) {
        // Clean up storage if DB insert fails
        try {
          await deleteFile(storagePath);
        } catch {
          // Ignore storage cleanup errors
        }
        throw dbError;
      }

      return attachment;
    },
    onSettled: (_data, _error, variables) => {
      if (variables) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.attachments.byParent(
            variables.parentType,
            variables.parentId,
          ),
        });
      }
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      storagePath,
      parentType,
      parentId,
    }: {
      id: string;
      storagePath: string;
      parentType: string;
      parentId: string;
    }) => {
      // Delete DB row first, then storage file
      await deleteAttachment(id);
      try {
        await deleteFile(storagePath);
      } catch (storageError) {
        console.warn('Failed to delete storage file after DB row removal:', storagePath, storageError);
      }
      return { parentType, parentId };
    },
    onMutate: async ({ parentType, parentId, id }) => {
      const key = queryKeys.attachments.byParent(parentType, parentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Attachment[]>(key);
      queryClient.setQueryData<Attachment[]>(key, (old) =>
        (old ?? []).filter((a) => a.id !== id),
      );
      return { previous, parentType, parentId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.attachments.byParent(
            context.parentType,
            context.parentId,
          ),
          context.previous,
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      if (variables) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.attachments.byParent(
            variables.parentType,
            variables.parentId,
          ),
        });
      }
    },
  });
}
