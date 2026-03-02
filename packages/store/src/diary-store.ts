import { create } from 'zustand';

export type DiaryStoreState = {
  selectedDiaryId: string | null;
  selectedDate: string | null;

  selectDiary: (id: string | null) => void;
  selectDate: (date: string | null) => void;
};

export const useDiaryStore = create<DiaryStoreState>()((set) => ({
  selectedDiaryId: null,
  selectedDate: null,

  selectDiary: (id) => set({ selectedDiaryId: id }),
  selectDate: (date) => set({ selectedDate: date }),
}));
