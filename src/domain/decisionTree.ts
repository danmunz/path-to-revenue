import type { Opportunity } from '../data/types';

export type Outcome = 'win' | 'loss';
export type ScenarioSelection = Record<string, Outcome>;

export type TreeNode = {
  id: string;
  depth: number;
  revenue: number;
  successCount: number;
  totalCount: number;
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
};

export type DecisionTree = {
  root: TreeNode;
  nodes: TreeNode[];
};

type CountResult = {
  success: number;
  failure: number;
  total: number;
};

type ComboStep = {
  opportunity: Opportunity;
  index: number;
};

type ComboPath = ComboStep[];

export function getClosedOutcome(opportunity: Opportunity): Outcome | null {
  if (!opportunity.closed) return null;
  return opportunity.bapStage === 'closed-won' ? 'win' : 'loss';
}

export function getResolvedOutcome(opportunity: Opportunity, selections: ScenarioSelection): Outcome | null {
  const closedOutcome = getClosedOutcome(opportunity);
  if (closedOutcome) return closedOutcome;
  return selections[opportunity.id] ?? null;
}

function createNode(params: Partial<TreeNode> & Pick<TreeNode, 'id' | 'depth' | 'revenue' | 'successCount' | 'totalCount'>): TreeNode {
  return {
    id: params.id,
    depth: params.depth,
    revenue: params.revenue,
    successCount: params.successCount,
    totalCount: params.totalCount,
    resolved: params.resolved ?? {},
    opportunity: params.opportunity,
    outcome: params.outcome,
    parentId: params.parentId,
    isTerminal: params.isTerminal ?? false,
    result: params.result ?? null,
    children: params.children ?? [],
  };
}

function createCounter(
  opportunities: Opportunity[],
  selections: ScenarioSelection,
  revenueTarget: number
): { countRemaining: (index: number, revenue: number) => CountResult } {
  const totalOpportunities = opportunities.length;
  const suffixMax: number[] = Array.from({ length: totalOpportunities + 1 }, () => 0);
  const suffixCombinations: number[] = Array.from({ length: totalOpportunities + 1 }, () => 1);

  for (let i = totalOpportunities - 1; i >= 0; i -= 1) {
    const opportunity = opportunities[i];
    const forcedOutcome = selections[opportunity.id] ?? null;
    const contributes = forcedOutcome === 'loss' ? 0 : opportunity.tcv;
    suffixMax[i] = suffixMax[i + 1] + contributes;
    const outcomeCount = forcedOutcome ? 1 : 2;
    suffixCombinations[i] = suffixCombinations[i + 1] * outcomeCount;
  }

  const memo = new Map<string, CountResult>();

  function countRemaining(index: number, revenue: number): CountResult {
    if (revenue >= revenueTarget) {
      const success = suffixCombinations[index];
      return { success, failure: 0, total: success };
    }

    if (revenue + suffixMax[index] < revenueTarget) {
      const failure = suffixCombinations[index];
      return { success: 0, failure, total: failure };
    }

    if (index >= totalOpportunities) {
      const failure = suffixCombinations[index];
      return { success: 0, failure, total: failure };
    }

    const key = `${index}|${revenue}`;
    const cached = memo.get(key);
    if (cached) return cached;

    const opportunity = opportunities[index];
    const forcedOutcome = selections[opportunity.id] ?? null;
    const outcomes: Outcome[] = forcedOutcome ? [forcedOutcome] : ['win', 'loss'];

    const result = outcomes.reduce(
      (acc, outcome) => {
        const nextRevenue = outcome === 'win' ? revenue + opportunity.tcv : revenue;
        const childCounts = countRemaining(index + 1, nextRevenue);
        return {
          success: acc.success + childCounts.success,
          failure: acc.failure + childCounts.failure,
          total: acc.total + childCounts.total,
        };
      },
      { success: 0, failure: 0, total: 0 }
    );

    memo.set(key, result);
    return result;
  }

  return { countRemaining };
}

function findWinningCombos(
  opportunities: Opportunity[],
  selections: ScenarioSelection,
  revenueTarget: number,
  startingRevenue: number,
  maxCombos: number
): ComboPath[] {
  const combos: ComboPath[] = [];
  const suffixMax: number[] = Array.from({ length: opportunities.length + 1 }, () => 0);

  for (let i = opportunities.length - 1; i >= 0; i -= 1) {
    const opportunity = opportunities[i];
    const forcedOutcome = selections[opportunity.id] ?? null;
    const contributes = forcedOutcome === 'loss' ? 0 : opportunity.tcv;
    suffixMax[i] = suffixMax[i + 1] + contributes;
  }

  function search(index: number, revenue: number, steps: ComboPath) {
    if (combos.length >= maxCombos) return;
    if (revenue >= revenueTarget) {
      combos.push([...steps]);
      return;
    }
    if (index >= opportunities.length) return;
    if (revenue + suffixMax[index] < revenueTarget) return;

    const opportunity = opportunities[index];
    const forcedOutcome = selections[opportunity.id] ?? null;
    const outcomes: Outcome[] = forcedOutcome ? [forcedOutcome] : ['win', 'loss'];

    outcomes.forEach((outcome) => {
      if (combos.length >= maxCombos) return;
      if (outcome === 'win') {
        steps.push({ opportunity, index });
        search(index + 1, revenue + opportunity.tcv, steps);
        steps.pop();
      } else {
        search(index + 1, revenue, steps);
      }
    });
  }

  search(0, startingRevenue, []);
  return combos;
}

