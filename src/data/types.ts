export type BAPStage =
  | 'identify'
  | 'qualify'
  | 'capture'
  | 'propose'
  | 'awaiting-award'
  | 'closed-won'
  | 'closed-lost'
  | 'closed-no-bid'
  | 'closed-canceled';

export type Opportunity = {
  id: string;
  account: string;
  name: string;
  tcv: number;
  fy26FactoredRevenue: number;
  pWin: number;
  startDate: Date;
  closed: boolean;
  bapStage: BAPStage;
  topPriority: boolean;
  portfolioPriority: boolean;
  owner?: string;
  periodMonths?: number;
};

export type DataRepository = {
  isReadOnly: boolean;
  getOpportunities: () => Promise<Opportunity[]>;
  getOpportunity: (id: string) => Promise<Opportunity | null>;
  getRevenueTarget: () => Promise<number>;
};

export type DataSourceConfig = {
  type: 'local-csv';
  localCsv?: {
    path: string;
  };
  revenueTarget?: number;
};
