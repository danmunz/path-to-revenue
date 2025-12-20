import type { PathCounts } from '../domain/decisionTree';
import { formatCurrency } from '../domain/decisionTree';

type ScoreboardProps = {
  counts: PathCounts;
  revenueTarget: number;
  backlogRevenue: number;
};

export function Scoreboard({ counts, revenueTarget, backlogRevenue }: ScoreboardProps) {
  const gapToTarget = Math.max(revenueTarget - backlogRevenue, 0);
  return (
    <section className="scoreboard">
      <div>
        <p className="eyebrow">Scoreboard</p>
        <h2>How many ways can we hit the target?</h2>
        <p className="muted">
          Target: {formatCurrency(revenueTarget)} · Gap after backlog: {formatCurrency(gapToTarget)}
        </p>
      </div>
      <div className="scoreboard__stats">
        <div className="scoreboard__stat">
          <p className="stat-label">Paths to target</p>
          <p className="stat-value">{counts.success.toLocaleString()}</p>
        </div>
        <div className="scoreboard__stat">
          <p className="stat-label">Paths that miss</p>
          <p className="stat-value">{counts.failure.toLocaleString()}</p>
        </div>
        <div className="scoreboard__stat">
          <p className="stat-label">Closed-won backlog (FY26)</p>
          <p className="stat-value">{formatCurrency(backlogRevenue)}</p>
        </div>
        <div className="scoreboard__stat">
          <p className="stat-label">Share of total paths</p>
          <p className="stat-value">{counts.percentSuccess.toFixed(1)}%</p>
        </div>
      </div>
    </section>
  );
}
