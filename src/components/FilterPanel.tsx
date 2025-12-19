import type { ChangeEvent } from 'react';
import { useAppState } from '../state/appState';

export function FilterPanel() {
  const { filters, updateFilters } = useAppState();

  const handlePWinChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateFilters({ minPWin: Number(event.target.value) });
  };

  return (
    <div className="panel-section">
      <p className="eyebrow">Filters</p>
      <div className="filter-grid">
        <label className="filter-control">
          <span>Minimum pWin</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={filters.minPWin}
            onChange={handlePWinChange}
            aria-label="Minimum probability of win"
          />
          <strong>{filters.minPWin}%+</strong>
        </label>

        <label className="filter-control">
          <span>BAP stage</span>
          <select
            value={filters.bapStage}
            onChange={(event) => updateFilters({ bapStage: event.target.value as typeof filters.bapStage })}
          >
            <option value="any">Any stage</option>
            <option value="identify">Identify</option>
            <option value="qualify">Qualify</option>
            <option value="capture">Capture</option>
            <option value="propose">Propose</option>
            <option value="awaiting-award">Awaiting Award</option>
            <option value="closed-won">Closed Won</option>
            <option value="closed-lost">Closed Lost</option>
            <option value="closed-no-bid">Closed No-bid</option>
            <option value="closed-canceled">Closed Canceled</option>
          </select>
        </label>

        <label className="filter-control">
          <span>Priority</span>
          <select
            value={filters.priority}
            onChange={(event) => updateFilters({ priority: event.target.value as typeof filters.priority })}
          >
            <option value="any">Any</option>
            <option value="top">Top priority</option>
            <option value="portfolio">Portfolio priority</option>
          </select>
        </label>
      </div>
    </div>
  );
}
