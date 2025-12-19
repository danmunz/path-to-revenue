import type { MouseEventHandler } from 'react';

type RefreshButtonProps = {
  onRefresh: MouseEventHandler<HTMLButtonElement>;
  isLoading: boolean;
};

export function RefreshButton({ onRefresh, isLoading }: RefreshButtonProps) {
  return (
    <button className="button" type="button" onClick={onRefresh} disabled={isLoading}>
      {isLoading ? 'Refreshing…' : 'Refresh data'}
    </button>
  );
}
