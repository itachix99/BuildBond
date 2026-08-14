/**
 * @buildbond/indexer — Persistent Soroban RPC event indexing and query service
 */

export * from './types.js';
export * from './eventDecoder.js';
export * from './storage.js';
export * from './rpcClient.js';
export * from './service.js';
export * from './query.js';
export * from './api.js';

import { DEFAULT_TESTNET_RPC_URL } from '@buildbond/shared';
import { BuildBondIndexerService } from './service.js';
import { FileEventStore } from './storage.js';

export interface IndexerConfig {
  rpcUrl: string;
  pollIntervalMs: number;
  confirmationLedgers: number;
  storagePath: string;
  contractIds: string[];
}

export function createDefaultIndexerConfig(): IndexerConfig {
  return {
    rpcUrl: process.env.VITE_STELLAR_RPC_URL || DEFAULT_TESTNET_RPC_URL,
    pollIntervalMs: Number(process.env.INDEXER_POLL_INTERVAL_MS) || 5000,
    confirmationLedgers: Number(process.env.INDEXER_CONFIRMATION_LEDGERS) || 0,
    storagePath: process.env.INDEXER_STORAGE_PATH || '.buildbond-indexer/events.json',
    contractIds: (process.env.BUILDBOND_CONTRACT_IDS || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean),
  };
}

export function createIndexerService(config?: Partial<IndexerConfig>): BuildBondIndexerService {
  const defaults = createDefaultIndexerConfig();
  const store = new FileEventStore({
    filePath: config?.storagePath || defaults.storagePath,
  });
  return new BuildBondIndexerService({
    rpcUrl: config?.rpcUrl || defaults.rpcUrl,
    pollIntervalMs: config?.pollIntervalMs || defaults.pollIntervalMs,
    confirmationLedgers: config?.confirmationLedgers ?? defaults.confirmationLedgers,
    contractIds: config?.contractIds || defaults.contractIds,
    store,
  });
}
