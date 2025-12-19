import type { EffectiveProject } from '../domain/scenarioCalculator';
import { useAppState } from '../state/appState';

type PathTreeProps = {
  projects: EffectiveProject[];
};

export function PathTree({ projects }: PathTreeProps) {
  const { setSelection } = useAppState();

  if (!projects.length) {
    return <p className="empty">Visualization will appear once opportunities are loaded.</p>;
  }

  return (
    <div className="path-tree">
      <p className="eyebrow">Path visualization</p>
      <p className="muted">
        Placeholder visualization: opportunities are sorted by start date and sized by TCV. pWin controls opacity.
      </p>
      <div className="path-tree__grid" role="list">
        {projects.map((project) => {
          const isClosed = project.closed;
          const statusLabel = project.effectiveStatus === 'open' ? 'Open' : project.effectiveStatus === 'won' ? 'Won' : 'Lost';

          return (
            <div
              key={project.id}
              role="listitem"
              className={`path-tree__node path-tree__node--${project.effectiveStatus}`}
              style={{
                opacity: Math.max(project.pWin / 100, 0.25),
                flexBasis: `${Math.min(project.tcv / 1000000, 12)}rem`,
              }}
            >
              <p className="node-title">{project.name}</p>
              <p className="muted">{project.startDate.toLocaleDateString()}</p>
              <p className="badge">{project.pWin}% pWin</p>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
