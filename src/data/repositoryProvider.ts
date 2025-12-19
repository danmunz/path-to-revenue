import { loadDataSourceConfig } from './config';
import { createGoogleSheetsRepository } from './googleSheetsRepository';
import type { DataRepository } from './types';
import { mockRepository } from '../state/mockRepository';

export function createRepository(): DataRepository {
  const config = loadDataSourceConfig();

  if (config && config.type === 'google-sheets') {
    return createGoogleSheetsRepository(config);
  }

  return mockRepository;
}
