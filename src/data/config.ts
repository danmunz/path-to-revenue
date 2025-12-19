import type { DataSourceConfig } from './types';

const DEFAULT_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadDataSourceConfig(): DataSourceConfig | null {
  const localCsvPath = import.meta.env.VITE_LOCAL_CSV_PATH as string | undefined;
  const spreadsheetId = import.meta.env.VITE_GOOGLE_SHEETS_ID as string | undefined;
  const range = import.meta.env.VITE_GOOGLE_SHEETS_RANGE as string | undefined;
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
  const refreshIntervalMs = parseNumber(
    import.meta.env.VITE_REFRESH_INTERVAL_MS as string | undefined,
    DEFAULT_REFRESH_INTERVAL_MS
  );
  const revenueTarget = parseNumber(
    import.meta.env.VITE_REVENUE_TARGET as string | undefined,
    Number.NaN
  );

  if (localCsvPath) {
    const config: DataSourceConfig = {
      type: 'local-csv',
      localCsv: {
        path: localCsvPath,
      },
      refreshIntervalMs,
    };

    if (Number.isFinite(revenueTarget)) {
      config.revenueTarget = revenueTarget;
    }

    return config;
  }

  if (!spreadsheetId || !range || !apiKey) {
    return null;
  }

  const config: DataSourceConfig = {
    type: 'google-sheets',
    googleSheets: {
      spreadsheetId,
      range,
      apiKey,
    },
    refreshIntervalMs,
  };

  if (Number.isFinite(revenueTarget)) {
    config.revenueTarget = revenueTarget;
  }

  return config;
}
