import { useMemo, useState } from 'react';
import type { Opportunity } from '../data/types';
import type { DecisionTree, Outcome, PathCounts, TreeNode } from '../domain/decisionTree';
import { formatCurrency, getClosedOutcome } from '../domain/decisionTree';
import { useAppState } from '../state/appState';

type PathTreeProps = {
  opportunities: Opportunity[];
  tree: DecisionTree;
  revenueTarget: number;
  slowMotion: boolean;
  truncatedCount: number;
  counts: PathCounts;
};

type PositionedNode = TreeNode & {
  x: number;
  y: number;
};

const ROW_HEIGHT = 72;
const COLUMN_WIDTH = 120;
const MARGIN = { top: 24, right: 120, bottom: 32, left: 220 };
const MAX_TREE_HEIGHT = 520;

function computeLayout(nodes: TreeNode[]): Map<string, { x: number; y: number }> {
  const leaves: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();
  nodes.forEach((node) => nodeMap.set(node.id, node));

  function collectLeaves(node: TreeNode) {
    if (!node.children.length) {
      leaves.push(node);
      return;
    }
    node.children.forEach(collectLeaves);
  }

  collectLeaves(nodes[0]);

  const positions = new Map<string, { x: number; y: number }>();
  leaves.forEach((leaf, index) => {
    positions.set(leaf.id, { x: index, y: leaf.depth });
  });

  function assignInternal(node: TreeNode) {
    if (!node.children.length) return;
    node.children.forEach(assignInternal);
    const childPositions = node.children
      .map((child) => positions.get(child.id))
      .filter((value): value is { x: number; y: number } => Boolean(value));
    const avgX =
      childPositions.reduce((sum, pos) => sum + pos.x, 0) / Math.max(childPositions.length, 1);
    positions.set(node.id, { x: avgX, y: node.depth });
  }

  assignInternal(nodes[0]);

  return positions;
}

function pathForLink(source: PositionedNode, target: PositionedNode): string {
  const x0 = source.x;
  const y0 = source.y;
  const x1 = target.x;
  const y1 = target.y;
  const dx = (x1 - x0) * 0.5;
  return `M ${x0} ${y0} C ${x0 + dx} ${y0}, ${x1 - dx} ${y1}, ${x1} ${y1}`;
}

function deriveOpacity(opportunity: Opportunity, outcome: Outcome): number {
  const base = outcome === 'win' ? opportunity.pWin : 1 - opportunity.pWin;
  return Math.max(0.2, Math.min(base, 0.9));
}

