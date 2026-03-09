export const queryKeys = {
  notes: {
    all: (userId: string) => ['notes', userId] as const,
    summaries: (userId: string) => ['notes', userId, 'summaries'] as const,
    detail: (noteId: string) => ['notes', 'detail', noteId] as const,
  },
  folders: {
    all: (userId: string) => ['folders', userId] as const,
  },
  todos: {
    all: (userId: string) => ['todos', userId] as const,
  },
  calendarEvents: {
    all: (userId: string) => ['calendarEvents', userId] as const,
  },
  diaries: {
    all: (userId: string) => ['diaries', userId] as const,
  },
  calendarSubscriptions: {
    all: (userId: string) => ['calendarSubscriptions', userId] as const,
  },
} as const;
