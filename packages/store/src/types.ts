/**
 * Local type definitions for Todome entities.
 * These mirror the @todome/db schema and should be replaced
 * with imports from @todome/db once that package exports them.
 */

export type Note = {
  id: string;
  user_id: string;
  title: string;
  content: Record<string, unknown>;
  plain_text: string;
  folder_id: string | null;
  tags: string[];
  is_pinned: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
};

export type Folder = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type TodoPriority = 1 | 2 | 3 | 4;

export type TodoRemindRepeat =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly';

export type Todo = {
  id: string;
  user_id: string;
  title: string;
  detail: string | null;
  priority: TodoPriority;
  status: TodoStatus;
  due_date: string | null;
  remind_at: string | null;
  remind_repeat: TodoRemindRepeat;
  note_ids: string[];
  tags: string[];
  sort_order: number;
  is_deleted: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  location: string | null;
  color: string | null;
  diary_content: string | null;
  remind_at: string | null;
  repeat_rule: string | null;
  repeat_parent_id: string | null;
  todo_ids: string[];
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};
