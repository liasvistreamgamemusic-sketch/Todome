import { create } from 'zustand';

export type ActiveSection = 'notes' | 'todos' | 'calendar' | 'settings';
export type Theme = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type Locale = 'ja' | 'en';
export type CalendarWeekStart = 0 | 1;

export type UiStoreState = {
  // State
  sidebarOpen: boolean;
  sidebarWidth: number;
  activeSection: ActiveSection;
  commandPaletteOpen: boolean;
  theme: Theme;
  fontSize: FontSize;
  locale: Locale;
  calendarWeekStart: CalendarWeekStart;

  // Actions
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setActiveSection: (section: ActiveSection) => void;
  toggleCommandPalette: () => void;
  setTheme: (theme: Theme) => void;
  setFontSize: (fontSize: FontSize) => void;
  setLocale: (locale: Locale) => void;
  setCalendarWeekStart: (start: CalendarWeekStart) => void;
};

export const useUiStore = create<UiStoreState>()((set) => ({
  // Initial state
  sidebarOpen: true,
  sidebarWidth: 240,
  activeSection: 'notes',
  commandPaletteOpen: false,
  theme: 'system',
  fontSize: 'medium',
  locale: 'ja',
  calendarWeekStart: 1,

  // Actions
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setActiveSection: (section) => set({ activeSection: section }),
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize }),
  setLocale: (locale) => set({ locale }),
  setCalendarWeekStart: (start) => set({ calendarWeekStart: start }),
}));
