import type { ReactNode } from 'react';

type LayoutShellProps = {
  title: string;
  subtitle?: string;
  isLoading: boolean;
  secondaryHeader?: ReactNode;
  children: ReactNode;
};

export function LayoutShell({ title, subtitle, isLoading, secondaryHeader, children }: LayoutShellProps) {
  return (
    <div className="layout-shell">
      <div className="top-bar-group">
        <header className="top-bar">
          <div>
            <p className="eyebrow">Survivability Simulator</p>
            <h1>{title}</h1>
            {subtitle && <p className="subtitle">{subtitle}</p>}
          </div>
          <div className="status-actions">
            <span className="status-pill" aria-live="polite">
              {isLoading ? 'Loading pipeline…' : 'Pipeline loaded'}
            </span>
          </div>
        </header>
        <div className="top-bar__secondary">
          {secondaryHeader}
          <div id="narrative-slot" className="top-bar__narrative" />
        </div>
      </div>
      <main>{children}</main>
    </div>
  );
}