export function PathTree({ opportunities, tree, revenueTarget, slowMotion, truncatedCount, counts }: PathTreeProps) {
  const { setSelection, selections } = useAppState();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sorted = useMemo(() => [...opportunities], [opportunities]);

  const layout = useMemo(() => computeLayout(tree.nodes), [tree.nodes]);
  const maxX = Math.max(...Array.from(layout.values()).map((pos) => pos.x), 0);
  const width = MARGIN.left + MARGIN.right + Math.max(maxX, 1) * COLUMN_WIDTH;
  const rowHeight = Math.max(
    18,
    Math.min(ROW_HEIGHT, (MAX_TREE_HEIGHT - MARGIN.top - MARGIN.bottom) / Math.max(sorted.length, 1))
  );
  const height = MARGIN.top + MARGIN.bottom + Math.max(sorted.length, 1) * rowHeight;

  const positionedNodes = useMemo(
    () =>
      tree.nodes.map((node) => {
        const pos = layout.get(node.id) ?? { x: 0, y: 0 };
        return {
          ...node,
          x: MARGIN.left + pos.x * COLUMN_WIDTH,
          y: MARGIN.top + pos.y * rowHeight,
        };
      }),
    [layout, rowHeight, tree.nodes]
  );

  const nodeMap = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    positionedNodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [positionedNodes]);

  const links = positionedNodes.flatMap((node) =>
    node.children.map((child) => ({
      id: `${node.id}->${child.id}`,
      source: node,
      target: nodeMap.get(child.id) ?? child,
      outcome: child.outcome ?? 'win',
      opportunity: child.opportunity,
      probability: child.probability,
    }))
  );

  const maxProbability = Math.max(...links.map((link) => link.probability), 0.01);

  function isActivePath(nodeId: string): boolean {
    if (!hoveredId) return true;
    return hoveredId.startsWith(nodeId);
  }

  function handleDoubleClick(node: TreeNode) {
    const firstUnresolved = sorted.find((opportunity) => {
      if (getClosedOutcome(opportunity)) return false;
      if (selections[opportunity.id]) return false;
      return node.resolved[opportunity.id];
    });

    if (firstUnresolved) {
      setSelection(firstUnresolved.id, node.resolved[firstUnresolved.id]);
    }
  }

  if (!opportunities.length) {
    return (
      <section className="path-tree">
        <p className="empty">Visualization will appear once opportunities are loaded.</p>
      </section>
    );
  }

  function labelFor(opportunity: Opportunity): string {
    const selection = selections[opportunity.id];
    if (selection === 'win') return `If ${opportunity.name} is won…`;
    if (selection === 'loss') return `If ${opportunity.name} is lost…`;
    return `If ${opportunity.name} is won/lost…`;
  }

  return (
    <section className={`path-tree ${slowMotion ? 'path-tree--slow' : ''}`}>
      <div className="path-tree__header">
        <div>
          <p className="eyebrow">Main visualization</p>
          <h2>Paths to target</h2>
          <p className="muted">
            There are {counts.success.toLocaleString()} ways to hit {formatCurrency(revenueTarget)}.
          </p>
          <p className="muted">Each row is a decision point; blue ribbons win, red ribbons lose.</p>
          {truncatedCount > 0 && (
            <p className="muted">Showing the top {opportunities.length} open opportunities ({truncatedCount} hidden).</p>
          )}
        </div>
        <div className="path-tree__meta">
          <p className="muted">Target</p>
          <p className="path-tree__target">{formatCurrency(revenueTarget)}</p>
        </div>
      </div>
      <div className="path-tree__layout">
        <div className="path-tree__labels">
          {sorted.map((opportunity) => {
            const isActive = hoveredId ? Boolean(nodeMap.get(hoveredId)?.resolved[opportunity.id]) : false;
            return (
              <div
                key={opportunity.id}
                className={`row-label ${isActive ? 'row-label--active' : ''}`}
                style={{ height: rowHeight }}
              >
                <p className="row-label__text">{labelFor(opportunity)}</p>
                <p className="muted">{opportunity.account}</p>
              </div>
            );
          })}
        </div>
        <div className="path-tree__canvas">
          <svg className="path-tree__svg" width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img">
            <title>Paths to revenue target decision tree</title>
            <g className="path-tree__gridlines">
              {sorted.map((opportunity, index) => (
                <line
                  key={opportunity.id}
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={MARGIN.top + index * rowHeight}
                  y2={MARGIN.top + index * rowHeight}
                />
              ))}
            </g>
            <g className="path-tree__links">
              {links.map((link) => {
                const opacity = link.opportunity ? deriveOpacity(link.opportunity, link.outcome) : 0.4;
                const strokeWidth = 1.5 + (link.probability / maxProbability) * 6;
                const path = pathForLink(link.source, link.target);
                const active = isActivePath(link.target.id);
                const isSelected = selectedId && link.target.id.startsWith(selectedId);
                return (
                  <g key={link.id}>
                    <path
                      d={path}
                      className={`path-tree__link ${
                        link.outcome === 'win' ? 'path-tree__link--win' : 'path-tree__link--loss'
                      } ${active ? '' : 'path-tree__link--inactive'} ${isSelected ? 'path-tree__link--selected' : ''}`}
                      style={{ opacity, strokeWidth }}
                    />
                    <path
                      d={path}
                      className="path-tree__hit"
                      onMouseEnter={() => setHoveredId(link.target.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => setSelectedId(link.target.id)}
                      onDoubleClick={() => handleDoubleClick(link.target)}
                    />
                  </g>
                );
              })}
            </g>
            <g className="path-tree__nodes">
              {positionedNodes
                .filter((node) => node.isTerminal)
                .map((node) => (
                  <circle
                    key={node.id}
                    cx={node.x}
                    cy={node.y}
                    r={4}
                    className={`path-tree__leaf ${node.result === 'success' ? 'path-tree__leaf--success' : ''}`}
                  />
                ))}
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
