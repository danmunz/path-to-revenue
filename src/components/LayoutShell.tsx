import type { ReactNode } from 'react';

type LayoutShellProps = {
  title: string;
  subtitle?: string;
  isLoading: boolean;
  children: ReactNode;
};

export function LayoutShell({ title, subtitle, isLoading, children }: LayoutShellProps) {
  return (
    <div className="layout-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Revenue Explorer</p>
          <h1>{title}</h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        <div className="status-actions">
          <span className="status-pill" aria-live="polite">
            {isLoading ? 'Loading pipeline…' : 'Pipeline loaded'}
          </span>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
