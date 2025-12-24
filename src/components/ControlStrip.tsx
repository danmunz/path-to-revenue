import type { Opportunity } from '../data/types';
import type { ScenarioSelection } from '../domain/decisionTree';
import { formatCurrency, getClosedOutcome } from '../domain/decisionTree';
import { useAppState } from '../state/appState';

type ControlStripProps = {
  opportunities: Opportunity[];
  selections: ScenarioSelection;
};

export function ControlStrip({ opportunities, selections }: ControlStripProps) {
  const { setSelection, resetSelections } = useAppState();
  const hasSelections = Object.keys(selections).length > 0;
  const maxTcv = Math.max(...opportunities.map((opportunity) => opportunity.tcv), 1);

  return (
    <section className="control-strip control-strip--compact">
      <div className="control-strip__header">
        <div>
          <p className="eyebrow">Control strip</p>
          <h2>Call priority deals</h2>
          <p className="muted">Mark deals as won or lost to collapse reachable futures.</p>
        </div>
        {hasSelections && (
          <button type="button" className="button button--ghost" onClick={resetSelections}>
            Reset scenario
          </button>
        )}
      </div>
      <div className="control-strip__list">
        {opportunities.map((opportunity) => {
          const closedOutcome = getClosedOutcome(opportunity);
          const selection = selections[opportunity.id];
          const isLocked = Boolean(closedOutcome);
          const tcvWidth = `${Math.max(6, (opportunity.tcv / maxTcv) * 100)}%`;
          const priorityLabels = [
            opportunity.topPriority ? 'Top' : null,
            !opportunity.topPriority && opportunity.portfolioPriority ? 'Portfolio' : null,
          ].filter(Boolean) as string[];

          return (
            <div key={opportunity.id} className={`control-row ${isLocked ? 'control-row--locked' : ''}`}>
              <div className="control-row__name" title={opportunity.name}>
                {opportunity.name}
              </div>
              <div className="control-row__tcv" aria-label={`TCV ${formatCurrency(opportunity.tcv)}`}>
                <span className="control-row__tcv-bar" style={{ width: tcvWidth }} />
              </div>
              <div className="control-row__priority" aria-label={priorityLabels.join(' ')}>
                {priorityLabels.map((label) => (
                  <span key={label} className="priority-chip">
                    {label}
                  </span>
                ))}
              </div>
              <div className="control-row__actions">
                <button
                  type="button"
                  className={`pill pill--compact ${!selection ? 'pill--active' : ''}`}
                  onClick={() => setSelection(opportunity.id, null)}
                  disabled={isLocked}
                >
                  Unset
                </button>
                <button
                  type="button"
                  className={`pill pill--compact pill--win ${selection === 'win' ? 'pill--active' : ''}`}
                  onClick={() => setSelection(opportunity.id, selection === 'win' ? null : 'win')}
                  disabled={isLocked}
                >
                  Won
                </button>
                <button
                  type="button"
                  className={`pill pill--compact pill--loss ${selection === 'loss' ? 'pill--active' : ''}`}
                  onClick={() => setSelection(opportunity.id, selection === 'loss' ? null : 'loss')}
                  disabled={isLocked}
                >
                  Lost
                </button>
              </div>
              {isLocked && <span className="status-pill">Closed {closedOutcome}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