export function buildDecisionTree(
  priorityOpportunities: Opportunity[],
  otherOpportunities: Opportunity[],
  selections: ScenarioSelection,
  revenueTarget: number,
  startingRevenue = 0,
  focusOpportunityId: string | null = null,
  maxComboPaths = 3
): DecisionTree {
  const ordered = [...priorityOpportunities, ...otherOpportunities];
  const { countRemaining } = createCounter(ordered, selections, revenueTarget);
  const rootCounts = countRemaining(0, startingRevenue);
  const root = createNode({
    id: 'root',
    depth: 0,
    revenue: startingRevenue,
    successCount: rootCounts.success,
    totalCount: rootCounts.total,
    resolved: {},
  });

  const nodes: TreeNode[] = [root];
  const nodeMap = new Map<string, TreeNode>([['root', root]]);
  const indexLookup = new Map<string, number>();
  ordered.forEach((opportunity, index) => {
    indexLookup.set(opportunity.id, index);
  });

  function addChild(
    parent: TreeNode,
    opportunity: Opportunity,
    outcome: Outcome,
    revenue: number,
    resolved: Record<string, Outcome>,
    depth: number,
    index: number
  ): TreeNode | null {
    const counts = countRemaining(index + 1, revenue);
    if (counts.success <= 0) return null;
    const id = `${parent.id}/${opportunity.id}:${outcome}`;
    const existing = nodeMap.get(id);
    if (existing) return existing;
    const node = createNode({
      id,
      depth,
      revenue,
      successCount: counts.success,
      totalCount: counts.total,
      resolved,
      opportunity,
      outcome,
      parentId: parent.id,
    });
    nodeMap.set(id, node);
    nodes.push(node);
    parent.children.push(node);
    return node;
  }

  function buildPriorityBranch(
    parent: TreeNode,
    index: number,
    revenue: number,
    resolved: Record<string, Outcome>
  ) {
    if (revenue >= revenueTarget) {
      parent.isTerminal = true;
      parent.result = 'success';
      return;
    }

    if (index >= priorityOpportunities.length) {
      if (otherOpportunities.length === 0) {
        return;
      }
      const combos = findWinningCombos(
        otherOpportunities,
        selections,
        revenueTarget,
        revenue,
        maxComboPaths
      );
      combos.forEach((combo, comboIndex) => {
        let current = parent;
        let currentRevenue = revenue;
        let currentResolved = { ...resolved };
        combo.forEach((step, stepIndex) => {
          currentResolved = { ...currentResolved, [step.opportunity.id]: 'win' };
          currentRevenue += step.opportunity.tcv;
          const absoluteIndex = priorityOpportunities.length + step.index;
          const child = addChild(
            current,
            step.opportunity,
            'win',
            currentRevenue,
            currentResolved,
            current.depth + 1,
            absoluteIndex
          );
          if (!child) return;
          if (stepIndex === combo.length - 1) {
            child.isTerminal = true;
            child.result = 'success';
          }
          current = child;
        });
        if (combo.length === 0 && comboIndex === 0) {
          parent.isTerminal = true;
          parent.result = 'success';
        }
      });
      return;
    }

    const opportunity = priorityOpportunities[index];
    const forcedOutcome = selections[opportunity.id] ?? null;
    const outcomes: Outcome[] = (() => {
      if (forcedOutcome) return [forcedOutcome];
      if (focusOpportunityId === opportunity.id) return ['win', 'loss'];
      const winCounts = countRemaining(index + 1, revenue + opportunity.tcv);
      const lossCounts = countRemaining(index + 1, revenue);
      if (winCounts.success === 0 && lossCounts.success === 0) return [];
      if (winCounts.success === lossCounts.success) return ['win'];
      return winCounts.success > lossCounts.success ? ['win'] : ['loss'];
    })();

    outcomes.forEach((outcome) => {
      const nextRevenue = outcome === 'win' ? revenue + opportunity.tcv : revenue;
      const nextResolved = { ...resolved, [opportunity.id]: outcome };
      const child = addChild(
        parent,
        opportunity,
        outcome,
        nextRevenue,
        nextResolved,
        parent.depth + 1,
        index
      );
      if (!child) return;
      buildPriorityBranch(child, index + 1, nextRevenue, nextResolved);
    });
  }

  if (rootCounts.success > 0) {
    buildPriorityBranch(root, 0, startingRevenue, {});
  }

  return { root, nodes };
}

export function countPaths(
  priorityOpportunities: Opportunity[],
  otherOpportunities: Opportunity[],
  selections: ScenarioSelection,
  revenueTarget: number,
  startingRevenue = 0
): PathCounts {
  const ordered = [...priorityOpportunities, ...otherOpportunities];
  const { countRemaining } = createCounter(ordered, selections, revenueTarget);
  const { success, failure } = countRemaining(0, startingRevenue);
  const total = success + failure;
  return { success, failure, total };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
