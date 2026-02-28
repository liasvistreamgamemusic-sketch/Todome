import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Note,
  Folder,
  Todo,
  CalendarEvent,
  Attachment,
} from './types';

// ---------------------------------------------------------------------------
// Supabase Database type definition (mirrors the SQL schema)
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      notes: {
        Row: Note;
        Insert: Omit<Note, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Note, 'id'>>;
      };
      folders: {
        Row: Folder;
        Insert: Omit<Folder, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Folder, 'id'>>;
      };
      todos: {
        Row: Todo;
        Insert: Omit<Todo, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Todo, 'id'>>;
      };
      calendar_events: {
        Row: CalendarEvent;
        Insert: Omit<CalendarEvent, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<CalendarEvent, 'id'>>;
      };
      attachments: {
        Row: Attachment;
        Insert: Omit<Attachment, 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Omit<Attachment, 'id'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Log instead of throwing so that offline-only usage is still possible.
  // The client will fail at request time if credentials are truly missing.
  console.warn(
    '[todome/db] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase calls will fail.',
  );
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
