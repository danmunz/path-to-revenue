import { create } from 'zustand';
import type { DataRepository, Project } from '../data/types';
import { createRepository } from '../data/repositoryProvider';
import type { ScenarioSelection } from '../domain/scenarioCalculator';

export type AppState = {
  isLoading: boolean;
  projects: Project[];
  revenueTarget: number;
  lastUpdated: Date | null;
  selections: ScenarioSelection;
  filters: {
    minPWin: number;
    bapStage:
      | 'any'
      | 'identify'
      | 'qualify'
      | 'capture'
      | 'propose'
      | 'awaiting-award'
      | 'closed-won'
      | 'closed-lost'
      | 'closed-no-bid'
      | 'closed-canceled';
    owner: 'any' | string;
    priority: 'any' | 'top' | 'portfolio';
  };
  hydrateFromRepository: () => Promise<void>;
  setSelection: (projectId: string, status: ScenarioSelection[string]) => void;
  resetSelections: () => void;
  updateFilters: (filters: Partial<AppState['filters']>) => void;
};

const repository: DataRepository = createRepository();

export const useAppState = create<AppState>((set, get) => ({
  isLoading: false,
  projects: [],
  revenueTarget: 0,
  lastUpdated: null,
  selections: {},
  filters: {
    minPWin: 0,
    bapStage: 'any',
    owner: 'any',
    priority: 'any',
  },
  hydrateFromRepository: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const [projects, revenueTarget] = await Promise.all([
        repository.getProjects(),
        repository.getRevenueTarget(),
      ]);
      set({ projects, revenueTarget, lastUpdated: new Date() });
    } catch (error) {
      console.error('Failed to hydrate data repository', error);
    } finally {
      set({ isLoading: false });
    }
  },
  setSelection: (projectId, status) =>
    set((state) => ({ selections: { ...state.selections, [projectId]: status } })),
  resetSelections: () => set({ selections: {} }),
  updateFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
}));
