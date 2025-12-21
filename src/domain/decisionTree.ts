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

type PathStep = {
  opportunity: Opportunity;
  depth: number;
  probability: number;
  revenue: number;
};

type WinningPath = {
  steps: PathStep[];
  probability: number;
  revenue: number;
};

const MAX_RENDER_PATHS = 20;

export function buildDecisionTree(
  opportunities: Opportunity[],
  selections: ScenarioSelection,
  revenueTarget: number,
  startingRevenue = 0
): DecisionTree {
  const sorted = opportunities.filter((opportunity) => getResolvedOutcome(opportunity, selections) !== 'loss');
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

  type QueueItem = {
    index: number;
    probability: number;
    revenue: number;
    steps: PathStep[];
  };

  const queue: QueueItem[] = [{ index: 0, probability: 1, revenue: root.revenue, steps: [] }];
  const winningPaths: WinningPath[] = [];

  function sortQueue() {
    queue.sort((a, b) => b.probability - a.probability);
  }

  while (queue.length > 0) {
    sortQueue();
    const current = queue.shift();
    if (!current) break;
    const { index, probability, revenue, steps } = current;

    if (revenue + suffixMax[index] < revenueTarget) {
      continue;
    }

    if (revenue >= revenueTarget) {
      winningPaths.push({ steps, probability, revenue });
    } else if (index >= sorted.length) {
      continue;
    } else {
      const opportunity = sorted[index];
      const forcedOutcome = getResolvedOutcome(opportunity, selections);
      const outcomes: Outcome[] = forcedOutcome ? [forcedOutcome] : ['win', 'loss'];
      outcomes.forEach((outcome) => {
        const nextProbability = probability * branchProbability(opportunity, outcome);
        const nextRevenue = outcome === 'win' ? revenue + opportunity.tcv : revenue;
        const nextSteps =
          outcome === 'win'
            ? [
                ...steps,
                {
                  opportunity,
                  depth: index + 1,
                  probability: nextProbability,
                  revenue: nextRevenue,
                },
              ]
            : steps;
        queue.push({
          index: index + 1,
          probability: nextProbability,
          revenue: nextRevenue,
          steps: nextSteps,
        });
      });
    }

    if (winningPaths.length >= MAX_RENDER_PATHS) {
      const minTerminalProbability = Math.min(...winningPaths.map((terminal) => terminal.probability));
      sortQueue();
      const next = queue[0];
      if (!next || next.probability <= minTerminalProbability) {
        break;
      }
    }
  }

  const topWinningPaths = winningPaths
    .sort((a, b) => b.probability - a.probability)
    .slice(0, MAX_RENDER_PATHS);

  if (topWinningPaths.length === 0 && root.revenue >= revenueTarget) {
    root.isTerminal = true;
    root.result = 'success';
  }

  topWinningPaths.forEach((path) => {
    let current = root;
    let resolved = { ...root.resolved };
    path.steps.forEach((step, stepIndex) => {
      resolved = { ...resolved, [step.opportunity.id]: 'win' };
      const id = `${current.id}/${step.opportunity.id}:win`;
      let child = nodeMap.get(id);
      if (!child) {
        child = createNode({
          id,
          depth: step.depth,
          revenue: step.revenue,
          probability: step.probability,
          resolved,
          opportunity: step.opportunity,
          outcome: 'win',
          parentId: current.id,
        });
        nodeMap.set(id, child);
        nodes.push(child);
      }
      if (!current.children.some((existing) => existing.id === child?.id)) {
        current.children.push(child);
      }
      current = child;
    });
    current.isTerminal = true;
    current.result = 'success';
  });

  return { root, nodes };
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
