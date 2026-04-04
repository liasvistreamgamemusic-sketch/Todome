'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, Paperclip } from 'lucide-react';
import { useTranslation } from '@todome/store';
import {
  useAttachments,
  useUploadAttachment,
  useDeleteAttachment,
} from '@/hooks/queries';
import { FileDropZone } from './file-drop-zone';
import { AttachmentList } from './attachment-list';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_MIME_PREFIXES = [
  'image/',
  'application/pdf',
  'audio/',
  'video/',
  'text/',
];

interface AttachmentPanelProps {
  parentType: 'note' | 'todo' | 'event';
  parentId: string;
  userId: string;
}

export const AttachmentPanel = ({
  parentType,
  parentId,
  userId,
}: AttachmentPanelProps) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: attachments = [] } = useAttachments(parentType, parentId);
  const uploadMutation = useUploadAttachment();
  const deleteMutation = useDeleteAttachment();

  const isUploading = uploadMutation.isPending;

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > MAX_FILE_SIZE) {
        return t('attachments.errorTooLarge');
      }
      const isAllowed = ALLOWED_MIME_PREFIXES.some((prefix) =>
        file.type.startsWith(prefix),
      );
      if (!isAllowed) {
        return t('attachments.errorUploadFailed');
      }
      return null;
    },
    [t],
  );

  const handleUpload = useCallback(
    async (files: File[]) => {
      setUploadError(null);

      for (const file of files) {
        const error = validateFile(file);
        if (error) {
          setUploadError(error);
          continue;
        }

        try {
          await uploadMutation.mutateAsync({
            file,
            userId,
            parentType,
            parentId,
          });
        } catch {
          setUploadError(t('attachments.errorUploadFailed'));
        }
      }
    },
    [validateFile, uploadMutation, userId, parentType, parentId, t],
  );

  const handleDelete = useCallback(
    (id: string, storagePath: string) => {
      deleteMutation.mutate(
        { id, storagePath, parentType, parentId },
        {
          onError: () => setUploadError(t('attachments.errorDeleteFailed')),
        },
      );
    },
    [deleteMutation, parentType, parentId, t],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) handleUpload(files);
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [handleUpload],
  );

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
          <Paperclip className="h-4 w-4" />
          {t('attachments.title')}
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors disabled:opacity-50"
        >
          <Upload className="h-3 w-3" />
          {isUploading ? t('attachments.uploading') : t('attachments.upload')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          accept="image/*,application/pdf,audio/*,video/*,text/*"
        />
      </div>

      {/* Error */}
      {uploadError && (
        <p className="text-xs text-red-500">{uploadError}</p>
      )}

      {/* Drop zone + list */}
      <FileDropZone onFiles={handleUpload}>
        {attachments.length > 0 ? (
          <AttachmentList
            attachments={attachments}
            onDelete={handleDelete}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-text-tertiary">
            <p className="text-xs">{t('attachments.empty')}</p>
            <p className="text-xs mt-0.5">{t('attachments.dragDrop')}</p>
          </div>
        )}
      </FileDropZone>
    </div>
  );
};
