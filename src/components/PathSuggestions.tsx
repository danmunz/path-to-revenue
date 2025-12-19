import { useMemo } from 'react';
import { useAppState } from '../state/appState';
import { applyScenarioSelection, calculateScenarioSummary } from '../domain/scenarioCalculator';
import { enumeratePaths } from '../domain/pathExplorer';

export function PathSuggestions() {
  const { projects, revenueTarget, selections, filters } = useAppState();

  const { paths, remainingTarget } = useMemo(() => {
    const effectiveProjects = applyScenarioSelection(projects, selections);
    const summary = calculateScenarioSummary(effectiveProjects, revenueTarget);

    const stageFilter =
      filters.bapStage === 'any' ? undefined : new Set([filters.bapStage as string]);

    const paths = enumeratePaths(effectiveProjects, summary.remainingTarget, {
      minPWin: filters.minPWin,
      bapStage: stageFilter,
      owner: filters.owner === 'any' ? undefined : filters.owner,
      priority: filters.priority,
    });

    return { paths, remainingTarget: summary.remainingTarget };
  }, [projects, revenueTarget, selections, filters]);

  if (!projects.length) {
    return <p className="empty">Load data to see recommended paths.</p>;
  }

  return (
    <div className="panel-section">
      <p className="eyebrow">Paths to target</p>
      {remainingTarget === 0 ? (
        <p className="badge badge--success">Target met in current scenario.</p>
      ) : paths.length === 0 ? (
        <p className="muted">No combinations meet the remaining target with the current filters.</p>
      ) : (
        <ol className="path-list">
          {paths.map((path, index) => (
            <li key={path.projects.map((p) => p.id).join('-')} className="path-card">
              <header>
                <span className="badge">Path {index + 1}</span>
                <strong>${path.total.toLocaleString()}</strong>
              </header>
              <ul>
                {path.projects.map((project) => (
                  <li key={project.id}>
                    <strong>{project.name}</strong> — {project.pWin}% pWin, ${project.tcv.toLocaleString()}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
