import type { BAPStage, DataRepository, DataSourceConfig, Project } from './types';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const DEFAULT_REVENUE_TARGET = 10_000_000;

type SheetsResponse = {
  values: string[][];
};

function toBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y';
}

function toNumber(value: string | undefined): number {
  const parsed = Number(value?.replace(/[$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeBapStage(value: string | undefined): BAPStage {
  const normalized = value?.trim().toLowerCase() ?? '';
  switch (normalized) {
    case 'identify':
    case 'lead':
      return 'identify';
    case 'qualify':
    case 'qualified':
      return 'qualify';
    case 'capture':
      return 'capture';
    case 'propose':
    case 'proposal':
      return 'propose';
    case 'awaiting award':
    case 'award':
      return 'awaiting-award';
    case 'closed won':
    case 'won':
      return 'closed-won';
    case 'closed lost':
    case 'lost':
      return 'closed-lost';
    case 'closed no-bid':
    case 'closed no bid':
    case 'no-bid':
    case 'no bid':
      return 'closed-no-bid';
    case 'closed canceled':
    case 'closed cancelled':
    case 'canceled':
    case 'cancelled':
      return 'closed-canceled';
    default:
      return 'identify';
  }
}

function deriveStatus(bapStage: BAPStage, closed: boolean): Project['status'] {
  if (closed && bapStage === 'closed-won') return 'won';
  if (closed) return 'lost';
  return 'open';
}

function mapRowToProject(row: string[], index: number): Project {
  const account = row[0] ?? `Row ${index + 1}`;
  const name = row[1] ?? `Opportunity ${index + 1}`;
  const tcv = toNumber(row[2]);
  const pWin = toNumber(row[3]);
  const startDate = row[4] ? new Date(row[4]) : new Date();
  const topPriority = toBoolean(row[5]);
  const portfolioPriority = toBoolean(row[6]) || topPriority;
  const q1 = toNumber(row[8]);
  const q2 = toNumber(row[9]);
  const q3 = toNumber(row[10]);
  const q4 = toNumber(row[11]);
  const owner = row[12]?.trim() || undefined;
  const bapStage = normalizeBapStage(row[13]);
  const closed = toBoolean(row[14]);
  const periodMonths = row[15] ? toNumber(row[15]) : undefined;
  const status = deriveStatus(bapStage, closed);

  return {
    id: `${account}-${name}-${index + 1}`,
    account,
    name,
    tcv,
    pWin,
    startDate,
    status,
    closed,
    bapStage,
    topPriority,
    portfolioPriority,
    quarterlyRevenue: { q1, q2, q3, q4 },
    owner,
    periodMonths,
  };
}

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
