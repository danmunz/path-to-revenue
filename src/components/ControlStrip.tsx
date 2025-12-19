import type { Opportunity } from '../data/types';
import type { ScenarioSelection } from '../domain/decisionTree';
import { getClosedOutcome } from '../domain/decisionTree';
import { useAppState } from '../state/appState';

type ControlStripProps = {
  opportunities: Opportunity[];
  selections: ScenarioSelection;
};

export function ControlStrip({ opportunities, selections }: ControlStripProps) {
  const { setSelection, resetSelections } = useAppState();
  const hasSelections = Object.keys(selections).length > 0;

  return (
    <section className="control-strip">
      <div className="control-strip__header">
        <div>
          <p className="eyebrow">Control strip</p>
          <h2>Lock outcomes</h2>
          <p className="muted">Select a win or loss to remove an opportunity from the undecided set.</p>
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

          return (
            <div key={opportunity.id} className="control-card">
              <div>
                <p className="control-card__title">{opportunity.name}</p>
                <p className="muted">{opportunity.account}</p>
              </div>
              <div className="control-card__actions">
                <button
                  type="button"
                  className={`pill ${selection === 'win' ? 'pill--active' : ''}`}
                  onClick={() => setSelection(opportunity.id, selection === 'win' ? null : 'win')}
                  disabled={isLocked}
                >
                  Win
                </button>
                <button
                  type="button"
                  className={`pill ${selection === 'loss' ? 'pill--active' : ''}`}
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
