import type { EffectiveProject } from './scenarioCalculator';

export type PathFilters = {
  minPWin: number;
  bapStage?: Set<string>;
  owner?: string;
  priority?: 'any' | 'top' | 'portfolio';
};

export type PathSuggestion = {
  projects: EffectiveProject[];
  total: number;
};

const MAX_PATHS = 6;

function meetsPriority(project: EffectiveProject, priority: PathFilters['priority']) {
  if (!priority || priority === 'any') return true;
  if (priority === 'top') return project.topPriority;
  if (priority === 'portfolio') return project.topPriority || project.portfolioPriority;
  return true;
}

function passesFilters(project: EffectiveProject, filters: PathFilters) {
  const stagePass = !filters.bapStage || filters.bapStage.has(project.bapStage);
  const ownerPass = !filters.owner || filters.owner === project.owner;
  return project.pWin >= filters.minPWin && stagePass && ownerPass && meetsPriority(project, filters.priority);
}

export function filterProjects(projects: EffectiveProject[], filters: PathFilters): EffectiveProject[] {
  return projects.filter((project) => passesFilters(project, filters));
}

export function enumeratePaths(
  projects: EffectiveProject[],
  target: number,
  filters: PathFilters
): PathSuggestion[] {
  const candidates = filterProjects(projects, filters)
    .filter((project) => project.effectiveStatus === 'open')
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const results: PathSuggestion[] = [];

  function backtrack(startIndex: number, current: EffectiveProject[], total: number) {
    if (results.length >= MAX_PATHS) return;
    if (total >= target && current.length) {
      results.push({ projects: [...current], total });
      return;
    }

    for (let i = startIndex; i < candidates.length; i += 1) {
      const next = candidates[i];
      const nextTotal = total + next.tcv;
      if (nextTotal > target * 2) continue; // guard unrealistic overshoot
      current.push(next);
      backtrack(i + 1, current, nextTotal);
      current.pop();
      if (results.length >= MAX_PATHS) return;
    }
  }

  backtrack(0, [], 0);
  return results;
}
