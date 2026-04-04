'use client';

import type { Attachment } from '@todome/db';
import { AttachmentItem } from './attachment-item';

interface AttachmentListProps {
  attachments: Attachment[];
  onDelete: (id: string, storagePath: string) => void;
}

export const AttachmentList = ({
  attachments,
  onDelete,
}: AttachmentListProps) => {
  return (
    <div className="space-y-1">
      {attachments.map((attachment) => (
        <AttachmentItem
          key={attachment.id}
          attachment={attachment}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
