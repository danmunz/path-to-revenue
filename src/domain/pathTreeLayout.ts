import type { EffectiveProject } from './scenarioCalculator';

type Outcome = 'won' | 'lost';

export type PathTreeNode = {
  id: string;
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'root' | 'outcome' | 'summary';
  label: string;
  tcv: number;
  pWin: number;
  outcome?: Outcome;
  project?: EffectiveProject;
  totalWon?: number;
  totalLost?: number;
  winCount?: number;
};

export type PathTreeLink = {
  from: string;
  to: string;
};

export type PathTreeLayout = {
  nodes: PathTreeNode[];
  links: PathTreeLink[];
  width: number;
  height: number;
  columnWidth: number;
  columnGap: number;
  rowGap: number;
  isTruncated: boolean;
  trimmedCount: number;
};

const MIN_NODE_HEIGHT = 40;
const MAX_NODE_HEIGHT = 86;
const MIN_SUMMARY_HEIGHT = 44;
const MAX_SUMMARY_HEIGHT = 96;
const COLUMN_WIDTH = 220;
const SUMMARY_WIDTH = 240;
const ROOT_WIDTH = 160;
const COLUMN_GAP = 120;
const ROW_GAP = 18;
const MAX_BRANCH_DEPTH = 8;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function scaleHeight(value: number, maxValue: number, minHeight: number, maxHeight: number) {
  if (!maxValue) return minHeight;
  const ratio = clamp(value / maxValue, 0, 1);
  return minHeight + ratio * (maxHeight - minHeight);
}

export function buildPathTreeLayout(projects: EffectiveProject[]): PathTreeLayout {
  const orderedProjects = [...projects].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const totalPotential = orderedProjects.reduce((sum, project) => sum + project.tcv, 0);
  const isTruncated = orderedProjects.length > MAX_BRANCH_DEPTH;
  const trimmedProjects = isTruncated ? orderedProjects.slice(0, MAX_BRANCH_DEPTH) : orderedProjects;
  const trimmedCount = Math.max(orderedProjects.length - trimmedProjects.length, 0);
  const maxTcv = Math.max(...trimmedProjects.map((project) => project.tcv), totalPotential);

  const nodes = new Map<string, PathTreeNode>();
  const links: PathTreeLink[] = [];
  let nextLeafY = 0;
  let nodeIndex = 0;

  function createNode(node: PathTreeNode) {
    nodes.set(node.id, node);
  }

  function updateNode(id: string, updates: Partial<PathTreeNode>) {
    const existing = nodes.get(id);
    if (!existing) return;
    nodes.set(id, { ...existing, ...updates });
  }

  function buildDecision(
    parentId: string,
    depth: number,
    totals: { totalWon: number; winCount: number }
  ): number {
    if (depth >= trimmedProjects.length) {
      const summaryHeight = scaleHeight(totals.totalWon, maxTcv, MIN_SUMMARY_HEIGHT, MAX_SUMMARY_HEIGHT);
      const yCenter = nextLeafY + summaryHeight / 2;
      const summaryId = `summary-${nodeIndex++}`;
      createNode({
        id: summaryId,
        depth: trimmedProjects.length + 1,
        x: 0,
        y: yCenter,
        width: SUMMARY_WIDTH,
        height: summaryHeight,
        type: 'summary',
        label: 'Scenario summary',
        tcv: totals.totalWon,
        pWin: 100,
        totalWon: totals.totalWon,
        totalLost: totalPotential - totals.totalWon,
        winCount: totals.winCount,
      });
      links.push({ from: parentId, to: summaryId });
      nextLeafY += summaryHeight + ROW_GAP;
      return yCenter;
    }

    const project = trimmedProjects[depth];
    const childCenters: number[] = [];

    (['won', 'lost'] as Outcome[]).forEach((outcome) => {
      const nodeHeight = scaleHeight(project.tcv, maxTcv, MIN_NODE_HEIGHT, MAX_NODE_HEIGHT);
      const nodeId = `${project.id}-${outcome}-${depth}-${nodeIndex++}`;
      createNode({
        id: nodeId,
        depth: depth + 1,
        x: 0,
        y: 0,
        width: COLUMN_WIDTH,
        height: nodeHeight,
        type: 'outcome',
        label: project.name,
        tcv: project.tcv,
        pWin: project.pWin,
        outcome,
        project,
        totalWon: totals.totalWon + (outcome === 'won' ? project.tcv : 0),
        winCount: totals.winCount + (outcome === 'won' ? 1 : 0),
      });
      links.push({ from: parentId, to: nodeId });
      const childCenter = buildDecision(nodeId, depth + 1, {
        totalWon: totals.totalWon + (outcome === 'won' ? project.tcv : 0),
        winCount: totals.winCount + (outcome === 'won' ? 1 : 0),
      });
      updateNode(nodeId, { y: childCenter });
      childCenters.push(childCenter);
    });

    const parentCenter = childCenters.reduce((sum, value) => sum + value, 0) / childCenters.length;
    updateNode(parentId, { y: parentCenter });
    return parentCenter;
  }

  const rootId = 'root';
  createNode({
    id: rootId,
    depth: 0,
    x: 0,
    y: 0,
    width: ROOT_WIDTH,
    height: MIN_NODE_HEIGHT,
    type: 'root',
    label: 'Pipeline start',
    tcv: totalPotential,
    pWin: 100,
  });

  buildDecision(rootId, 0, { totalWon: 0, winCount: 0 });

  const maxDepth = Math.max(...Array.from(nodes.values()).map((node) => node.depth));
  const width = maxDepth * (COLUMN_WIDTH + COLUMN_GAP) + SUMMARY_WIDTH;
  const height = Math.max(nextLeafY - ROW_GAP, MIN_NODE_HEIGHT * 2);

  nodes.forEach((node) => {
    const columnWidth = node.type === 'summary' ? SUMMARY_WIDTH : node.type === 'root' ? ROOT_WIDTH : COLUMN_WIDTH;
    const x = node.depth * (COLUMN_WIDTH + COLUMN_GAP);
    updateNode(node.id, {
      x,
      width: columnWidth,
    });
  });

  return {
    nodes: Array.from(nodes.values()),
    links,
    width,
    height,
    columnWidth: COLUMN_WIDTH,
    columnGap: COLUMN_GAP,
    rowGap: ROW_GAP,
    isTruncated,
    trimmedCount,
  };
}
