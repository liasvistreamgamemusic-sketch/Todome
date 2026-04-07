import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import type {
  Note,
  Folder,
  Todo,
  CalendarEvent,
  Attachment,
  UserSettings,
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
      user_settings: {
        Row: UserSettings;
        Insert: Omit<UserSettings, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<UserSettings, 'user_id'>>;
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

const isBrowser = typeof window !== 'undefined';
const isTauri = isBrowser && 'CORSFetch' in window;
const url = SUPABASE_URL || 'https://placeholder.supabase.co';
const key = SUPABASE_ANON_KEY || 'placeholder-key';

// Tauri: createClient with localStorage (cookies unreliable in macOS WKWebView)
// Browser: createBrowserClient with cookie-based auth (SSR middleware compat)
// Server: createClient with no persistence
export const supabase: SupabaseClient<Database> = isTauri
  ? createClient<Database>(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'todome-auth',
        storage: window.localStorage,
      },
    })
  : isBrowser
    ? (createBrowserClient<Database>(url, key) as unknown as SupabaseClient<Database>)
    : createClient<Database>(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
