// ---------------------------------------------------------------------------
// @todome/db – public API
// ---------------------------------------------------------------------------

// Types & constants
export type {
  TiptapDocument,
  TiptapNode,
  TiptapMark,
  TodoPriority,
  TodoStatus,
  ParentType,
  RemindRepeat,
  Result,
  Note,
  Folder,
  Todo,
  CalendarEvent,
  Attachment,
  CreateNoteInput,
  UpdateNoteInput,
  CreateFolderInput,
  UpdateFolderInput,
  CreateTodoInput,
  UpdateTodoInput,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  Diary,
  DiaryMood,
  DiaryWeather,
  DiaryRating,
  CreateDiaryInput,
  UpdateDiaryInput,
  CreateAttachmentInput,
} from './types';

export {
  TODO_PRIORITIES,
  TODO_STATUSES,
  PARENT_TYPES,
  REMIND_REPEATS,
  DIARY_MOODS,
  DIARY_WEATHERS,
  DIARY_RATINGS,
  Ok,
  Err,
} from './types';

// Supabase
export { supabase } from './supabase';
export type { Database } from './supabase';

// Repository layer
export {
  loadNotes,
  createNote,
  updateNote,
  deleteNote,
  purgeNote,
  loadFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  loadTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  loadCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  loadDiaries,
  createDiary,
  updateDiary,
  deleteDiary,
} from './repository';
