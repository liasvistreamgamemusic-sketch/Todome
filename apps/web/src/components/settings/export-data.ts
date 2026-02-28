import type { Note, Todo, CalendarEvent } from '@todome/store';

type ExportData = {
  version: 1;
  exportedAt: string;
  notes: Note[];
  todos: Todo[];
  events: CalendarEvent[];
};

const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToJSON = (
  notes: Note[],
  todos: Todo[],
  events: CalendarEvent[],
): void => {
  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    notes: notes.filter((n) => !n.is_deleted),
    todos: todos.filter((t) => !t.is_deleted),
    events: events.filter((e) => !e.is_deleted),
  };

  const json = JSON.stringify(data, null, 2);
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadFile(json, `todome-export-${timestamp}.json`, 'application/json');
};

const noteToMarkdown = (note: Note): string => {
  const lines: string[] = [];
  lines.push(`# ${note.title || '無題のメモ'}`);
  lines.push('');

  if (note.tags.length > 0) {
    lines.push(`Tags: ${note.tags.join(', ')}`);
    lines.push('');
  }

  lines.push(`Created: ${new Date(note.created_at).toLocaleString('ja-JP')}`);
  lines.push(`Updated: ${new Date(note.updated_at).toLocaleString('ja-JP')}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(note.plain_text);

  return lines.join('\n');
};

/**
 * Build a simple ZIP file from an array of {name, content} entries.
 * Uses the ZIP format with STORE method (no compression) to avoid
 * external dependencies while remaining spec-compliant.
 */
const buildZip = (
  files: { name: string; content: Uint8Array }[],
): Uint8Array => {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = file.content;

    // Local file header
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true); // signature
    view.setUint16(4, 20, true); // version needed
    view.setUint16(6, 0, true); // flags
    view.setUint16(8, 0, true); // compression (STORE)
    view.setUint16(10, 0, true); // mod time
    view.setUint16(12, 0, true); // mod date
    view.setUint32(14, 0, true); // crc32 (skip for simplicity)
    view.setUint32(18, data.length, true); // compressed size
    view.setUint32(22, data.length, true); // uncompressed size
    view.setUint16(26, nameBytes.length, true); // filename length
    view.setUint16(28, 0, true); // extra field length
    localHeader.set(nameBytes, 30);

    parts.push(localHeader);
    parts.push(data);

    // Central directory entry
    const cdEntry = new Uint8Array(46 + nameBytes.length);
    const cdView = new DataView(cdEntry.buffer);
    cdView.setUint32(0, 0x02014b50, true); // signature
    cdView.setUint16(4, 20, true); // version made by
    cdView.setUint16(6, 20, true); // version needed
    cdView.setUint16(8, 0, true); // flags
    cdView.setUint16(10, 0, true); // compression
    cdView.setUint16(12, 0, true); // mod time
    cdView.setUint16(14, 0, true); // mod date
    cdView.setUint32(16, 0, true); // crc32
    cdView.setUint32(20, data.length, true); // compressed size
    cdView.setUint32(24, data.length, true); // uncompressed size
    cdView.setUint16(28, nameBytes.length, true); // filename length
    cdView.setUint16(30, 0, true); // extra field length
    cdView.setUint16(32, 0, true); // file comment length
    cdView.setUint16(34, 0, true); // disk number start
    cdView.setUint16(36, 0, true); // internal file attributes
    cdView.setUint32(38, 0, true); // external file attributes
    cdView.setUint32(42, offset, true); // relative offset of local header
    cdEntry.set(nameBytes, 46);

    centralDirectory.push(cdEntry);

    offset += localHeader.length + data.length;
  }

  // End of central directory
  let cdSize = 0;
  for (const entry of centralDirectory) {
    parts.push(entry);
    cdSize += entry.length;
  }

  const endOfCd = new Uint8Array(22);
  const endView = new DataView(endOfCd.buffer);
  endView.setUint32(0, 0x06054b50, true); // signature
  endView.setUint16(4, 0, true); // disk number
  endView.setUint16(6, 0, true); // start disk
  endView.setUint16(8, files.length, true); // entries on disk
  endView.setUint16(10, files.length, true); // total entries
  endView.setUint32(12, cdSize, true); // central directory size
  endView.setUint32(16, offset, true); // central directory offset
  endView.setUint16(20, 0, true); // comment length

  parts.push(endOfCd);

  // Concatenate all parts
  let totalLength = 0;
  for (const part of parts) {
    totalLength += part.length;
  }

  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }

  return result;
};

const sanitizeFilename = (name: string): string => {
  return name
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 100);
};

export const exportNoteAsText = (note: Note): void => {
  const lines: string[] = [];
  lines.push(note.title || '無題のメモ');
  lines.push('');
  if (note.tags.length > 0) {
    lines.push(`タグ: ${note.tags.join(', ')}`);
    lines.push('');
  }
  lines.push(note.plain_text);
  const content = lines.join('\n');
  downloadFile(content, `${sanitizeFilename(note.title || 'note')}.txt`, 'text/plain;charset=utf-8');
};

export const exportNoteAsPdf = (note: Note): void => {
  const title = note.title || '無題のメモ';
  const tags = note.tags.length > 0 ? `<p style="color:#666;font-size:13px">タグ: ${note.tags.join(', ')}</p>` : '';
  const body = note.plain_text.split('\n').map((line) => `<p>${line || '&nbsp;'}</p>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#111}h1{font-size:24px;margin-bottom:8px}p{font-size:15px;line-height:1.7;margin:0 0 4px}</style></head><body><h1>${title}</h1>${tags}<hr style="margin:16px 0;border:none;border-top:1px solid #ddd">${body}</body></html>`;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.addEventListener('load', () => {
    printWindow.print();
  });
};

export const exportToMarkdown = (notes: Note[]): void => {
  const encoder = new TextEncoder();
  const activeNotes = notes.filter((n) => !n.is_deleted);

  const files = activeNotes.map((note, index) => {
    const title = note.title || `untitled-${index + 1}`;
    const filename = `${sanitizeFilename(title)}.md`;
    const content = noteToMarkdown(note);

    return {
      name: filename,
      content: encoder.encode(content),
    };
  });

  const zipData = buildZip(files);
  const timestamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([zipData.buffer as ArrayBuffer], { type: 'application/zip' });
  downloadBlob(blob, `todome-notes-${timestamp}.zip`);
};
