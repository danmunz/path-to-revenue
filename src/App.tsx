import { useEffect } from 'react';
import { useAppState } from './state/appState';
import { LayoutShell } from './components/LayoutShell';
import { OpportunityList } from './components/OpportunityList';
import { ScenarioSummary } from './components/ScenarioSummary';
import { PathTree } from './components/PathTree';
import { FilterPanel } from './components/FilterPanel';
import { PathSuggestions } from './components/PathSuggestions';
import { applyScenarioSelection } from './domain/scenarioCalculator';

function App() {
  const { hydrateFromRepository, projects, isLoading, lastUpdated, selections } = useAppState();

  useEffect(() => {
    hydrateFromRepository();
  }, [hydrateFromRepository]);

  const effectiveProjects = applyScenarioSelection(projects, selections);

  return (
    <LayoutShell
      header={{ title: 'Revenue Path Planner', subtitle: 'Explore paths to your revenue target' }}
      status={{ isLoading, lastUpdated }}
    >
      <div className="app-grid">
        <section className="panel">
          <ScenarioSummary />
          <FilterPanel />
          <OpportunityList projects={projects} />
        </section>
        <section className="panel">
          <PathTree projects={effectiveProjects} />
          <PathSuggestions />
        </section>
      </div>
    </LayoutShell>
  );
}

export default App;
