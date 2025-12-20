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

  return (
    <section className="control-strip control-strip--compact">
      <div className="control-strip__header">
        <div>
          <p className="eyebrow">Control strip</p>
          <h2>Lock outcomes</h2>
          <p className="muted">Quickly set win/loss assumptions while keeping the paths in view.</p>
        </div>
        {hasSelections && (
          <button type="button" className="button button--ghost" onClick={resetSelections}>
            Reset scenario
          </button>
        )}
      </div>
      <div className="control-strip__grid">
        {opportunities.map((opportunity) => {
          const closedOutcome = getClosedOutcome(opportunity);
          const selection = selections[opportunity.id];
          const isLocked = Boolean(closedOutcome);
          const pWinLabel = `${Math.round(opportunity.pWin * 100)}%`;

          return (
            <div key={opportunity.id} className={`control-item ${isLocked ? 'control-item--locked' : ''}`}>
              <div className="control-item__name" title={opportunity.name}>
                {opportunity.name}
              </div>
              <div className="control-item__meta">
                <span className="control-item__badge">{formatCurrency(opportunity.tcv)}</span>
                <span className="control-item__badge">{pWinLabel} PWIN</span>
              </div>
              <div className="control-item__actions">
                <button
                  type="button"
                  className={`pill pill--compact ${selection === 'win' ? 'pill--active' : ''}`}
                  onClick={() => setSelection(opportunity.id, selection === 'win' ? null : 'win')}
                  disabled={isLocked}
                >
                  Win
                </button>
                <button
                  type="button"
                  className={`pill pill--compact ${selection === 'loss' ? 'pill--active' : ''}`}
                  onClick={() => setSelection(opportunity.id, selection === 'loss' ? null : 'loss')}
                  disabled={isLocked}
                >
                  Loss
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
