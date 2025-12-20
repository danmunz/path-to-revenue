import type { Opportunity } from '../data/types';

export type Outcome = 'win' | 'loss';
export type ScenarioSelection = Record<string, Outcome>;

export type TreeNode = {
  id: string;
  depth: number;
  revenue: number;
  probability: number;
  resolved: Record<string, Outcome>;
  opportunity?: Opportunity;
  outcome?: Outcome;
  parentId?: string;
  isTerminal: boolean;
  result: 'success' | 'failure' | null;
  children: TreeNode[];
};

export type PathCounts = {
  success: number;
  failure: number;
  total: number;
  percentSuccess: number;
};

export type DecisionTree = {
  root: TreeNode;
  nodes: TreeNode[];
};

export function getClosedOutcome(opportunity: Opportunity): Outcome | null {
  if (!opportunity.closed) return null;
  return opportunity.bapStage === 'closed-won' ? 'win' : 'loss';
}

export function getResolvedOutcome(
  opportunity: Opportunity,
  selections: ScenarioSelection
): Outcome | null {
  const closedOutcome = getClosedOutcome(opportunity);
  if (closedOutcome) return closedOutcome;
  return selections[opportunity.id] ?? null;
}

function branchProbability(opportunity: Opportunity, outcome: Outcome): number {
  return outcome === 'win' ? opportunity.pWin : 1 - opportunity.pWin;
}

function createNode(params: Partial<TreeNode> & Pick<TreeNode, 'id' | 'depth' | 'revenue' | 'probability'>): TreeNode {
  return {
    id: params.id,
    depth: params.depth,
    revenue: params.revenue,
    probability: params.probability,
    resolved: params.resolved ?? {},
    opportunity: params.opportunity,
    outcome: params.outcome,
    parentId: params.parentId,
    isTerminal: params.isTerminal ?? false,
    result: params.result ?? null,
    children: params.children ?? [],
  };
}

export function buildDecisionTree(
  opportunities: Opportunity[],
  selections: ScenarioSelection,
  revenueTarget: number,
  startingRevenue = 0,
  maxRenderPaths = 20
): DecisionTree {
  const sorted = [...opportunities];
  const suffixMax: number[] = Array.from({ length: sorted.length + 1 }, () => 0);
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const opportunity = sorted[i];
    const forcedOutcome = getResolvedOutcome(opportunity, selections);
    const contributes = forcedOutcome === 'loss' ? 0 : opportunity.tcv;
    suffixMax[i] = suffixMax[i + 1] + contributes;
  }
  const root = createNode({
    id: 'root',
    depth: 0,
    revenue:
      startingRevenue +
      sorted
        .filter((opp) => getResolvedOutcome(opp, selections) === 'win' && opp.closed)
        .reduce((sum, opp) => sum + opp.tcv, 0),
    probability: 1,
    resolved: sorted.reduce<Record<string, Outcome>>((acc, opp) => {
      const outcome = getResolvedOutcome(opp, selections);
      if (outcome && opp.closed) {
        acc[opp.id] = outcome;
      }
      return acc;
    }, {}),
  });

  const nodes: TreeNode[] = [root];
  const nodeMap = new Map<string, TreeNode>([['root', root]]);
  const terminalNodes: TreeNode[] = [];

  type QueueItem = {
    node: TreeNode;
    index: number;
    probability: number;
  };

  const queue: QueueItem[] = [{ node: root, index: 0, probability: 1 }];

  function sortQueue() {
    queue.sort((a, b) => b.probability - a.probability);
  }

  function addChild(node: TreeNode, index: number, probability: number, opportunity: Opportunity) {
    const revenue = node.revenue + opportunity.tcv;
    const nextProbability = probability * branchProbability(opportunity, 'win');
    const child = createNode({
      id: `${node.id}/${opportunity.id}:win`,
      depth: index + 1,
      revenue,
      probability: nextProbability,
      resolved: {
        ...node.resolved,
        [opportunity.id]: 'win',
      },
      opportunity,
      outcome: 'win',
      parentId: node.id,
    });
    node.children.push(child);
    nodes.push(child);
    nodeMap.set(child.id, child);
    queue.push({ node: child, index: index + 1, probability: nextProbability });
  }

  while (queue.length > 0) {
    sortQueue();
    const current = queue.shift();
    if (!current) break;
    const { node, index, probability } = current;

    if (node.revenue + suffixMax[index] < revenueTarget) {
      continue;
    }

    if (node.revenue >= revenueTarget) {
      node.isTerminal = true;
      node.result = 'success';
      terminalNodes.push(node);
    } else if (index >= sorted.length) {
      continue;
    } else {
      const opportunity = sorted[index];
      const forcedOutcome = getResolvedOutcome(opportunity, selections);
      if (forcedOutcome === 'win') {
        addChild(node, index, probability, opportunity);
      } else if (forcedOutcome === 'loss') {
        const nextProbability = probability * branchProbability(opportunity, 'loss');
        queue.push({ node, index: index + 1, probability: nextProbability });
      } else {
        addChild(node, index, probability, opportunity);
        const nextProbability = probability * branchProbability(opportunity, 'loss');
        queue.push({ node, index: index + 1, probability: nextProbability });
      }
    }

    if (terminalNodes.length >= maxRenderPaths) {
      const minTerminalProbability = Math.min(...terminalNodes.map((terminal) => terminal.probability));
      sortQueue();
      const next = queue[0];
      if (!next || next.probability <= minTerminalProbability) {
        break;
      }
    }
  }

  const allowedIds = new Set<string>();
  terminalNodes.forEach((node) => {
    let current: TreeNode | undefined = node;
    while (current) {
      if (allowedIds.has(current.id)) break;
      allowedIds.add(current.id);
      current = current.parentId ? nodeMap.get(current.parentId) : undefined;
    }
  });
  allowedIds.add(root.id);

  const prunedNodes = nodes.filter((node) => allowedIds.has(node.id));
  prunedNodes.forEach((node) => {
    node.children = node.children.filter((child) => allowedIds.has(child.id));
  });

  return { root, nodes: prunedNodes };
}

