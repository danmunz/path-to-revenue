import type { BAPStage, Project } from './types';

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

export function mapRowToProject(row: string[], index: number): Project {
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
