import type { EffectiveProject } from '../domain/scenarioCalculator';

type PathTreeProps = {
  projects: EffectiveProject[];
};

export function PathTree({ projects }: PathTreeProps) {
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
        {projects.map((project) => (
          <div
            key={project.id}
            role="listitem"
            className="path-tree__node"
            style={{
              opacity: Math.max(project.pWin / 100, 0.25),
              flexBasis: `${Math.min(project.tcv / 1000000, 12)}rem`,
              backgroundColor:
                project.effectiveStatus === 'lost'
                  ? '#fef2f2'
                  : project.effectiveStatus === 'won'
                    ? '#ecfeff'
                    : '#e0ecff',
            }}
          >
            <p className="node-title">{project.name}</p>
            <p className="muted">{project.startDate.toLocaleDateString()}</p>
            <p className="badge">{project.pWin}% pWin</p>
          </div>
        ))}
      </div>
    </div>
  );
}
