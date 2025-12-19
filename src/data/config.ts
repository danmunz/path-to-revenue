import type { DataSourceConfig } from './types';

const DEFAULT_REVENUE_TARGET = 30_000_000;
const DEFAULT_CSV_PATH = '/data/opportunities.csv';

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadDataSourceConfig(): DataSourceConfig {
  const localCsvPath = (import.meta.env.VITE_LOCAL_CSV_PATH as string | undefined) ?? DEFAULT_CSV_PATH;
  const revenueTarget = parseNumber(
    import.meta.env.VITE_REVENUE_TARGET as string | undefined,
    DEFAULT_REVENUE_TARGET
  );

  return {
    type: 'local-csv',
    localCsv: {
      path: localCsvPath,
    },
    revenueTarget,
  };
}
