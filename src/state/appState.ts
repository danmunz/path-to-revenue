import { create } from 'zustand';
import type { DataRepository, Opportunity } from '../data/types';
import { createRepository } from '../data/repositoryProvider';
import type { ScenarioSelection } from '../domain/decisionTree';

export type AppState = {
  isLoading: boolean;
  opportunities: Opportunity[];
  revenueTarget: number;
  selections: ScenarioSelection;
  hydrateFromRepository: () => Promise<void>;
  setSelection: (opportunityId: string, status: ScenarioSelection[string] | null) => void;
  setSelections: (selections: ScenarioSelection) => void;
  resetSelections: () => void;
};

const repository: DataRepository = createRepository();

export const useAppState = create<AppState>((set, get) => ({
  isLoading: false,
  opportunities: [],
  revenueTarget: 0,
  selections: {},
  hydrateFromRepository: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const [opportunities, revenueTarget] = await Promise.all([
        repository.getOpportunities(),
        repository.getRevenueTarget(),
      ]);
      set({ opportunities, revenueTarget });
    } catch (error) {
      console.error('Failed to hydrate data repository', error);
    } finally {
      set({ isLoading: false });
    }
  },
  setSelection: (opportunityId, status) =>
    set((state) => {
      const next = { ...state.selections };
      if (status) {
        next[opportunityId] = status;
      } else {
        delete next[opportunityId];
      }
      return { selections: next };
    }),
  setSelections: (selections) => set({ selections }),
  resetSelections: () => set({ selections: {} }),
}));
