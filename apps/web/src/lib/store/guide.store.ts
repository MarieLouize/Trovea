import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GuideStore {
  completedGuides: string[];
  completeGuide: (id: string) => void;
  isComplete: (id: string) => boolean;
  allComplete: (pageGuideIds: string[]) => boolean;
}

export const useGuideStore = create<GuideStore>()(
  persist(
    (set, get) => ({
      completedGuides: [],
      completeGuide: (id) => {
        set((state) => ({
          completedGuides: [...state.completedGuides, id],
        }));
      },
      isComplete: (id) => get().completedGuides.includes(id),
      allComplete: (pageGuideIds) => {
        const { completedGuides } = get();
        return pageGuideIds.every((id) => completedGuides.includes(id));
      },
    }),
    {
      name: 'trovea-guides',
    }
  )
); 