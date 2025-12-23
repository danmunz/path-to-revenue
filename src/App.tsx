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
    opportunities,
    isLoading,
    selections,
    revenueTarget,
    backlogRevenue,
    truncatedCount,
    setSelections,
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

  const decisionTree = useMemo(
    () => buildDecisionTree(opportunities, selections, revenueTarget, backlogRevenue),
    [opportunities, selections, revenueTarget, backlogRevenue]
  );
  const counts = useMemo(
    () => countPaths(opportunities, selections, revenueTarget, backlogRevenue),
    [opportunities, selections, revenueTarget, backlogRevenue]
  );

  const secondaryHeader = (
    <div className="path-tree__header path-tree__header--compact">
      <div>
        <h2>Paths to target</h2>
        <p className="muted">
          {counts.success.toLocaleString()} winning paths | showing top 20 | Target {formatCurrency(revenueTarget)}
          {truncatedCount > 0 ? ` | ${truncatedCount} hidden` : ''}
        </p>
      </div>
    </div>
  );

  return (
    <LayoutShell
      title="Revenue Path Planner"
      subtitle="Paths-to-target decision tree"
      isLoading={isLoading}
      secondaryHeader={secondaryHeader}
    >
      <ControlStrip opportunities={opportunities} selections={selections} />
      <Scoreboard counts={counts} revenueTarget={revenueTarget} backlogRevenue={backlogRevenue} />
      <PathTree
        opportunities={opportunities}
        tree={decisionTree}
        revenueTarget={revenueTarget}
        slowMotion={slowMotion}
        truncatedCount={truncatedCount}
        counts={counts}
      />
      <ScenarioCards opportunities={opportunities} />
    </LayoutShell>
  );
}

export default App;