export function countPaths(
  opportunities: Opportunity[],
  selections: ScenarioSelection,
  revenueTarget: number,
  startingRevenue = 0
): PathCounts {
  const ordered = [...opportunities];
  const totalOpportunities = ordered.length;
  const suffixMax: number[] = Array.from({ length: totalOpportunities + 1 }, () => 0);
  const suffixCombinations: number[] = Array.from({ length: totalOpportunities + 1 }, () => 1);

  for (let i = totalOpportunities - 1; i >= 0; i -= 1) {
    const opportunity = ordered[i];
    const forcedOutcome = getResolvedOutcome(opportunity, selections);
    const contributes = forcedOutcome === 'loss' ? 0 : opportunity.tcv;
    suffixMax[i] = suffixMax[i + 1] + contributes;
    const outcomeCount = forcedOutcome ? 1 : 2;
    suffixCombinations[i] = suffixCombinations[i + 1] * outcomeCount;
  }

  const memo = new Map<string, { success: number; failure: number }>();

  function countRemaining(index: number, revenue: number): { success: number; failure: number } {
    if (revenue >= revenueTarget) {
      return { success: suffixCombinations[index], failure: 0 };
    }

    if (revenue + suffixMax[index] < revenueTarget) {
      return { success: 0, failure: suffixCombinations[index] };
    }

    if (index >= totalOpportunities) {
      return { success: 0, failure: suffixCombinations[index] };
    }

    const key = `${index}|${revenue}`;
    const cached = memo.get(key);
    if (cached) return cached;

    const opportunity = ordered[index];
    const forcedOutcome = getResolvedOutcome(opportunity, selections);
    const outcomes: Outcome[] = forcedOutcome ? [forcedOutcome] : ['win', 'loss'];

    const result = outcomes.reduce(
      (acc, outcome) => {
        const nextRevenue = outcome === 'win' ? revenue + opportunity.tcv : revenue;
        const childCounts = countRemaining(index + 1, nextRevenue);
        return {
          success: acc.success + childCounts.success,
          failure: acc.failure + childCounts.failure,
        };
      },
      { success: 0, failure: 0 }
    );

    memo.set(key, result);
    return result;
  }

  const { success, failure } = countRemaining(0, startingRevenue);
  const total = success + failure;
  const percentSuccess = total > 0 ? (success / total) * 100 : 0;

  return { success, failure, total, percentSuccess };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
