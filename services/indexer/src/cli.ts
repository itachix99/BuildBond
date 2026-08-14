import { createDefaultIndexerConfig, createIndexerService } from './index.js';
import { IndexerApiServer } from './api.js';

const config = createDefaultIndexerConfig();
const service = createIndexerService(config);
const api = new IndexerApiServer({
  store: service.getStore(),
  host: process.env.INDEXER_API_HOST || '127.0.0.1',
  port: Number(process.env.INDEXER_API_PORT) || 8787,
  corsOrigin: process.env.INDEXER_API_CORS_ORIGIN || '*',
});

const address = await api.start();
await service.start();
console.log(`[BuildBond Indexer] API listening on http://${address.host}:${address.port}`);

async function shutdown(signal: string): Promise<void> {
  console.log(`[BuildBond Indexer] Received ${signal}; stopping...`);
  await service.stop();
  await api.stop();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
