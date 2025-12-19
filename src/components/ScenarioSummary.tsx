import { useMemo } from 'react';
import { useAppState } from '../state/appState';
import { applyScenarioSelection, calculateScenarioSummary } from '../domain/scenarioCalculator';

export function ScenarioSummary() {
  const { projects, revenueTarget, selections } = useAppState();

  const summary = useMemo(() => {
    const effective = applyScenarioSelection(projects, selections);
    return calculateScenarioSummary(effective, revenueTarget);
  }, [projects, selections, revenueTarget]);

  return (
    <div className="summary">
      <p className="eyebrow">Scenario summary</p>
      <h2>
        ${summary.totalWon.toLocaleString()} of ${revenueTarget.toLocaleString()} target
      </h2>
      <div
        className="progress"
        aria-valuenow={summary.percentOfTarget}
        aria-valuemin={0}
        aria-valuemax={200}
        role="progressbar"
      >
        <div className="progress-bar" style={{ width: `${summary.percentOfTarget}%` }} />
      </div>
      <p className="muted">
        Remaining to target: ${summary.remainingTarget.toLocaleString()} — Quarterly mix Q1/Q2/Q3/Q4:{' '}
        {summary.quarterlyTotals.q1.toLocaleString()}/{summary.quarterlyTotals.q2.toLocaleString()}/
        {summary.quarterlyTotals.q3.toLocaleString()}/{summary.quarterlyTotals.q4.toLocaleString()}
      </p>
    </div>
  );
}
