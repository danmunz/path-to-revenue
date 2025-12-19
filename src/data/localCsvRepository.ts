import type { DataRepository, DataSourceConfig, Project } from './types';
import { mapRowToProject } from './projectMapper';

const DEFAULT_REVENUE_TARGET = 10_000_000;

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        const nextChar = content[i + 1];
        if (nextChar === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(current);
      current = '';
      continue;
    }

    if (char === '\n' || char === '\r') {
      if (char === '\r' && content[i + 1] === '\n') {
        i += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function normalizeRows(rows: string[][]): string[][] {
  return rows.filter((row) => row.some((value) => value.trim() !== ''));
}

async function fetchProjectsFromCsv(config: DataSourceConfig['localCsv']): Promise<Project[]> {
  if (!config) {
    throw new Error('Missing local CSV configuration');
  }

  const response = await fetch(config.path);
  if (!response.ok) {
    throw new Error(`Local CSV request failed: ${response.status} ${response.statusText}`);
  }

  const content = await response.text();
  const rows = normalizeRows(parseCsv(content));
  const [, ...records] = rows;

  return records.map((row, index) => mapRowToProject(row, index));
}

export function createLocalCsvRepository(config: DataSourceConfig): DataRepository {
  let cache: Project[] = [];
  let lastFetched: number | null = null;
  const revenueTarget = config.revenueTarget ?? DEFAULT_REVENUE_TARGET;

  async function refreshIfStale(): Promise<Project[]> {
    const now = Date.now();
    const shouldRefresh = !lastFetched || now - lastFetched > config.refreshIntervalMs || cache.length === 0;
    if (shouldRefresh) {
      cache = await fetchProjectsFromCsv(config.localCsv);
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
