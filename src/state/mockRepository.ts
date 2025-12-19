import type { DataRepository, Opportunity } from '../data/types';

const demoOpportunities: Opportunity[] = [
  {
    id: '1',
    account: 'USDA',
    name: 'Digital Services Modernization',
    tcv: 4200000,
    pWin: 0.65,
    startDate: new Date('2026-01-15'),
    closed: false,
    bapStage: 'propose',
    topPriority: true,
    portfolioPriority: true,
    owner: 'Alex Rivera',
    periodMonths: 12,
  },
  {
    id: '2',
    account: 'VA',
    name: 'Care Coordination Platform',
    tcv: 3600000,
    pWin: 0.4,
    startDate: new Date('2026-03-01'),
    closed: false,
    bapStage: 'capture',
    topPriority: false,
    portfolioPriority: true,
    owner: 'Priya Desai',
    periodMonths: 18,
  },
  {
    id: '3',
    account: 'CMS',
    name: 'Eligibility Systems Support',
    tcv: 1500000,
    pWin: 0.55,
    startDate: new Date('2026-05-20'),
    closed: false,
    bapStage: 'qualify',
    topPriority: false,
    portfolioPriority: false,
    owner: 'Sam Lee',
    periodMonths: 9,
  },
  {
    id: '4',
    account: 'GSA',
    name: 'Service Modernization Accelerator',
    tcv: 5200000,
    pWin: 0.35,
    startDate: new Date('2026-06-15'),
    closed: false,
    bapStage: 'capture',
    topPriority: false,
    portfolioPriority: true,
    owner: 'Jordan Miles',
    periodMonths: 24,
  },
  {
    id: '5',
    account: 'HHS',
    name: 'Public Health Insights Platform',
    tcv: 2800000,
    pWin: 0.75,
    startDate: new Date('2026-07-30'),
    closed: true,
    bapStage: 'closed-won',
    topPriority: true,
    portfolioPriority: true,
    owner: 'Taylor Nguyen',
    periodMonths: 18,
  },
];

export const mockRepository: DataRepository = {
  isReadOnly: true,
  async getOpportunities() {
    return demoOpportunities.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  },
  async getOpportunity(id: string) {
    return demoOpportunities.find((opportunity) => opportunity.id === id) ?? null;
  },
  async getRevenueTarget() {
    return 30000000;
  },
};
