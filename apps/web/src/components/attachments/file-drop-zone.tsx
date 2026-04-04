'use client';

import { useState, useCallback, useRef } from 'react';
import { clsx } from 'clsx';

interface FileDropZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  children: React.ReactNode;
  className?: string;
}

export const FileDropZone = ({
  onFiles,
  accept,
  children,
  className,
}: FileDropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items?.length) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      if (accept) {
        const acceptedTypes = accept.split(',').map((t) => t.trim());
        const filtered = files.filter((file) =>
          acceptedTypes.some((type) => {
            if (type.endsWith('/*')) {
              return file.type.startsWith(type.replace('/*', '/'));
            }
            return file.type === type;
          }),
        );
        if (filtered.length > 0) onFiles(filtered);
      } else {
        onFiles(files);
      }
    },
    [accept, onFiles],
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={clsx(
        'relative transition-colors',
        isDragging && 'ring-2 ring-[var(--accent)] ring-inset bg-[var(--accent)]/5 rounded-lg',
        className,
      )}
    >
      {children}
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--accent)]/10 rounded-lg pointer-events-none z-10">
          <span className="text-sm font-medium text-[var(--accent)]">
            Drop files here
          </span>
        </div>
      )}
    </div>
  );
};
