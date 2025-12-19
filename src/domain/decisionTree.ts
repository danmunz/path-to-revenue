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
  revenueTarget: number
): DecisionTree {
  const sorted = [...opportunities].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const root = createNode({
    id: 'root',
    depth: 0,
    revenue: sorted
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

  function expand(node: TreeNode, index: number) {
    if (node.revenue >= revenueTarget) {
      node.isTerminal = true;
      node.result = 'success';
      return;
    }

    if (index >= sorted.length) {
      node.isTerminal = true;
      node.result = 'failure';
      return;
    }

    const opportunity = sorted[index];
    const forcedOutcome = getResolvedOutcome(opportunity, selections);
    const outcomes: Outcome[] = forcedOutcome ? [forcedOutcome] : ['win', 'loss'];

    outcomes.forEach((outcome) => {
      const revenue = outcome === 'win' ? node.revenue + opportunity.tcv : node.revenue;
      const probability = node.probability * branchProbability(opportunity, outcome);
      const child = createNode({
        id: `${node.id}/${opportunity.id}:${outcome}`,
        depth: index + 1,
        revenue,
        probability,
        resolved: {
          ...node.resolved,
          [opportunity.id]: outcome,
        },
        opportunity,
        outcome,
        parentId: node.id,
      });

      node.children.push(child);
      nodes.push(child);
      expand(child, index + 1);
    });
  }

  expand(root, 0);

  return { root, nodes };
}

export function countPaths(root: TreeNode, totalOpportunities: number): PathCounts {
  function walk(node: TreeNode): { success: number; failure: number } {
    if (node.isTerminal || node.children.length === 0) {
      const remaining = Math.max(totalOpportunities - node.depth, 0);
      const ways = 2 ** remaining;
      return {
        success: node.result === 'success' ? ways : 0,
        failure: node.result === 'failure' ? ways : 0,
      };
    }

    return node.children.reduce(
      (acc, child) => {
        const childCounts = walk(child);
        return {
          success: acc.success + childCounts.success,
          failure: acc.failure + childCounts.failure,
        };
      },
      { success: 0, failure: 0 }
    );
  }

  const { success, failure } = walk(root);
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
