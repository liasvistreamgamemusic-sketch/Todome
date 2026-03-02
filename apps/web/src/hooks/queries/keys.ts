export const queryKeys = {
  notes: {
    all: (userId: string) => ['notes', userId] as const,
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
} as const;
