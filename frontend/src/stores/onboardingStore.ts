import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OnboardingState {
  completedByUserId: Record<string, boolean>;
  markComplete: (userId: string) => void;
  resetForUser: (userId: string) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completedByUserId: {},
      markComplete: (userId) =>
        set((state) => ({
          completedByUserId: {
            ...state.completedByUserId,
            [userId]: true,
          },
        })),
      resetForUser: (userId) =>
        set((state) => {
          const { [userId]: _, ...rest } = state.completedByUserId;
          return { completedByUserId: rest };
        }),
    }),
    {
      name: "eventhorizon-onboarding",
      partialize: (state) => ({
        completedByUserId: state.completedByUserId,
      }),
    }
  )
);
