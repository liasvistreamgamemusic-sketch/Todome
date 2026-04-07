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
  NoteSummary,
  Folder,
  Subtask,
  Todo,
  TodoList,
  CalendarEvent,
  Attachment,
  CreateNoteInput,
  UpdateNoteInput,
  CreateFolderInput,
  UpdateFolderInput,
  CreateTodoInput,
  UpdateTodoInput,
  CreateTodoListInput,
  UpdateTodoListInput,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  CalendarProvider,
  CalendarSubscription,
  CreateCalendarSubscriptionInput,
  UpdateCalendarSubscriptionInput,
  ExternalCalendarEvent,
  DisplayEvent,
  MemberStatus,
  SharedCalendar,
  SharedCalendarMember,
  SharedCalendarEvent,
  Diary,
  DiaryMood,
  DiaryWeather,
  DiaryRating,
  CreateDiaryInput,
  UpdateDiaryInput,
  CreateAttachmentInput,
  UserSettings,
} from './types';

export {
  TODO_PRIORITIES,
  TODO_STATUSES,
  PARENT_TYPES,
  REMIND_REPEATS,
  CALENDAR_PROVIDERS,
  MEMBER_STATUSES,
  DIARY_MOODS,
  DIARY_WEATHERS,
  DIARY_RATINGS,
  Ok,
  Err,
} from './types';

// Supabase
export { supabase } from './supabase';
export type { Database } from './supabase';

// IndexedDB read-only cache
export {
  getCachedNoteSummaries,
  getCachedNoteById,
  cacheNoteSummaries,
  cacheNote,
  removeCachedNote,
  getCachedFolders,
  cacheFolders,
  getCachedTodos,
  cacheTodos,
  getCachedTodoLists,
  cacheTodoLists,
  getCachedCalendarEvents,
  cacheCalendarEvents,
  getCachedDiaries,
  cacheDiaries,
} from './cache';

// Repository layer
export {
  loadNotes,
  loadNoteSummaries,
  loadNoteById,
  createNote,
  updateNote,
  deleteNote,
  loadFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  loadTodoLists,
  createTodoList,
  updateTodoList,
  deleteTodoList,
  loadTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  batchUpdateTodos,
  loadCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  loadDiaries,
  createDiary,
  updateDiary,
  deleteDiary,
  loadCalendarSubscriptions,
  createCalendarSubscription,
  updateCalendarSubscription,
  deleteCalendarSubscription,
  loadSharedCalendars,
  createSharedCalendar,
  updateSharedCalendar,
  deleteSharedCalendar,
  loadSharedCalendarMembers,
  loadAllSharedCalendarMembers,
  getMemberDisplayNames,
  createInviteToken,
  claimInvite,
  removeSharedCalendarMember,
  updateMemberVisibility,
  loadSharedCalendarEvents,
  createSharedCalendarEvent,
  updateSharedCalendarEvent,
  deleteSharedCalendarEvent,
  loadAttachments,
  createAttachment,
  deleteAttachment,
  loadUserSettings,
  upsertUserSettings,
} from './repository';

// Offline queue
export {
  enqueueOperation,
  getPendingOps,
  getPendingCount,
  deleteOperation,
  markOperationFailed,
  clearUserQueue,
} from './offline-queue';
export type {
  TableName,
  OperationType,
  PendingOperation,
} from './offline-queue';

// Queue flush engine
export { flushQueue } from './queue-flush';
export type { FlushResult } from './queue-flush';

// Offline-aware repository wrappers
export {
  offlineCreateNote,
  offlineUpdateNote,
  offlineDeleteNote,
  offlineCreateFolder,
  offlineUpdateFolder,
  offlineDeleteFolder,
  offlineCreateTodo,
  offlineUpdateTodo,
  offlineDeleteTodo,
  offlineCreateTodoList,
  offlineUpdateTodoList,
  offlineDeleteTodoList,
  offlineCreateCalendarEvent,
  offlineUpdateCalendarEvent,
  offlineDeleteCalendarEvent,
  offlineCreateDiary,
  offlineUpdateDiary,
  offlineDeleteDiary,
} from './offline-aware-repo';

// Storage helpers
export {
  uploadFile,
  deleteFile,
  getPublicUrl,
} from './storage';
