import { create } from 'zustand';
import type { DataRepository, Opportunity } from '../data/types';
import { createRepository } from '../data/repositoryProvider';
import type { ScenarioSelection } from '../domain/decisionTree';

export type AppState = {
  isLoading: boolean;
  opportunities: Opportunity[];
  revenueTarget: number;
  backlogRevenue: number;
  truncatedCount: number;
  selections: ScenarioSelection;
  hydrateFromRepository: () => Promise<void>;
  setSelection: (opportunityId: string, status: ScenarioSelection[string] | null) => void;
  setSelections: (selections: ScenarioSelection) => void;
  resetSelections: () => void;
};

const repository: DataRepository = createRepository();
const MAX_OPEN_OPPORTUNITIES = 30;

function isFy26(date: Date): boolean {
  return date.getFullYear() === 2026;
}

function prioritizeOpportunities(opportunities: Opportunity[]): Opportunity[] {
  return [...opportunities].sort((a, b) => {
    const scoreA = a.tcv * a.pWin;
    const scoreB = b.tcv * b.pWin;
    if (scoreA !== scoreB) return scoreB - scoreA;
    if (a.tcv !== b.tcv) return b.tcv - a.tcv;
    return a.name.localeCompare(b.name);
  });
}

export const useAppState = create<AppState>((set, get) => ({
  isLoading: false,
  opportunities: [],
  revenueTarget: 0,
  backlogRevenue: 0,
  truncatedCount: 0,
  selections: {},
  hydrateFromRepository: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const [opportunities, revenueTarget] = await Promise.all([
        repository.getOpportunities(),
        repository.getRevenueTarget(),
      ]);
      const backlogRevenue = opportunities
        .filter((opportunity) => opportunity.closed && opportunity.bapStage === 'closed-won' && isFy26(opportunity.startDate))
        .reduce((sum, opportunity) => sum + opportunity.tcv, 0);
      const openOpportunities = opportunities.filter((opportunity) => !opportunity.closed);
      const prioritized = prioritizeOpportunities(openOpportunities);
      const truncated = Math.max(prioritized.length - MAX_OPEN_OPPORTUNITIES, 0);
      set({
        opportunities: prioritized.slice(0, MAX_OPEN_OPPORTUNITIES),
        revenueTarget,
        backlogRevenue,
        truncatedCount: truncated,
      });
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
