import { useEffect, useMemo, useRef, useState } from 'react';
import type { Opportunity } from '../data/types';
import type { DecisionTree, Outcome, PathCounts, TreeNode } from '../domain/decisionTree';
import { formatCurrency, getClosedOutcome } from '../domain/decisionTree';
import { useAppState } from '../state/appState';
import { Delaunay } from '../vendor/d3-delaunay';

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

type HoverLabel = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  outcome: Outcome;
  distance: number;
};

const COLUMN_WIDTH = 80;
const MARGIN = { top: 36, right: 100, bottom: 32, left: 80 };
const MIN_TREE_HEIGHT = 360;
const LABEL_WIDTH = 240;
const LABEL_HEIGHT = 52;
const LABEL_OFFSET = 18;

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
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number } | null>(null);
  const [labelSnapshot, setLabelSnapshot] = useState<HoverLabel[]>([]);
  const [labelsVisible, setLabelsVisible] = useState(false);
  const [treeHeight, setTreeHeight] = useState<number>(MIN_TREE_HEIGHT);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const sorted = useMemo(() => [...opportunities], [opportunities]);

  const layout = useMemo(() => computeLayout(tree.nodes), [tree.nodes]);
  const maxX = Math.max(...Array.from(layout.values()).map((pos) => pos.x), 0);
  const width = MARGIN.left + MARGIN.right + Math.max(maxX + 1, 1) * COLUMN_WIDTH;
  const maxDepth = Math.max(...tree.nodes.map((node) => node.depth), 0);
  const verticalSpan = Math.max(1, treeHeight - MARGIN.top - MARGIN.bottom);
  const rowHeight = verticalSpan / Math.max(maxDepth, 1);
  const rowOffset = maxDepth === 0 ? verticalSpan / 2 : 0;
  const height = treeHeight;

  const positionedNodes = useMemo(
    () =>
      tree.nodes.map((node) => {
        const pos = layout.get(node.id) ?? { x: 0, y: 0 };
        return {
          ...node,
          x: MARGIN.left + pos.x * COLUMN_WIDTH,
          y: MARGIN.top + rowOffset + node.depth * rowHeight,
        };
      }),
    [layout, rowHeight, rowOffset, tree.nodes]
  );

  const nodeMap = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    positionedNodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [positionedNodes]);

  const decisionNodes = useMemo(
    () => positionedNodes.filter((node) => node.children.length > 0),
    [positionedNodes]
  );

  const delaunay = useMemo(() => {
    if (decisionNodes.length === 0) return null;
    return Delaunay.from(
      decisionNodes,
      (node) => node.x,
      (node) => node.y
    );
  }, [decisionNodes]);

  const bestLeafMap = useMemo(() => {
    const map = new Map<string, { id: string; probability: number }>();

    function findBestLeaf(node: TreeNode): { id: string; probability: number } {
      const cached = map.get(node.id);
      if (cached) return cached;
      if (!node.children.length) {
        const result = { id: node.id, probability: node.probability };
        map.set(node.id, result);
        return result;
      }
      const best = node.children
        .map((child) => findBestLeaf(child))
        .reduce((currentBest, candidate) =>
          candidate.probability > currentBest.probability ? candidate : currentBest
        );
      map.set(node.id, best);
      return best;
    }

    if (tree.root) {
      findBestLeaf(tree.root);
    }
    return map;
  }, [tree.root]);

  const hoveredLeafId = useMemo(() => {
    if (!hoveredId) return null;
    return bestLeafMap.get(hoveredId)?.id ?? null;
  }, [bestLeafMap, hoveredId]);

  const hoveredPathIds = useMemo(() => {
    if (!hoveredLeafId) return null;
    const ids = new Set<string>();
    let current: TreeNode | undefined = nodeMap.get(hoveredLeafId);
    while (current) {
      ids.add(current.id);
      current = current.parentId ? nodeMap.get(current.parentId) : undefined;
    }
    return ids;
  }, [hoveredLeafId, nodeMap]);

  const hoveredSentence = useMemo(() => {
    if (!hoveredLeafId) return null;
    const steps: { text: string; outcome: Outcome }[] = [];
    let current: TreeNode | undefined = nodeMap.get(hoveredLeafId);
    const ordered: TreeNode[] = [];
    while (current) {
      ordered.push(current);
      current = current.parentId ? nodeMap.get(current.parentId) : undefined;
    }
    ordered.reverse();
    ordered.forEach((node) => {
      if (!node.opportunity || !node.outcome) return;
      steps.push({
        text: `${node.opportunity.name} is ${node.outcome === 'win' ? 'won' : 'lost'}`,
        outcome: node.outcome,
      });
    });
    if (!steps.length) return null;
    if (steps.length === 1) {
      return `If ${steps[0].text}`;
    }
    let sentence = `If ${steps[0].text}`;
    let usedContrast = false;
    steps.slice(1).forEach((step, index, remaining) => {
      const isFinal = index === remaining.length - 1;
      const useContrast = step.outcome === 'loss' && !usedContrast;
      const connector = useContrast ? 'but' : 'and';
      const separator = isFinal ? '' : ',';
      sentence = `${sentence}${separator} ${connector} ${step.text}`;
      if (useContrast) {
        usedContrast = true;
      }
    });
    return sentence;
  }, [hoveredLeafId, nodeMap]);

  const hoveredPathNodes = useMemo(() => {
    if (!hoveredLeafId) return null;
    const ordered: PositionedNode[] = [];
    let current: PositionedNode | undefined = nodeMap.get(hoveredLeafId);
    while (current) {
      ordered.push(current);
      current = current.parentId ? nodeMap.get(current.parentId) : undefined;
    }
    ordered.reverse();
    return ordered;
  }, [hoveredLeafId, nodeMap]);

  const hoveredLabels = useMemo(() => {
    if (!hoveredPathNodes) return null;
    const labels: HoverLabel[] = [];

    hoveredPathNodes.forEach((node) => {
      if (!node.parentId || !node.opportunity || !node.outcome) return;
      const parent = nodeMap.get(node.parentId);
      if (!parent) return;
      const midX = (parent.x + node.x) / 2;
      const midY = (parent.y + node.y) / 2;
      const dx = node.x - parent.x;
      const dy = node.y - parent.y;
      const len = Math.hypot(dx, dy) || 1;
      const normalX = -dy / len;
      const normalY = dx / len;
      const offsetX = normalX * LABEL_OFFSET;
      const offsetY = normalY * LABEL_OFFSET;
      const x = midX + offsetX + (normalX < 0 ? -LABEL_WIDTH : 0);
      const y = midY + offsetY - LABEL_HEIGHT / 2;
      const distance = hoveredPoint ? Math.hypot(midX - hoveredPoint.x, midY - hoveredPoint.y) : 0;

      labels.push({
        id: node.id,
        x,
        y,
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
        name: node.opportunity.name,
        outcome: node.outcome,
        distance,
      });
    });

    labels.sort((a, b) => a.distance - b.distance);

    const accepted: HoverLabel[] = [];
    labels.forEach((label) => {
      const overlaps = accepted.some((other) => {
        const withinX = label.x < other.x + other.width && label.x + label.width > other.x;
        const withinY = label.y < other.y + other.height && label.y + label.height > other.y;
        return withinX && withinY;
      });
      if (!overlaps) {
        accepted.push(label);
      }
    });

    return accepted;
  }, [hoveredPathNodes, hoveredPoint, nodeMap]);

  useEffect(() => {
    if (hoveredLabels && hoveredLabels.length > 0) {
      setLabelSnapshot(hoveredLabels);
      setLabelsVisible(true);
      return undefined;
    }
    setLabelsVisible(false);
    setLabelSnapshot([]);
    return undefined;
  }, [hoveredLabels]);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const element = canvasRef.current;
    const observer = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function updateHeight() {
      const header = document.querySelector<HTMLElement>('.top-bar');
      const headerHeight = header?.offsetHeight ?? 0;
      const nextHeight = Math.max(MIN_TREE_HEIGHT, window.innerHeight - headerHeight);
      setTreeHeight(nextHeight);
    }

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

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
  const minStroke = 1.5;
  const maxStroke = 6;

  function isActivePath(nodeId: string): boolean {
    if (!hoveredPathIds) return true;
    return hoveredPathIds.has(nodeId);
  }

  function clearHoverState() {
    setHoveredId(null);
    setHoveredPoint(null);
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current || !delaunay || decisionNodes.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const y = ((event.clientY - rect.top) / rect.height) * height;
    if (
      x < MARGIN.left ||
      x > width - MARGIN.right ||
      y < MARGIN.top ||
      y > height - MARGIN.bottom
    ) {
      clearHoverState();
      return;
    }
    const index = delaunay.find(x, y);
    const node = decisionNodes[index];
    setHoveredId(node?.id ?? null);
    setHoveredPoint({ x, y });
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

  return (
    <section className={`path-tree ${slowMotion ? 'path-tree--slow' : ''}`}>
      <div className="path-tree__header">
        <div>
          <p className="eyebrow">Main visualization</p>
          <h2>Paths to target</h2>
          <p className="muted">
            There are {counts.success.toLocaleString()} ways to hit {formatCurrency(revenueTarget)}.
          </p>
          <p className="muted">Showing the top 20 winning paths by probability so you can scan quickly.</p>
          <p className="muted">Each ribbon is a win path that could still reach the target.</p>
          {truncatedCount > 0 && (
            <p className="muted">Showing the top {opportunities.length} open opportunities ({truncatedCount} hidden).</p>
          )}
        </div>
        <div className="path-tree__meta">
          <p className="muted">Target</p>
          <p className="path-tree__target">{formatCurrency(revenueTarget)}</p>
        </div>
      </div>
      <div className="path-tree__narrative">
        <p className={`path-tree__sentence ${hoveredSentence ? 'is-active' : ''}`}>
          {hoveredSentence ?? 'Hover over the tree to trace a possible path to the target.'}
        </p>
      </div>
      <div className="path-tree__layout">
        <div className="path-tree__canvas" style={{ height }} ref={canvasRef}>
          <svg
            ref={svgRef}
            className="path-tree__svg"
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMinYMin meet"
            role="img"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => {
              clearHoverState();
            }}
            onPointerOut={clearHoverState}
          >
            <title>Paths to revenue target decision tree</title>
            <rect
              className="path-tree__voronoi"
              x={MARGIN.left}
              y={MARGIN.top}
              width={width - MARGIN.left - MARGIN.right}
              height={height - MARGIN.top - MARGIN.bottom}
            />
            <g className="path-tree__gridlines">
              {Array.from({ length: Math.max(2, maxDepth + 1) }).map((_, index) => (
                <line
                  key={`gridline-${index}`}
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={MARGIN.top + rowOffset + index * rowHeight}
                  y2={MARGIN.top + rowOffset + index * rowHeight}
                />
              ))}
            </g>
            <g className="path-tree__links">
              {links.map((link) => {
                const probabilityRatio = Math.max(0, link.probability / maxProbability);
                const probabilityScale = Math.sqrt(probabilityRatio);
                const baseOpacity = link.opportunity ? deriveOpacity(link.opportunity, link.outcome) : 0.4;
                const opacity = Math.min(0.95, baseOpacity * (0.35 + probabilityScale * 0.65));
                const strokeWidth = minStroke + probabilityScale * (maxStroke - minStroke);
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
                      style={{
                        opacity: active ? opacity : 0.08,
                        strokeWidth: active ? strokeWidth + (hoveredPathIds ? 1.5 : 0) : strokeWidth * 0.6,
                      }}
                    />
                    <path
                      d={path}
                      className="path-tree__hit"
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
              {decisionNodes
                .filter((node) => hoveredPathIds?.has(node.id))
                .map((node) => (
                  <circle key={node.id} cx={node.x} cy={node.y} r={5} className="path-tree__node-highlight" />
                ))}
            </g>
          </svg>
          <div className={`path-tree__labels ${labelsVisible ? 'is-visible' : ''}`}>
            {labelSnapshot.map((label) => {
              const scaleX = canvasSize.width ? canvasSize.width / width : 1;
              const scaleY = canvasSize.height ? canvasSize.height / height : 1;
              const left = label.x * scaleX;
              const top = label.y * scaleY;
              return (
                <div
                  key={label.id}
                  className="path-tree__label"
                  style={{
                    left,
                    top,
                    width: label.width * scaleX,
                    height: label.height * scaleY,
                  }}
                >
                  <span className="path-tree__label-name">{label.name}</span>
                  <span className={`path-tree__label-outcome path-tree__label-outcome--${label.outcome}`}>
                    {label.outcome === 'win' ? 'Won' : 'Lost'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
