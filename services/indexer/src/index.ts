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
import {
  manifestToNetworkConfig,
  validateDeploymentManifest,
  type NetworkEnvironment,
} from '@buildbond/shared';
import { BuildBondIndexerService } from './service.js';
import { FileEventStore } from './storage.js';
import fs from 'node:fs';

export interface IndexerConfig {
  rpcUrl: string;
  pollIntervalMs: number;
  confirmationLedgers: number;
  storagePath: string;
  contractIds: string[];
}

export function createDefaultIndexerConfig(): IndexerConfig {
  const requestedNetwork = (process.env.BUILDBOND_NETWORK || process.env.BUILD_BOND_NETWORK || 'testnet') as NetworkEnvironment;
  const manifestPath = process.env.BUILDBOND_DEPLOYMENT_MANIFEST;
  let manifestConfig: ReturnType<typeof manifestToNetworkConfig> | undefined;
  let manifestContractIds: string[] = [];
  if (manifestPath) {
    let manifest: unknown;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as unknown;
    } catch (error: any) {
      throw new Error(`Unable to read deployment manifest ${manifestPath}: ${error?.message || error}`);
    }
    const validation = validateDeploymentManifest(manifest, requestedNetwork, { requireVerified: true });
    if (!validation.valid) {
      throw new Error(`Indexer requires a verified deployment manifest:\n${validation.errors.map(error => `- ${error}`).join('\n')}`);
    }
    manifestConfig = manifestToNetworkConfig(manifest as Parameters<typeof manifestToNetworkConfig>[0]);
    manifestContractIds = [manifestConfig.factoryContractId, manifestConfig.referenceEscrowContractId];
  }

  const configuredContractIds = (process.env.BUILDBOND_CONTRACT_IDS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return {
    rpcUrl: manifestConfig?.rpcUrl || process.env.VITE_STELLAR_RPC_URL || DEFAULT_TESTNET_RPC_URL,
    pollIntervalMs: Number(process.env.INDEXER_POLL_INTERVAL_MS) || 5000,
    confirmationLedgers: Number(process.env.INDEXER_CONFIRMATION_LEDGERS) || 0,
    storagePath: process.env.INDEXER_STORAGE_PATH || '.buildbond-indexer/events.json',
    contractIds: [...new Set([...manifestContractIds, ...configuredContractIds])],
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
