import type { DataRepository, DataSourceConfig, Opportunity } from './types';
import { mapRowToOpportunity } from './projectMapper';

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

async function fetchOpportunitiesFromCsv(config: DataSourceConfig['localCsv']): Promise<Opportunity[]> {
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

  return records.map((row, index) => mapRowToOpportunity(row, index));
}

export function createLocalCsvRepository(config: DataSourceConfig): DataRepository {
  let cache: Opportunity[] = [];
  const revenueTarget = config.revenueTarget ?? 0;

  async function ensureCache(): Promise<Opportunity[]> {
    if (cache.length === 0) {
      cache = await fetchOpportunitiesFromCsv(config.localCsv);
      cache = cache.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    }
    return cache;
  }

  return {
    isReadOnly: true,
    async getOpportunities() {
      return ensureCache();
    },
    async getOpportunity(id: string) {
      const opportunities = await ensureCache();
      return opportunities.find((opportunity) => opportunity.id === id) ?? null;
    },
    async getRevenueTarget() {
      return revenueTarget;
    },
  };
}
