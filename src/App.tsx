import { useEffect, useMemo, useState } from 'react';
import { LayoutShell } from './components/LayoutShell';
import { ControlStrip } from './components/ControlStrip';
import { Scoreboard } from './components/Scoreboard';
import { PathTree } from './components/PathTree';
import { ScenarioCards } from './components/ScenarioCards';
import { useAppState } from './state/appState';
import { buildDecisionTree, countPaths } from './domain/decisionTree';
import { parseSelectionsFromUrl, syncSelectionsToUrl } from './domain/urlState';

function App() {
  const { hydrateFromRepository, opportunities, isLoading, selections, revenueTarget, setSelections } =
    useAppState();
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
    () => buildDecisionTree(opportunities, selections, revenueTarget),
    [opportunities, selections, revenueTarget]
  );
  const counts = useMemo(
    () => countPaths(decisionTree.root, opportunities.length),
    [decisionTree.root, opportunities.length]
  );

  return (
    <LayoutShell title="Revenue Path Planner" subtitle="Paths-to-target decision tree" isLoading={isLoading}>
      <ControlStrip opportunities={opportunities} selections={selections} />
      <Scoreboard counts={counts} revenueTarget={revenueTarget} />
      <PathTree
        opportunities={opportunities}
        tree={decisionTree}
        revenueTarget={revenueTarget}
        slowMotion={slowMotion}
      />
      <ScenarioCards opportunities={opportunities} />
    </LayoutShell>
  );
}

export default App;
