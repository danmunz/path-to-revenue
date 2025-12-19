import { useMemo } from 'react';
import type { Project } from '../data/types';
import { useAppState } from '../state/appState';
import { applyScenarioSelection } from '../domain/scenarioCalculator';

type OpportunityListProps = {
  projects: Project[];
};

export function OpportunityList({ projects }: OpportunityListProps) {
  const { selections, setSelection } = useAppState();
  const effectiveProjects = useMemo(() => applyScenarioSelection(projects, selections), [projects, selections]);

  if (!projects.length) {
    return <p className="empty">No opportunities loaded yet.</p>;
  }

  return (
    <div className="list">
      <div className="list-header" role="row">
        <span className="list-cell list-cell--wide" role="columnheader">
          Opportunity
        </span>
        <span className="list-cell" role="columnheader">
          TCV
        </span>
        <span className="list-cell" role="columnheader">
          P(win)
        </span>
        <span className="list-cell" role="columnheader">
          Status
        </span>
      </div>
      <ul>
        {effectiveProjects.map((project) => {
          const isClosed = project.closed;
          const statusLabel = project.effectiveStatus === 'open' ? 'Open' : project.effectiveStatus === 'won' ? 'Won' : 'Lost';
          return (
            <li key={project.id} className="list-row" role="row">
              <span className="list-cell list-cell--wide" role="cell">
                <strong>{project.name}</strong>
                <small className="muted">{project.account}</small>
              </span>
              <span className="list-cell" role="cell">${project.tcv.toLocaleString()}</span>
              <span className="list-cell" role="cell">{project.pWin}%</span>
              <span className="list-cell" role="cell">
                <div className="status-toggle" aria-label={`Status for ${project.name}`}>
                  <button
                    type="button"
                    className={project.effectiveStatus === 'won' ? 'pill pill--active' : 'pill'}
                    onClick={() => setSelection(project.id, 'won')}
                    disabled={isClosed}
                  >
                    Won
                  </button>
                  <button
                    type="button"
                    className={project.effectiveStatus === 'open' ? 'pill pill--active' : 'pill'}
                    onClick={() => setSelection(project.id, 'open')}
                    disabled={isClosed}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className={project.effectiveStatus === 'lost' ? 'pill pill--active' : 'pill'}
                    onClick={() => setSelection(project.id, 'lost')}
                    disabled={isClosed}
                  >
                    Lost
                  </button>
                </div>
                {isClosed && <small className="muted">Closed: {statusLabel}</small>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
