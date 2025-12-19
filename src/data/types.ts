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

type ProjectStatus = 'open' | 'won' | 'lost';

export type QuarterlyRevenue = {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
};

export type Project = {
  id: string;
  account: string;
  name: string;
  tcv: number;
  pWin: number;
  startDate: Date;
  status: ProjectStatus;
  closed: boolean;
  bapStage: BAPStage;
  topPriority: boolean;
  portfolioPriority: boolean;
  quarterlyRevenue: QuarterlyRevenue;
  owner?: string;
  periodMonths?: number;
};

export type DataRepository = {
  isReadOnly: boolean;
  getProjects: () => Promise<Project[]>;
  getProject: (id: string) => Promise<Project | null>;
  updateProject: (id: string, data: Partial<Project>) => Promise<Project>;
  getRevenueTarget: () => Promise<number>;
  setRevenueTarget: (value: number) => Promise<void>;
};

export type DataSourceConfig = {
  type: 'google-sheets' | 'salesforce';
  googleSheets?: {
    spreadsheetId: string;
    range: string;
    apiKey?: string;
    serviceAccountKey?: string;
  };
  salesforce?: {
    instanceUrl: string;
    clientId: string;
    clientSecret: string;
  };
  revenueTarget?: number;
  refreshIntervalMs: number;
};
