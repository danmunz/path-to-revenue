import { useEffect, useMemo, useState } from 'react';
import { LayoutShell } from './components/LayoutShell';
import { ControlStrip } from './components/ControlStrip';
import { Scoreboard } from './components/Scoreboard';
import { PathTree } from './components/PathTree';
import { ScenarioCards } from './components/ScenarioCards';
import { useAppState } from './state/appState';
import { buildDecisionTree, countPaths, formatCurrency } from './domain/decisionTree';
import { parseSelectionsFromUrl, syncSelectionsToUrl } from './domain/urlState';

function App() {
  const {
    hydrateFromRepository,
    priorityOpportunities,
    otherOpportunities,
    isLoading,
    selections,
    revenueTarget,
    backlogRevenue,
    truncatedCount,
    setSelections,
    lastAction,
  } = useAppState();
  const [slowMotion, setSlowMotion] = useState(false);

  useEffect(() => {
    hydrateFromRepository();
  }, [hydrateFromRepository]);

  useEffect(() => {
    const parsed = parseSelectionsFromUrl(window.location.search);
    if (Object.keys(parsed).length > 0) {
      setSelections(parsed);
    }
  }, [setSelections]);

  useEffect(() => {
    syncSelectionsToUrl(selections);
  }, [selections]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.altKey) {
        setSlowMotion(true);
      }
    }
    function handleKeyUp() {
      setSlowMotion(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const focusOpportunityId = useMemo(() => {
    if (priorityOpportunities.length === 0) return null;
    const findNextUnresolved = (startIndex: number) =>
      priorityOpportunities.slice(startIndex).find((opportunity) => !selections[opportunity.id])?.id ?? null;

    if (!lastAction) {
      return findNextUnresolved(0) ?? priorityOpportunities[0].id;
    }

    if (!lastAction.outcome) {
      if (priorityOpportunities.some((opportunity) => opportunity.id === lastAction.opportunityId)) {
        return lastAction.opportunityId;
      }
      return findNextUnresolved(0) ?? priorityOpportunities[0].id;
    }

    const actionIndex = priorityOpportunities.findIndex((opportunity) => opportunity.id === lastAction.opportunityId);
    if (actionIndex >= 0) {
      return findNextUnresolved(actionIndex + 1);
    }
    return findNextUnresolved(0) ?? priorityOpportunities[0].id;
  }, [lastAction, priorityOpportunities, selections]);

  const decisionTree = useMemo(
    () =>
      buildDecisionTree(
        priorityOpportunities,
        otherOpportunities,
        selections,
        revenueTarget,
        backlogRevenue,
        focusOpportunityId
      ),
    [priorityOpportunities, otherOpportunities, selections, revenueTarget, backlogRevenue, focusOpportunityId]
  );
  const counts = useMemo(
    () => countPaths(priorityOpportunities, otherOpportunities, selections, revenueTarget, backlogRevenue),
    [priorityOpportunities, otherOpportunities, selections, revenueTarget, backlogRevenue]
  );

  const secondaryHeader = (
    <div className="path-tree__header path-tree__header--compact">
      <div>
        <h2>Survivability map</h2>
        <p className="muted">
          {counts.success.toLocaleString()} ways to reach goal · Target {formatCurrency(revenueTarget)}
          {truncatedCount > 0 ? ` · ${truncatedCount} more in reserve` : ''}
        </p>
      </div>
    </div>
  );

  return (
    <LayoutShell
      title="Future Survivability Simulator"
      subtitle="See which priority deals collapse (or preserve) your reachable futures"
      isLoading={isLoading}
      secondaryHeader={secondaryHeader}
    >
      <ControlStrip opportunities={priorityOpportunities} selections={selections} />
      <Scoreboard counts={counts} revenueTarget={revenueTarget} backlogRevenue={backlogRevenue} />
      <PathTree
        opportunities={priorityOpportunities}
        tree={decisionTree}
        slowMotion={slowMotion}
      />
      <ScenarioCards opportunities={priorityOpportunities} />
    </LayoutShell>
  );
}

export default App;
