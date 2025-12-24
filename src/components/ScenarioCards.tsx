import type { Opportunity } from '../data/types';
import type { ScenarioSelection } from '../domain/decisionTree';
import { getClosedOutcome } from '../domain/decisionTree';
import { useAppState } from '../state/appState';

type ScenarioCard = {
  id: string;
  title: string;
  description: string;
  apply: (opportunities: Opportunity[]) => ScenarioSelection;
};

const scenarioCards: ScenarioCard[] = [
  {
    id: 'top-priority-wins',
    title: 'Win all top priority deals',
    description: 'Call every top priority deal as won and see the remaining futures.',
    apply: (opportunities) =>
      opportunities.reduce<ScenarioSelection>((acc, opportunity) => {
        if (opportunity.topPriority && !getClosedOutcome(opportunity)) {
          acc[opportunity.id] = 'win';
        }
        return acc;
      }, {}),
  },
  {
    id: 'portfolio-wins',
    title: 'Win portfolio priorities',
    description: 'Assume every portfolio priority deal closes in our favor.',
    apply: (opportunities) =>
      opportunities.reduce<ScenarioSelection>((acc, opportunity) => {
        if (opportunity.portfolioPriority && !getClosedOutcome(opportunity)) {
          acc[opportunity.id] = 'win';
        }
        return acc;
      }, {}),
  },
  {
    id: 'top-priority-losses',
    title: 'Lose the top priorities',
    description: 'A cautionary view: top priorities slip, explore what survives.',
    apply: (opportunities) =>
      opportunities.reduce<ScenarioSelection>((acc, opportunity) => {
        if (opportunity.topPriority && !getClosedOutcome(opportunity)) {
          acc[opportunity.id] = 'loss';
        }
        return acc;
      }, {}),
  },
];

type ScenarioCardsProps = {
  opportunities: Opportunity[];
};

export function ScenarioCards({ opportunities }: ScenarioCardsProps) {
  const { setSelections } = useAppState();

  return (
    <section className="scenario-cards">
      <div>
        <p className="eyebrow">Scenario cards</p>
        <h2>Quick entry points</h2>
        <p className="muted">Apply curated scenario presets in a single click.</p>
      </div>
      <div className="scenario-cards__grid">
        {scenarioCards.map((card) => (
          <article key={card.id} className="scenario-card">
            <header>
              <h3>{card.title}</h3>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setSelections(card.apply(opportunities))}
              >
                Apply
              </button>
            </header>
            <p className="muted">{card.description}</p>
            <div className="scenario-card__preview" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
