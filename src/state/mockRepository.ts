import type { DataRepository, Project } from '../data/types';

const demoProjects: Project[] = [
  {
    id: '1',
    account: 'USDA',
    name: 'Digital Services Modernization',
    tcv: 4200000,
    pWin: 65,
    startDate: new Date('2026-01-15'),
    status: 'open',
    closed: false,
    bapStage: 'propose',
    topPriority: true,
    portfolioPriority: true,
    quarterlyRevenue: { q1: 800000, q2: 1100000, q3: 1200000, q4: 1100000 },
    owner: 'Alex Rivera',
    periodMonths: 12,
  },
  {
    id: '2',
    account: 'VA',
    name: 'Care Coordination Platform',
    tcv: 3600000,
    pWin: 40,
    startDate: new Date('2026-03-01'),
    status: 'open',
    closed: false,
    bapStage: 'capture',
    topPriority: false,
    portfolioPriority: true,
    quarterlyRevenue: { q1: 0, q2: 900000, q3: 1400000, q4: 1300000 },
    owner: 'Priya Desai',
    periodMonths: 18,
  },
  {
    id: '3',
    account: 'CMS',
    name: 'Eligibility Systems Support',
    tcv: 1500000,
    pWin: 55,
    startDate: new Date('2026-05-20'),
    status: 'open',
    closed: false,
    bapStage: 'qualify',
    topPriority: false,
    portfolioPriority: false,
    quarterlyRevenue: { q1: 0, q2: 400000, q3: 600000, q4: 500000 },
    owner: 'Sam Lee',
    periodMonths: 9,
  },
];

export const mockRepository: DataRepository = {
  isReadOnly: true,
  async getProjects() {
    return demoProjects.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  },
  async getProject(id: string) {
    return demoProjects.find((project) => project.id === id) ?? null;
  },
  async updateProject(id: string, data: Partial<Project>) {
    const index = demoProjects.findIndex((project) => project.id === id);
    if (index === -1) {
      throw new Error('Project not found');
    }
    demoProjects[index] = { ...demoProjects[index], ...data };
    return demoProjects[index];
  },
  async getRevenueTarget() {
    return 10000000;
  },
  async setRevenueTarget(value: number) {
    demoProjects.push({
      id: `target-${value}`,
      account: 'Target Update',
      name: 'Revenue target changed',
      tcv: value,
      pWin: 0,
      startDate: new Date(),
      status: 'open',
      closed: false,
      bapStage: 'lead',
      topPriority: false,
      portfolioPriority: false,
      quarterlyRevenue: { q1: 0, q2: 0, q3: 0, q4: 0 },
    });
  },
};
