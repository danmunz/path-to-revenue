import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  tcv?: number;
  outcome: Outcome;
  distance: number;
  index: number;
  total: number;
};

const COLUMN_WIDTH = 80;
const MARGIN = { top: 36, right: 100, bottom: 32, left: 80 };
const MIN_TREE_HEIGHT = 640;
const LABEL_WIDTH = 260;
const LABEL_HEIGHT = 56;
const LABEL_PADDING_X = 12;
const LABEL_Y_OFFSET = 8;
const LABEL_LINE_HEIGHT = 16;
const LABEL_MAX_LINES = 2;
const FLOW_DASH = '14 10';
const FLOW_ANIMATION_DURATION = 7.5;
const BASE_INACTIVE_OPACITY = 0.3;

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

  if (nodes.length) {
    collectLeaves(nodes[0]);
  }

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

  if (nodes.length) {
    assignInternal(nodes[0]);
  }

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

function formatMillions(amount = 0): string {
  const millions = Math.round(amount / 1_000_000);
  return `$${millions}M`;
}

function wrapLabelText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      return;
    }
    if (current) {
      lines.push(current);
      current = word;
      return;
    }
    lines.push(word);
    current = '';
  });

  if (current) {
    lines.push(current);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const trimmed = lines.slice(0, maxLines);
  trimmed[maxLines - 1] = `${trimmed[maxLines - 1].replace(/[.,;:]?$/, '')}...`;
  return trimmed;
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
  const [canvasWidth, setCanvasWidth] = useState<number>(0);

  const sorted = useMemo(() => [...opportunities], [opportunities]);

  const layout = useMemo(() => computeLayout(tree.nodes), [tree.nodes]);
  const maxX = Math.max(...Array.from(layout.values()).map((pos) => pos.x), 0);
  const columnWidth = useMemo(() => {
    if (!canvasWidth) return COLUMN_WIDTH;
    const usable = canvasWidth - MARGIN.left - MARGIN.right;
    if (usable <= 0) return COLUMN_WIDTH;
    return Math.max(COLUMN_WIDTH, usable / Math.max(maxX + 1, 1));
  }, [canvasWidth, maxX]);
  const width = MARGIN.left + MARGIN.right + Math.max(maxX + 1, 1) * columnWidth;
  const maxDepth = Math.max(...tree.nodes.map((node) => node.depth), 0);
  const verticalSpan = Math.max(1, treeHeight - MARGIN.top - MARGIN.bottom);
  const rowHeight = verticalSpan / Math.max(maxDepth, 1);
  const rowOffset = maxDepth === 0 ? verticalSpan / 2 : 0;
  const height = treeHeight;
  const maxTcv = Math.max(...opportunities.map((opportunity) => opportunity.tcv), 1);

  const positionedNodes = useMemo(
    () =>
      tree.nodes.map((node) => {
        const pos = layout.get(node.id) ?? { x: 0, y: 0 };
        return {
          ...node,
          x: MARGIN.left + pos.x * columnWidth,
          y: MARGIN.top + rowOffset + node.depth * rowHeight,
        };
      }),
    [columnWidth, layout, rowHeight, rowOffset, tree.nodes]
  );

  const nodeMap = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    positionedNodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [positionedNodes]);

  const links = useMemo(
    () =>
      positionedNodes.flatMap((node) =>
        node.children.map((child) => ({
          id: `${node.id}->${child.id}`,
          source: node,
          target: nodeMap.get(child.id) ?? child,
          outcome: child.outcome ?? 'win',
          opportunity: child.opportunity,
          probability: child.probability,
        }))
      ),
    [nodeMap, positionedNodes]
  );

  const delaunay = useMemo(() => {
    if (links.length === 0) return null;
    const midpoints = links.map((link) => {
      const midX = (link.source.x + link.target.x) / 2;
      const midY = (link.source.y + link.target.y) / 2;
      return { x: midX, y: midY, id: link.target.id };
    });
    return Delaunay.from(
      midpoints,
      (point) => point.x,
      (point) => point.y
    );
  }, [links]);

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

  const selectedPathIds = useMemo(() => {
    if (!selectedId) return null;
    const ids = new Set<string>();
    let current: TreeNode | undefined = nodeMap.get(selectedId);
    while (current) {
      ids.add(current.id);
      current = current.parentId ? nodeMap.get(current.parentId) : undefined;
    }
    return ids;
  }, [nodeMap, selectedId]);

  const highlightedPathIds = useMemo(() => {
    if (!hoveredPathIds && !selectedPathIds) return null;
    const ids = new Set<string>();
    selectedPathIds?.forEach((id) => ids.add(id));
    hoveredPathIds?.forEach((id) => ids.add(id));
    return ids;
  }, [hoveredPathIds, selectedPathIds]);

  const flowPathIds = useMemo(() => hoveredPathIds ?? selectedPathIds, [hoveredPathIds, selectedPathIds]);

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
        text: `${node.opportunity.name} (${formatMillions(node.opportunity.tcv)})`,
        outcome: node.outcome,
      });
    });
    if (!steps.length) return null;
    const verb = (outcome: Outcome) => (outcome === 'win' ? 'win' : 'lose');
    let sentence = `If we ${verb(steps[0].outcome)} ${steps[0].text}`;
    steps.slice(1).forEach((step) => {
      sentence = `${sentence} and ${verb(step.outcome)} ${step.text}`;
    });
    const last = ordered[ordered.length - 1];
    if (last?.result === 'success') {
      sentence = `${sentence}, we will reach our revenue goal.`;
    }
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

  const selectedPathNodes = useMemo(() => {
    if (!selectedId) return null;
    const ordered: PositionedNode[] = [];
    let current: PositionedNode | undefined = nodeMap.get(selectedId);
    while (current) {
      ordered.push(current);
      current = current.parentId ? nodeMap.get(current.parentId) : undefined;
    }
    ordered.reverse();
    return ordered;
  }, [nodeMap, selectedId]);

  const activePathNodes = hoveredPathNodes ?? selectedPathNodes;

  const hoveredLabels = useMemo(() => {
    if (!activePathNodes) return null;
    const labels: HoverLabel[] = [];

    activePathNodes.forEach((node, index) => {
      if (!node.parentId || !node.opportunity || !node.outcome) return;
      const radius = 8 + Math.min(16, (node.opportunity.tcv / maxTcv) * 16);
      const side = node.x < MARGIN.left + (width - MARGIN.left - MARGIN.right) * 0.6 ? 1 : -1;
      const rawX = side > 0 ? node.x + radius + 12 : node.x - radius - 12 - LABEL_WIDTH;
      const rawY = node.y - LABEL_HEIGHT / 2 - LABEL_Y_OFFSET;
      const clampedX = Math.max(MARGIN.left, Math.min(rawX, width - MARGIN.right - LABEL_WIDTH));
      const clampedY = Math.max(MARGIN.top, Math.min(rawY, height - MARGIN.bottom - LABEL_HEIGHT));
      const distance = hoveredPoint ? Math.hypot(node.x - hoveredPoint.x, node.y - hoveredPoint.y) : 0;

      labels.push({
        id: node.id,
        x: clampedX,
        y: clampedY,
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
        name: node.opportunity.name,
        tcv: node.opportunity.tcv,
        outcome: node.outcome,
        distance,
        index,
        total: activePathNodes.length,
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
  }, [activePathNodes, height, hoveredPoint, maxTcv, width]);

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
      setCanvasWidth(rect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);


  useEffect(() => {
    function updateHeight() {
      const header = document.querySelector<HTMLElement>('.top-bar-group');
      const headerHeight = header?.offsetHeight ?? 0;
      const nextHeight = Math.max(MIN_TREE_HEIGHT, window.innerHeight - headerHeight);
      setTreeHeight(nextHeight);
    }

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const maxProbability = Math.max(...links.map((link) => link.probability), 0.01);
  const minStroke = 6;
  const maxStroke = 18;

  const narrativeTarget =
    typeof document !== 'undefined' ? document.getElementById('narrative-slot') : null;

  function isActivePath(nodeId: string): boolean {
    if (!highlightedPathIds) return false;
    return highlightedPathIds.has(nodeId);
  }

  function clearHoverState() {
    setHoveredId(null);
    setHoveredPoint(null);
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

  const narrative = (
    <div className="path-tree__narrative">
      <p className={`path-tree__sentence ${hoveredSentence ? 'is-active' : ''}`}>
        {hoveredSentence ?? 'Hover over the tree to trace a possible path to the target.'}
      </p>
      {selectedId && (
        <button className="pill pill--compact path-tree__clear" onClick={() => setSelectedId(null)}>
          Clear selection
        </button>
      )}
    </div>
  );

  return (
    <section className={`path-tree ${slowMotion ? 'path-tree--slow' : ''}`}>
      {narrativeTarget ? createPortal(narrative, narrativeTarget) : null}
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
            onPointerLeave={() => {
              clearHoverState();
            }}
            onPointerOut={clearHoverState}
          >
            <title>Paths to revenue target decision tree</title>
            <defs>
              <radialGradient id="node-fill" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#c8d8f0" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#5b6f89" stopOpacity="0.95" />
              </radialGradient>
            </defs>
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
                const opacity = Math.min(0.9, baseOpacity * (0.35 + probabilityScale * 0.65));
                const depthRatio = link.source.depth / Math.max(maxDepth || 1, 1);
                const taper = 1 - depthRatio * 0.5;
                const strokeWidth = (minStroke + probabilityScale * (maxStroke - minStroke)) * taper;
                const path = pathForLink(link.source, link.target);
                const active = isActivePath(link.target.id);
                const isSelected = selectedId && link.target.id.startsWith(selectedId);
                const gradientId = `grad-${link.id}`;
                const color = link.outcome === 'win' ? 'var(--win)' : 'var(--loss)';
                const lightColor = link.outcome === 'win' ? '#8fa9d6' : '#d9a0a0';
                const inactiveOpacity = Math.max(BASE_INACTIVE_OPACITY, opacity * 0.45);
                return (
                  <g key={link.id}>
                    <defs>
                      <linearGradient
                        id={gradientId}
                        gradientUnits="userSpaceOnUse"
                        x1={link.source.x}
                        y1={link.source.y}
                        x2={link.target.x}
                        y2={link.target.y}
                      >
                        <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                        <stop offset="100%" stopColor={lightColor} stopOpacity="0.65" />
                      </linearGradient>
                    </defs>
                    <path
                      d={path}
                      className={`path-tree__link ${
                        link.outcome === 'win' ? 'path-tree__link--win' : 'path-tree__link--loss'
                      } ${active ? '' : 'path-tree__link--inactive'} ${isSelected ? 'path-tree__link--selected' : ''}`}
                      style={{
                        opacity: active ? 0.95 : inactiveOpacity,
                        strokeWidth: active
                          ? strokeWidth + 3
                          : Math.max(3, strokeWidth * 0.7),
                        stroke: active ? color : `url(#${gradientId})`,
                      }}
                    />
                    {active && flowPathIds?.has(link.target.id) && (
                      <path
                        d={path}
                        className="path-tree__link-flow"
                        style={{
                          strokeWidth: Math.max(0.8, strokeWidth * 0.25),
                          stroke: color,
                          opacity: 0.25,
                          strokeDasharray: FLOW_DASH,
                          animationDuration: `${FLOW_ANIMATION_DURATION * 1.5}s`,
                        }}
                      />
                    )}
                    <path
                      d={path}
                      className="path-tree__hit"
                      onPointerEnter={() => {
                        setHoveredId(link.target.id);
                        setHoveredPoint({ x: link.target.x, y: link.target.y });
                      }}
                      onPointerLeave={clearHoverState}
                      onClick={() => setSelectedId(link.target.id)}
                      onDoubleClick={() => handleDoubleClick(link.target)}
                    />
                  </g>
                );
              })}
            </g>
            <g className="path-tree__nodes">
              {positionedNodes
                .filter((node) => node.opportunity)
                .map((node) => {
                  const success =
                    node.result === 'success' && Boolean(hoveredPathIds && hoveredPathIds.has(node.id));
                  const radius = node.opportunity ? 8 + Math.min(16, (node.opportunity.tcv / maxTcv) * 16) : 6;
                  return (
                    <circle
                      key={node.id}
                      cx={node.x}
                      cy={node.y}
                      r={radius}
                      className={`path-tree__leaf ${success ? 'path-tree__leaf--success' : ''}`}
                      style={{
                        opacity: node.opportunity ? 0.35 + node.opportunity.pWin * 0.65 : 0.8,
                      }}
                    />
                  );
                })}
            </g>
            <g className={`path-tree__labels ${labelsVisible ? 'is-visible' : ''}`}>
              {labelSnapshot.map((label) => {
                const millions = formatMillions(label.tcv ?? 0);
                const text = `${label.name} (${millions})`;
                const maxChars = Math.max(14, Math.floor((LABEL_WIDTH - LABEL_PADDING_X * 2) / 7));
                const lines = wrapLabelText(text, maxChars, LABEL_MAX_LINES);
                const startY = label.height / 2 - ((lines.length - 1) * LABEL_LINE_HEIGHT) / 2;
                return (
                  <g key={label.id} transform={`translate(${label.x}, ${label.y})`}>
                    <rect
                      className="path-tree__label-box"
                      width={label.width}
                      height={label.height}
                      rx={12}
                      ry={12}
                    />
                    <text className="path-tree__label-text">
                      {lines.map((line, index) => (
                        <tspan key={`${label.id}-line-${index}`} x={LABEL_PADDING_X} y={startY + index * LABEL_LINE_HEIGHT}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
