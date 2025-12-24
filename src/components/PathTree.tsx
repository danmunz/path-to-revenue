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
  nodeX: number;
  nodeY: number;
  nodeRadius: number;
  rawX: number;
  rawY: number;
  side: number;
  step: number;
  depth: number;
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
const LABEL_STACK_GAP = 8;
const LABEL_SAFE_MARGIN = 16;
const MAX_LABEL_OFFSET = 150;
const LABEL_PATH_CLEARANCE = 8;
const LABEL_PATH_STEP = 6;
const LABEL_STEP_RADIUS = 9;
const LABEL_STEP_GAP = 8;
const LABEL_TEXT_X = LABEL_PADDING_X + LABEL_STEP_RADIUS * 2 + LABEL_STEP_GAP;
const FLOW_DASH = '14 10';
const FLOW_ANIMATION_DURATION = 7.5;
const BASE_INACTIVE_OPACITY = 0.3;
const PATH_SAMPLE_STEP = 24;

type PathSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function cubicBezierPoint(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
): { x: number; y: number } {
  const t1 = 1 - t;
  const t1Squared = t1 * t1;
  const tSquared = t * t;
  const x =
    p0.x * t1Squared * t1 +
    3 * p1.x * t1Squared * t +
    3 * p2.x * t1 * tSquared +
    p3.x * tSquared * t;
  const y =
    p0.y * t1Squared * t1 +
    3 * p1.y * t1Squared * t +
    3 * p2.y * t1 * tSquared +
    p3.y * tSquared * t;
  return { x, y };
}

function buildLinkSegments(source: { x: number; y: number }, target: { x: number; y: number }): PathSegment[] {
  const dx = (target.x - source.x) * 0.5;
  const p0 = { x: source.x, y: source.y };
  const p1 = { x: source.x + dx, y: source.y };
  const p2 = { x: target.x - dx, y: target.y };
  const p3 = { x: target.x, y: target.y };
  const distance = Math.hypot(target.x - source.x, target.y - source.y);
  const steps = Math.max(8, Math.ceil(distance / PATH_SAMPLE_STEP));
  const segments: PathSegment[] = [];
  let prev = cubicBezierPoint(0, p0, p1, p2, p3);
  for (let i = 1; i <= steps; i += 1) {
    const next = cubicBezierPoint(i / steps, p0, p1, p2, p3);
    segments.push({ x1: prev.x, y1: prev.y, x2: next.x, y2: next.y });
    prev = next;
  }
  return segments;
}

function pointInRect(point: { x: number; y: number }, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function onSegment(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): boolean {
  const epsilon = 1e-6;
  return (
    Math.min(a.x, b.x) - epsilon <= c.x &&
    c.x <= Math.max(a.x, b.x) + epsilon &&
    Math.min(a.y, b.y) - epsilon <= c.y &&
    c.y <= Math.max(a.y, b.y) + epsilon
  );
}

function orientation(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) < 1e-6) return 0;
  return value > 0 ? 1 : 2;
}

function segmentsIntersect(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a, b, c)) return true;
  if (o2 === 0 && onSegment(a, b, d)) return true;
  if (o3 === 0 && onSegment(c, d, a)) return true;
  if (o4 === 0 && onSegment(c, d, b)) return true;
  return false;
}

function segmentIntersectsRect(segment: PathSegment, rect: Rect): boolean {
  const p1 = { x: segment.x1, y: segment.y1 };
  const p2 = { x: segment.x2, y: segment.y2 };
  if (pointInRect(p1, rect) || pointInRect(p2, rect)) return true;

  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;
  const topLeft = { x: left, y: top };
  const topRight = { x: right, y: top };
  const bottomLeft = { x: left, y: bottom };
  const bottomRight = { x: right, y: bottom };

  return (
    segmentsIntersect(p1, p2, topLeft, topRight) ||
    segmentsIntersect(p1, p2, topRight, bottomRight) ||
    segmentsIntersect(p1, p2, bottomRight, bottomLeft) ||
    segmentsIntersect(p1, p2, bottomLeft, topLeft)
  );
}

