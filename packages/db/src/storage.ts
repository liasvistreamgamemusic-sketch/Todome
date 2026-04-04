// ---------------------------------------------------------------------------
// Todome – Supabase Storage helpers
// ---------------------------------------------------------------------------

import { supabase } from './supabase';

const BUCKET = 'attachments';

/**
 * Sanitise a filename for safe use in storage paths.
 * Removes path separators, null bytes, and other problematic characters.
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\:*?"<>|#\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 128);
}

/**
 * Upload a file to Supabase Storage.
 *
 * Path convention: `{userId}/{parentType}/{parentId}/{uuid}-{sanitizedFileName}`
 */
export async function uploadFile(
  file: File,
  userId: string,
  parentType: string,
  parentId: string,
): Promise<{ storagePath: string; publicUrl: string }> {
  const sanitized = sanitizeFileName(file.name);
  const storagePath = `${userId}/${parentType}/${parentId}/${crypto.randomUUID()}-${sanitized}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const publicUrl = getPublicUrl(storagePath);
  return { storagePath, publicUrl };
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw error;
}

/**
 * Get the public URL for a storage path.
 */
export function getPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}
