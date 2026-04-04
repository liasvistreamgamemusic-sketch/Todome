'use client';

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  FileText,
  FileAudio,
  FileVideo,
  File as FileIcon,
  Download,
  Trash2,
} from 'lucide-react';
import type { Attachment } from '@todome/db';
import { getPublicUrl } from '@todome/db';
import { useTranslation } from '@todome/store';
import { ImageLightbox } from './image-lightbox';

interface AttachmentItemProps {
  attachment: Attachment;
  onDelete: (id: string, storagePath: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.startsWith('text/') || mimeType === 'application/pdf')
    return FileText;
  return FileIcon;
}

export const AttachmentItem = ({
  attachment,
  onDelete,
}: AttachmentItemProps) => {
  const { t } = useTranslation();
  const [showLightbox, setShowLightbox] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const publicUrl = getPublicUrl(attachment.storage_path);
  const isImage = attachment.mime_type.startsWith('image/');
  const Icon = getFileIcon(attachment.mime_type);

  const handleDelete = useCallback(() => {
    if (confirmDelete) {
      onDelete(attachment.id, attachment.storage_path);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      // Auto-reset confirm state after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }, [confirmDelete, attachment, onDelete]);

  return (
    <>
      <div className="group flex items-center gap-2 p-2 rounded-lg hover:bg-bg-secondary transition-colors">
        {/* Thumbnail / Icon */}
        {isImage ? (
          <button
            type="button"
            onClick={() => setShowLightbox(true)}
            className="shrink-0 w-[60px] h-[60px] rounded-md overflow-hidden border border-border hover:opacity-80 transition-opacity"
          >
            <img
              src={publicUrl}
              alt={attachment.file_name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ) : (
          <div className="shrink-0 w-[60px] h-[60px] rounded-md border border-border flex items-center justify-center bg-bg-secondary">
            <Icon className="h-6 w-6 text-text-tertiary" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary truncate">
            {attachment.file_name}
          </p>
          <p className="text-xs text-text-tertiary">
            {formatFileSize(attachment.file_size)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={publicUrl}
            download={attachment.file_name}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
            title={t('attachments.download')}
          >
            <Download className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            onClick={handleDelete}
            className={clsx(
              'p-1.5 rounded-md transition-colors',
              confirmDelete
                ? 'bg-red-500/10 text-red-500'
                : 'text-text-tertiary hover:bg-red-500/10 hover:text-red-500',
            )}
            title={
              confirmDelete
                ? t('attachments.confirmDelete')
                : t('attachments.delete')
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {showLightbox && isImage && (
        <ImageLightbox
          src={publicUrl}
          alt={attachment.file_name}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
  );
};
