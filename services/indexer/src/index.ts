/**
 * @buildbond/indexer — Persistent Soroban RPC event indexing and query service
 */

export * from './types.js';
export * from './eventDecoder.js';
export * from './storage.js';
export * from './rpcClient.js';
export * from './service.js';
export * from './query.js';

import { DEFAULT_TESTNET_RPC_URL } from '@buildbond/shared';
import { BuildBondIndexerService } from './service.js';
import { MemoryEventStore } from './storage.js';

export interface IndexerConfig {
  rpcUrl: string;
  pollIntervalMs: number;
}

export function createDefaultIndexerConfig(): IndexerConfig {
  return {
    rpcUrl: process.env.VITE_STELLAR_RPC_URL || DEFAULT_TESTNET_RPC_URL,
    pollIntervalMs: Number(process.env.INDEXER_POLL_INTERVAL_MS) || 5000,
  };
}

export function createIndexerService(config?: Partial<IndexerConfig>): BuildBondIndexerService {
  const defaults = createDefaultIndexerConfig();
  const store = new MemoryEventStore();
  return new BuildBondIndexerService({
    rpcUrl: config?.rpcUrl || defaults.rpcUrl,
    pollIntervalMs: config?.pollIntervalMs || defaults.pollIntervalMs,
    store,
  });
}