function rectIntersectsSegments(rect: Rect, segments: PathSegment[]): boolean {
  return segments.some((segment) => segmentIntersectsRect(segment, rect));
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

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

  const splitLongWord = (word: string): string[] => {
    if (word.length <= maxChars) return [word];
    const chunkSize = Math.max(1, maxChars - 1);
    const chunks: string[] = [];
    let remaining = word;
    while (remaining.length > chunkSize) {
      chunks.push(`${remaining.slice(0, chunkSize)}-`);
      remaining = remaining.slice(chunkSize);
    }
    if (remaining) {
      chunks.push(remaining);
    }
    return chunks;
  };

  words.forEach((word) => {
    const parts = splitLongWord(word);
    parts.forEach((part) => {
      const next = current ? `${current} ${part}` : part;
      if (next.length <= maxChars) {
        current = next;
        return;
      }
      if (current) {
        lines.push(current);
        current = part;
        return;
      }
      lines.push(part);
      current = '';
    });
  });

  if (current) {
    lines.push(current);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const trimmed = lines.slice(0, maxLines);
  const tail = trimmed[maxLines - 1].replace(/[.,;:]?$/, '');
  const headroom = Math.max(0, maxChars - 3);
  trimmed[maxLines - 1] = `${tail.slice(0, headroom)}...`;
  return trimmed;
}

export function PathTree({ opportunities, tree, revenueTarget, slowMotion, truncatedCount, counts }: PathTreeProps) {
  const { setSelection, selections } = useAppState();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [labelSnapshot, setLabelSnapshot] = useState<HoverLabel[]>([]);
  const [labelsVisible, setLabelsVisible] = useState(false);
  const [hoveredLabelId, setHoveredLabelId] = useState<string | null>(null);
  const [traceKey, setTraceKey] = useState(0);
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
  const activePathSegments = useMemo(() => {
    if (!flowPathIds) return [];
    return links
      .filter((link) => flowPathIds.has(link.target.id))
      .flatMap((link) => buildLinkSegments(link.source, link.target));
  }, [flowPathIds, links]);

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
    let stepIndex = 0;

    activePathNodes.forEach((node) => {
      if (!node.parentId || !node.opportunity || !node.outcome) return;
      stepIndex += 1;
      const radius = 8 + Math.min(16, (node.opportunity.tcv / maxTcv) * 16);
      const side = node.x < MARGIN.left + (width - MARGIN.left - MARGIN.right) * 0.6 ? 1 : -1;
      const rawX = side > 0 ? node.x + radius + 12 : node.x - radius - 12 - LABEL_WIDTH;
      const rawY = node.y - LABEL_HEIGHT / 2 - LABEL_Y_OFFSET;

      labels.push({
        id: node.id,
        x: rawX,
        y: rawY,
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
        name: node.opportunity.name,
        tcv: node.opportunity.tcv,
        outcome: node.outcome,
        nodeX: node.x,
        nodeY: node.y,
        nodeRadius: radius,
        rawX,
        rawY,
        side,
        step: stepIndex,
        depth: node.depth,
      });
    });

    if (!labels.length) return labels;

    const minX = MARGIN.left + LABEL_SAFE_MARGIN;
    const maxX = Math.max(minX, width - MARGIN.right - LABEL_WIDTH - LABEL_SAFE_MARGIN);
    const clampValue = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
    const clampX = (value: number) => clampValue(value, minX, maxX);
    const median = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    };

    const rectIntersectsPath = (rect: Rect) =>
      rectIntersectsSegments(rect, activePathSegments);
    const resolveRawX = (label: HoverLabel, side: number) =>
      side > 0
        ? label.nodeX + label.nodeRadius + 12
        : label.nodeX - label.nodeRadius - 12 - LABEL_WIDTH;

    function stackColumn(columnLabels: HoverLabel[], columnX: number, minY: number, maxBottom: number) {
      if (!columnLabels.length) return;
      const sorted = [...columnLabels].sort((a, b) => a.depth - b.depth);
      let cursor = minY;
      const maxY = maxBottom - LABEL_HEIGHT;
      const failed: HoverLabel[] = [];

      sorted.forEach((label) => {
        const minAllowed =
          label.side > 0 ? label.rawX : label.nodeX - LABEL_WIDTH - MAX_LABEL_OFFSET;
        const maxAllowed =
          label.side > 0 ? label.nodeX + MAX_LABEL_OFFSET : label.rawX;
        let nextX = clampValue(columnX, minAllowed, maxAllowed);
        const safeX = clampX(nextX);
        if (safeX >= minAllowed && safeX <= maxAllowed) {
          nextX = safeX;
        }
        label.x = nextX;
        const baseY = clampValue(label.rawY, minY, maxY);
        let candidateY = Math.max(baseY, cursor);
        while (candidateY <= maxY) {
          const rect: Rect = {
            x: label.x - LABEL_PATH_CLEARANCE,
            y: candidateY - LABEL_PATH_CLEARANCE,
            width: label.width + LABEL_PATH_CLEARANCE * 2,
            height: label.height + LABEL_PATH_CLEARANCE * 2,
          };
          if (!rectIntersectsPath(rect)) {
            break;
          }
          candidateY += LABEL_PATH_STEP;
        }

        if (candidateY > maxY) {
          failed.push(label);
          label.y = baseY;
          return;
        }

        label.y = candidateY;
        cursor = label.y + LABEL_HEIGHT + LABEL_STACK_GAP;
      });

      return failed;
    }

    function resolveOverlaps(columnLabels: HoverLabel[], minY: number, maxBottom: number) {
      if (!columnLabels.length) return [];
      const maxY = maxBottom - LABEL_HEIGHT;
      const placed: HoverLabel[] = [];
      const failed: HoverLabel[] = [];
      const padding = LABEL_STACK_GAP;

      const sorted = [...columnLabels].sort((a, b) => a.depth - b.depth);
      sorted.forEach((label) => {
        let candidateY = clampValue(label.y, minY, maxY);
        while (candidateY <= maxY) {
          const rect: Rect = {
            x: label.x - LABEL_PATH_CLEARANCE,
            y: candidateY - LABEL_PATH_CLEARANCE,
            width: label.width + LABEL_PATH_CLEARANCE * 2,
            height: label.height + LABEL_PATH_CLEARANCE * 2,
          };
          const overlapLabel = placed.some((other) =>
            rectsOverlap(
              rect,
              {
                x: other.x - padding,
                y: other.y - padding,
                width: other.width + padding * 2,
                height: other.height + padding * 2,
              }
            )
          );
          if (!overlapLabel && !rectIntersectsPath(rect)) {
            break;
          }
          candidateY += LABEL_PATH_STEP;
        }
        if (candidateY > maxY) {
          failed.push(label);
          return;
        }
        label.y = candidateY;
        placed.push(label);
      });
      return failed;
    }

    const tryPlace = (useSafeMargin: boolean) => {
      const safeMargin = useSafeMargin ? LABEL_SAFE_MARGIN : 0;
      const minY = MARGIN.top + safeMargin;
      const maxBottom = height - MARGIN.bottom - safeMargin;

      const rightSide = labels.filter((label) => label.side > 0);
      const leftSide = labels.filter((label) => label.side < 0);
      const rightColumnX = clampX(rightSide.length ? median(rightSide.map((label) => label.rawX)) : maxX);
      const leftColumnX = clampX(leftSide.length ? median(leftSide.map((label) => label.rawX)) : minX);

      const rightFailed = stackColumn(rightSide, rightColumnX, minY, maxBottom) ?? [];
      const leftFailed = stackColumn(leftSide, leftColumnX, minY, maxBottom) ?? [];
      const failedSet = new Set<string>([...rightFailed, ...leftFailed].map((label) => label.id));
      const resolvedFailed = resolveOverlaps(
        labels.filter((label) => !failedSet.has(label.id)),
        minY,
        maxBottom
      );
      return [...rightFailed, ...leftFailed, ...resolvedFailed];
    };

    const failedFirstPass = tryPlace(true);
    if (failedFirstPass.length > 0) {
      failedFirstPass.forEach((label) => {
        label.side *= -1;
        label.rawX = resolveRawX(label, label.side);
      });
      const failedSecondPass = tryPlace(true);
      if (failedSecondPass.length > 0) {
        tryPlace(false);
      }
    }

    return labels;
  }, [activePathNodes, activePathSegments, height, maxTcv, width]);

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
    if (labelsVisible) {
      setTraceKey((prev) => prev + 1);
      if (hoveredLabelId && !labelSnapshot.some((label) => label.id === hoveredLabelId)) {
        setHoveredLabelId(null);
      }
      return;
    }
    setHoveredLabelId(null);
  }, [hoveredLabelId, labelSnapshot, labelsVisible]);

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
                      }}
                      onClick={() => setSelectedId(link.target.id)}
                      onDoubleClick={() => handleDoubleClick(link.target)}
                    />
                  </g>
                );
              })}
              {labelsVisible && flowPathIds ? (
                <g key={`trace-${traceKey}`} className="path-tree__traces">
                  {links
                    .filter((link) => flowPathIds.has(link.target.id))
                    .map((link) => {
                      const tracePath = pathForLink(link.source, link.target);
                      const color = link.outcome === 'win' ? 'var(--win)' : 'var(--loss)';
                      return (
                        <path
                          key={`trace-${link.id}`}
                          d={tracePath}
                          className="path-tree__link-trace"
                          style={{
                            stroke: color,
                            strokeWidth: Math.max(1.5, minStroke * 0.35),
                          }}
                        />
                      );
                    })}
                </g>
              ) : null}
            </g>
            <g className="path-tree__leaders">
              {labelSnapshot.map((label) => {
                const leaderX = label.side > 0 ? label.x : label.x + label.width;
                const leaderY = label.y + label.height / 2;
                const isHovered = hoveredLabelId === label.id;
                const isDimmed = Boolean(hoveredLabelId && !isHovered);
                return (
                  <path
                    key={`leader-${label.id}`}
                    d={`M ${label.nodeX} ${label.nodeY} L ${leaderX} ${leaderY}`}
                    className={`path-tree__leader ${
                      label.outcome === 'win' ? 'path-tree__leader--win' : 'path-tree__leader--loss'
                    } ${isHovered ? 'is-hovered' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
                  />
                );
              })}
            </g>
            <g className="path-tree__nodes">
              {positionedNodes
                .filter((node) => node.opportunity)
                .map((node) => {
                  const success =
                    node.result === 'success' && Boolean(hoveredPathIds && hoveredPathIds.has(node.id));
                  const labelHovered = hoveredLabelId === node.id;
                  const radius = node.opportunity ? 8 + Math.min(16, (node.opportunity.tcv / maxTcv) * 16) : 6;
                  return (
                    <circle
                      key={node.id}
                      cx={node.x}
                      cy={node.y}
                      r={radius}
                      className={`path-tree__leaf ${success ? 'path-tree__leaf--success' : ''} ${
                        labelHovered ? 'path-tree__leaf--label-hover' : ''
                      }`}
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
                const textWidth = LABEL_WIDTH - LABEL_TEXT_X - LABEL_PADDING_X;
                const maxChars = Math.max(12, Math.floor(textWidth / 7));
                const lines = wrapLabelText(text, maxChars, LABEL_MAX_LINES);
                const startY = label.height / 2 - ((lines.length - 1) * LABEL_LINE_HEIGHT) / 2;
                return (
                  <g
                    key={label.id}
                    className={`path-tree__label ${hoveredLabelId === label.id ? 'is-hovered' : ''}`}
                    transform={`translate(${label.x}, ${label.y})`}
                    onPointerEnter={() => setHoveredLabelId(label.id)}
                    onPointerLeave={() => setHoveredLabelId((current) => (current === label.id ? null : current))}
                  >
                    <rect
                      className="path-tree__label-box"
                      width={label.width}
                      height={label.height}
                      rx={12}
                      ry={12}
                    />
                    <circle
                      className={`path-tree__label-step ${
                        label.outcome === 'win' ? 'path-tree__label-step--win' : 'path-tree__label-step--loss'
                      }`}
                      cx={LABEL_PADDING_X + LABEL_STEP_RADIUS}
                      cy={label.height / 2}
                      r={LABEL_STEP_RADIUS}
                    />
                    <text
                      className="path-tree__label-step-text"
                      x={LABEL_PADDING_X + LABEL_STEP_RADIUS}
                      y={label.height / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {label.step}
                    </text>
                    <text className="path-tree__label-text">
                      {lines.map((line, index) => (
                        <tspan key={`${label.id}-line-${index}`} x={LABEL_TEXT_X} y={startY + index * LABEL_LINE_HEIGHT}>
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
