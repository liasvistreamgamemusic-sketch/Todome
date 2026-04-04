import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ActiveSection = 'notes' | 'todos' | 'diary' | 'calendar' | 'settings';
export type Theme = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type Locale = 'ja' | 'en';
export type CalendarWeekStart = 0 | 1;
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export type UiStoreState = {
  // State
  activeSection: ActiveSection;
  commandPaletteOpen: boolean;
  theme: Theme;
  fontSize: FontSize;
  locale: Locale;
  calendarWeekStart: CalendarWeekStart;
  notificationsEnabled: boolean;
  soundEnabled: boolean;

  // Sync state (not persisted)
  syncStatus: SyncStatus;
  pendingOpCount: number;
  syncError: string | null;

  // Actions
  setActiveSection: (section: ActiveSection) => void;
  toggleCommandPalette: () => void;
  setTheme: (theme: Theme) => void;
  setFontSize: (fontSize: FontSize) => void;
  setLocale: (locale: Locale) => void;
  setCalendarWeekStart: (start: CalendarWeekStart) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setPendingOpCount: (count: number) => void;
  setSyncError: (error: string | null) => void;
};

export const useUiStore = create<UiStoreState>()(
  persist(
    (set) => ({
      // Initial state
      activeSection: 'notes',
      commandPaletteOpen: false,
      theme: 'system',
      fontSize: 'medium',
      locale: 'ja',
      calendarWeekStart: 0,
      notificationsEnabled: false,
      soundEnabled: true,

      // Sync state (not persisted)
      syncStatus: 'idle',
      pendingOpCount: 0,
      syncError: null,

      // Actions
      setActiveSection: (section) => set({ activeSection: section }),
      toggleCommandPalette: () =>
        set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLocale: (locale) => set({ locale }),
      setCalendarWeekStart: (start) => set({ calendarWeekStart: start }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setSyncStatus: (status) => set({ syncStatus: status }),
      setPendingOpCount: (count) => set({ pendingOpCount: count }),
      setSyncError: (error) => set({ syncError: error }),
    }),
    {
      name: 'todome-ui-settings',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        locale: state.locale,
        calendarWeekStart: state.calendarWeekStart,
        notificationsEnabled: state.notificationsEnabled,
        soundEnabled: state.soundEnabled,
      }),
    },
  ),
);
