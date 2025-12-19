import { buildPathTreeLayout } from '../domain/pathTreeLayout';
import type { EffectiveProject } from '../domain/scenarioCalculator';

type PathTreeProps = {
  projects: EffectiveProject[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function PathTree({ projects }: PathTreeProps) {
  if (!projects.length) {
    return <p className="empty">Visualization will appear once opportunities are loaded.</p>;
  }

  const layout = buildPathTreeLayout(projects);
  const nodeMap = new Map(layout.nodes.map((node) => [node.id, node]));

  return (
    <div className="path-tree">
      <div>
        <p className="eyebrow">Path visualization</p>
        <p className="muted">
          Each column represents a decision point. Node size scales with opportunity TCV, and opacity reflects pWin.
        </p>
      </div>
      <div className="path-tree__canvas" style={{ height: layout.height, width: layout.width }}>
        <svg className="path-tree__links" viewBox={`0 0 ${layout.width} ${layout.height}`}>
          {layout.links.map((link) => {
            const fromNode = nodeMap.get(link.from);
            const toNode = nodeMap.get(link.to);
            if (!fromNode || !toNode) return null;
            const startX = fromNode.x + fromNode.width;
            const startY = fromNode.y;
            const endX = toNode.x;
            const endY = toNode.y;
            const midX = (startX + endX) / 2;
            const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
            return <path key={`${link.from}-${link.to}`} d={path} className="path-tree__link" />;
          })}
        </svg>
        {layout.nodes.map((node) => {
          const top = node.y - node.height / 2;
          const outcomeClass = node.outcome ? `path-tree__node--${node.outcome}` : '';
          return (
            <div
              key={node.id}
              className={`path-tree__node path-tree__node--${node.type} ${outcomeClass}`}
              style={{
                top,
                left: node.x,
                width: node.width,
                height: node.height,
                opacity: node.type === 'summary' ? 1 : Math.max(node.pWin / 100, 0.25),
              }}
            >
              {node.type === 'root' && (
                <>
                  <p className="node-title">{node.label}</p>
                  <p className="muted">{formatCurrency(node.tcv)} in pipeline</p>
                </>
              )}
              {node.type === 'outcome' && node.project && (
                <>
                  <p className="node-title">{node.project.name}</p>
                  <p className="node-meta">
                    {node.outcome === 'won' ? 'Won' : 'Lost'} · {formatCurrency(node.project.tcv)}
                  </p>
                  <p className="badge">{node.project.pWin}% pWin</p>
                </>
              )}
              {node.type === 'summary' && (
                <>
                  <p className="node-title">{node.label}</p>
                  <p className="node-meta">
                    {formatCurrency(node.totalWon ?? 0)} won · {formatCurrency(node.totalLost ?? 0)} lost
                  </p>
                  <p className="badge">{node.winCount ?? 0} wins</p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
