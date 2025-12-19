import type { DataRepository, DataSourceConfig, Project } from './types';
import { mapRowToProject } from './projectMapper';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const DEFAULT_REVENUE_TARGET = 10_000_000;

type SheetsResponse = {
  values: string[][];
};

async function fetchProjectsFromSheet(config: DataSourceConfig['googleSheets']): Promise<Project[]> {
  if (!config) {
    throw new Error('Missing Google Sheets configuration');
  }

  const url = `${SHEETS_API_BASE}/${config.spreadsheetId}/values/${encodeURIComponent(
    config.range
  )}?key=${config.apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Sheets request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as SheetsResponse;
  const rows = data.values ?? [];
  const [, ...records] = rows; // drop header row

  return records.map((row, index) => mapRowToProject(row, index));
}

export function createGoogleSheetsRepository(config: DataSourceConfig): DataRepository {
  let cache: Project[] = [];
  let lastFetched: number | null = null;
  const revenueTarget = config.revenueTarget ?? DEFAULT_REVENUE_TARGET;

  async function refreshIfStale(): Promise<Project[]> {
    const now = Date.now();
    const shouldRefresh = !lastFetched || now - lastFetched > config.refreshIntervalMs || cache.length === 0;
    if (shouldRefresh) {
      cache = await fetchProjectsFromSheet(config.googleSheets);
      cache = cache.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      lastFetched = now;
    }
    return cache;
  }

  return {
    isReadOnly: true,
    async getProjects() {
      return refreshIfStale();
    },
    async getProject(id: string) {
      const projects = await refreshIfStale();
      return projects.find((project) => project.id === id) ?? null;
    },
    async updateProject() {
      throw new Error('Read-only data source: updates are not permitted.');
    },
    async getRevenueTarget() {
      return revenueTarget;
    },
    async setRevenueTarget() {
      throw new Error('Read-only data source: updates are not permitted.');
    },
  };
}
