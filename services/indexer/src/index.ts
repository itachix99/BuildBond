/**
 * BuildBond Event Indexer Service Skeleton (Phase 1 Baseline)
 */
import { DEFAULT_TESTNET_RPC_URL } from '@buildbond/shared';

export interface IndexerConfig {
  rpcUrl: string;
  pollIntervalMs: number;
  dbPath: string;
}

export function createDefaultIndexerConfig(): IndexerConfig {
  return {
    rpcUrl: process.env.VITE_STELLAR_RPC_URL || DEFAULT_TESTNET_RPC_URL,
    pollIntervalMs: Number(process.env.INDEXER_POLL_INTERVAL_MS) || 5000,
    dbPath: process.env.INDEXER_DB_PATH || './data/indexer.sqlite',
  };
}

export async function runIndexer() {
  const config = createDefaultIndexerConfig();
  console.log(`[BuildBond Indexer] Initialized with RPC: ${config.rpcUrl}`);
}

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  runIndexer().catch((err) => {
    console.error('[BuildBond Indexer] Fatal error:', err);
    process.exit(1);
  });
}
