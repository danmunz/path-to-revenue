import type { BAPStage, Opportunity } from './types';

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

function normalizePWin(value: string | undefined): number {
  const raw = toNumber(value);
  if (raw > 1) {
    return Math.min(raw / 100, 1);
  }
  return Math.min(Math.max(raw, 0), 1);
}

export function mapRowToOpportunity(row: string[], index: number): Opportunity {
  const account = row[0] ?? `Row ${index + 1}`;
  const name = row[1] ?? `Opportunity ${index + 1}`;
  const tcv = toNumber(row[2]);
  const pWin = normalizePWin(row[3]);
  const startDate = row[4] ? new Date(row[4]) : new Date();
  const topPriority = toBoolean(row[5]);
  const portfolioPriority = toBoolean(row[6]) || topPriority;
  const owner = row[12]?.trim() || undefined;
  const bapStage = normalizeBapStage(row[13]);
  const closed = toBoolean(row[14]);
  const periodMonths = row[15] ? toNumber(row[15]) : undefined;

  return {
    id: `${account}-${name}-${index + 1}`,
    account,
    name,
    tcv,
    pWin,
    startDate,
    closed,
    bapStage,
    topPriority,
    portfolioPriority,
    owner,
    periodMonths,
  };
}
