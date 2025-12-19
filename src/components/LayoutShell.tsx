import type { ReactNode } from 'react';
import { RefreshButton } from './RefreshButton';
import { useAppState } from '../state/appState';

type LayoutShellProps = {
  header: {
    title: string;
    subtitle?: string;
  };
  status: {
    isLoading: boolean;
    lastUpdated: Date | null;
  };
  children: ReactNode;
};

export function LayoutShell({ header, status, children }: LayoutShellProps) {
  const { hydrateFromRepository } = useAppState();

  return (
    <div className="layout-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>{header.title}</h1>
          {header.subtitle && <p className="subtitle">{header.subtitle}</p>}
        </div>
        <div className="status-actions">
          <RefreshButton onRefresh={hydrateFromRepository} isLoading={status.isLoading} />
          <p className="timestamp" aria-live="polite">
            {status.lastUpdated ? `Updated ${status.lastUpdated.toLocaleTimeString()}` : 'Not yet loaded'}
          </p>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
