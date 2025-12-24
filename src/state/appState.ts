import { create } from 'zustand';
import type { DataRepository, Opportunity } from '../data/types';
import { createRepository } from '../data/repositoryProvider';
import type { ScenarioSelection } from '../domain/decisionTree';

export type OrderingMode = 'priority' | 'revenue' | 'close-date' | 'strategic-dependency' | 'manual';

export type AppState = {
  isLoading: boolean;
  orderingMode: OrderingMode;
  openOpportunities: Opportunity[];
  priorityOpportunities: Opportunity[];
  otherOpportunities: Opportunity[];
  revenueTarget: number;
  backlogRevenue: number;
  truncatedCount: number;
  selections: ScenarioSelection;
  lastAction: { opportunityId: string; outcome: ScenarioSelection[string] | null } | null;
  hydrateFromRepository: () => Promise<void>;
  setOrderingMode: (mode: OrderingMode) => void;
  setSelection: (opportunityId: string, status: ScenarioSelection[string] | null) => void;
  setSelections: (selections: ScenarioSelection) => void;
  resetSelections: () => void;
};

const repository: DataRepository = createRepository();
const MAX_PRIORITY_OPPORTUNITIES = 10;

function isFy26(date: Date): boolean {
  return date.getFullYear() === 2026;
}

function orderOpportunities(opportunities: Opportunity[], mode: OrderingMode): Opportunity[] {
  const ordered = [...opportunities];
  switch (mode) {
    case 'revenue':
      return ordered.sort((a, b) => {
        if (a.tcv !== b.tcv) return b.tcv - a.tcv;
        return a.name.localeCompare(b.name);
      });
    case 'close-date':
      return ordered.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    case 'strategic-dependency':
      // Stub: treat dependency order as priority order until dependencies are modeled.
      return ordered.sort((a, b) => {
        if (a.topPriority !== b.topPriority) {
          return a.topPriority ? -1 : 1;
        }
        if (a.portfolioPriority !== b.portfolioPriority) {
          return a.portfolioPriority ? -1 : 1;
        }
        if (a.tcv !== b.tcv) return b.tcv - a.tcv;
        return a.name.localeCompare(b.name);
      });
    case 'manual':
      return ordered;
    case 'priority':
    default:
      return ordered.sort((a, b) => {
        if (a.topPriority !== b.topPriority) {
          return a.topPriority ? -1 : 1;
        }
        if (a.portfolioPriority !== b.portfolioPriority) {
          return a.portfolioPriority ? -1 : 1;
        }
        if (a.tcv !== b.tcv) return b.tcv - a.tcv;
        return a.name.localeCompare(b.name);
      });
  }
}

export const useAppState = create<AppState>((set, get) => ({
  isLoading: false,
  orderingMode: 'priority',
  openOpportunities: [],
  priorityOpportunities: [],
  otherOpportunities: [],
  revenueTarget: 0,
  backlogRevenue: 0,
  truncatedCount: 0,
  selections: {},
  lastAction: null,
  hydrateFromRepository: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const [opportunities, revenueTarget] = await Promise.all([
        repository.getOpportunities(),
        repository.getRevenueTarget(),
      ]);
      const backlogRevenue = opportunities
        .filter(
          (opportunity) => opportunity.closed && opportunity.bapStage === 'closed-won' && isFy26(opportunity.startDate)
        )
        .reduce((sum, opportunity) => sum + opportunity.tcv, 0);
      const openOpportunities = opportunities.filter((opportunity) => !opportunity.closed);
      const ordered = orderOpportunities(openOpportunities, get().orderingMode);
      const priorityOpportunities = ordered.slice(0, MAX_PRIORITY_OPPORTUNITIES);
      const otherOpportunities = ordered.slice(MAX_PRIORITY_OPPORTUNITIES);
      const truncated = otherOpportunities.length;
      set({
        openOpportunities: ordered,
        priorityOpportunities,
        otherOpportunities,
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
  setOrderingMode: (mode) =>
    set((state) => {
      const ordered = orderOpportunities(state.openOpportunities, mode);
      const priorityOpportunities = ordered.slice(0, MAX_PRIORITY_OPPORTUNITIES);
      const otherOpportunities = ordered.slice(MAX_PRIORITY_OPPORTUNITIES);
      return {
        orderingMode: mode,
        priorityOpportunities,
        otherOpportunities,
        truncatedCount: otherOpportunities.length,
      };
    }),
  setSelection: (opportunityId, status) =>
    set((state) => {
      const next = { ...state.selections };
      if (status) {
        next[opportunityId] = status;
      } else {
        delete next[opportunityId];
      }
      return { selections: next, lastAction: { opportunityId, outcome: status } };
    }),
  setSelections: (selections) => set({ selections, lastAction: null }),
  resetSelections: () => set({ selections: {}, lastAction: null }),
}));
