import type { Project } from '../data/types';

export type ScenarioSelection = Record<string, 'open' | 'won' | 'lost'>;

export type QuarterlyTotals = {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
};

export type ScenarioSummary = {
  totalWon: number;
  percentOfTarget: number;
  remainingTarget: number;
  quarterlyTotals: QuarterlyTotals;
};

export type EffectiveProject = Project & {
  effectiveStatus: 'won' | 'lost' | 'open';
};

export function deriveEffectiveStatus(
  project: Project,
  selection: ScenarioSelection[string] | undefined
): EffectiveProject['effectiveStatus'] {
  if (project.closed) {
    return project.status === 'won' ? 'won' : 'lost';
  }
  if (selection) return selection;
  return project.status;
}

export function applyScenarioSelection(
  projects: Project[],
  selections: ScenarioSelection
): EffectiveProject[] {
  return projects.map((project) => ({
    ...project,
    effectiveStatus: deriveEffectiveStatus(project, selections[project.id]),
  }));
}

export function calculateScenarioSummary(
  projects: EffectiveProject[],
  revenueTarget: number
): ScenarioSummary {
  const quarterlyTotals: QuarterlyTotals = { q1: 0, q2: 0, q3: 0, q4: 0 };
  let totalWon = 0;

  projects.forEach((project) => {
    if (project.effectiveStatus === 'won') {
      totalWon += project.tcv;
      quarterlyTotals.q1 += project.quarterlyRevenue.q1;
      quarterlyTotals.q2 += project.quarterlyRevenue.q2;
      quarterlyTotals.q3 += project.quarterlyRevenue.q3;
      quarterlyTotals.q4 += project.quarterlyRevenue.q4;
    }
  });

  const remainingTarget = Math.max(revenueTarget - totalWon, 0);
  const percentOfTarget = revenueTarget > 0 ? Math.min((totalWon / revenueTarget) * 100, 200) : 0;

  return { totalWon, percentOfTarget, remainingTarget, quarterlyTotals };
}
