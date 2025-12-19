import type { ScenarioSelection } from './decisionTree';

const PARAM_KEY = 'scenario';

export function parseSelectionsFromUrl(search: string): ScenarioSelection {
  const params = new URLSearchParams(search);
  const encoded = params.get(PARAM_KEY);
  if (!encoded) return {};
  return encoded.split(',').reduce<ScenarioSelection>((acc, pair) => {
    const [id, outcome] = pair.split(':');
    if (id && (outcome === 'win' || outcome === 'loss')) {
      acc[id] = outcome;
    }
    return acc;
  }, {});
}

export function syncSelectionsToUrl(selections: ScenarioSelection) {
  const params = new URLSearchParams(window.location.search);
  const entries = Object.entries(selections);
  if (entries.length === 0) {
    params.delete(PARAM_KEY);
  } else {
    const encoded = entries.map(([id, outcome]) => `${id}:${outcome}`).join(',');
    params.set(PARAM_KEY, encoded);
  }
  const next = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', next);
}
