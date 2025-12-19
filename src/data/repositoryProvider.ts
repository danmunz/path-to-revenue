import { loadDataSourceConfig } from './config';
import { createGoogleSheetsRepository } from './googleSheetsRepository';
import { createLocalCsvRepository } from './localCsvRepository';
import type { DataRepository } from './types';
import { mockRepository } from '../state/mockRepository';

export function createRepository(): DataRepository {
  const config = loadDataSourceConfig();

  if (config?.type === 'local-csv') {
    return createLocalCsvRepository(config);
  }

  if (config?.type === 'google-sheets') {
    return createGoogleSheetsRepository(config);
  }

  return mockRepository;
}
