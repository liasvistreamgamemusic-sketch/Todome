import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** Client-side representation of an external calendar event (not persisted to DB). */
export type ExternalCalendarEvent = {
  id: string;
  subscription_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  location: string | null;
  color: string;
  provider: 'google' | 'outlook' | 'apple' | 'other';
  ics_uid: string;
};

export type SubscriptionSyncStatus = 'idle' | 'syncing' | 'error';

export type SubscriptionStoreState = {
  eventsBySubscription: Record<string, ExternalCalendarEvent[]>;
  syncStatus: Record<string, SubscriptionSyncStatus>;

  allExternalEvents: () => ExternalCalendarEvent[];
  setEvents: (subscriptionId: string, events: ExternalCalendarEvent[]) => void;
  clearEvents: (subscriptionId: string) => void;
  setSyncStatus: (subscriptionId: string, status: SubscriptionSyncStatus) => void;
  clearAll: () => void;
};

export const useSubscriptionStore = create<SubscriptionStoreState>()(
  persist(
    (set, get) => ({
      eventsBySubscription: {},
      syncStatus: {},

      allExternalEvents: () => {
        const map = get().eventsBySubscription;
        const all: ExternalCalendarEvent[] = [];
        for (const events of Object.values(map)) {
          all.push(...events);
        }
        return all;
      },

      setEvents: (subscriptionId, events) =>
        set((s) => ({
          eventsBySubscription: {
            ...s.eventsBySubscription,
            [subscriptionId]: events,
          },
        })),

      clearEvents: (subscriptionId) =>
        set((s) => {
          const next = { ...s.eventsBySubscription };
          delete next[subscriptionId];
          return { eventsBySubscription: next };
        }),

      setSyncStatus: (subscriptionId, status) =>
        set((s) => ({
          syncStatus: { ...s.syncStatus, [subscriptionId]: status },
        })),

      clearAll: () => set({ eventsBySubscription: {}, syncStatus: {} }),
    }),
    {
      name: 'todome-subscription-events',
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
        eventsBySubscription: state.eventsBySubscription,
      }),
    },
  ),
);
