import { decodeSorobanEvent } from './eventDecoder.js';
import { SorobanRpcPoller, RpcPollerOptions } from './rpcClient.js';
import { IEventStore, MemoryEventStore } from './storage.js';

export interface IndexerServiceOptions extends RpcPollerOptions {
  store?: IEventStore;
  pollIntervalMs?: number;
  startLedger?: number;
}

export class BuildBondIndexerService {
  private poller: SorobanRpcPoller;
  private store: IEventStore;
  private pollIntervalMs: number;
  private isRunning: boolean = false;
  private timer: any = null;

  constructor(options: IndexerServiceOptions) {
    this.poller = new SorobanRpcPoller(options);
    this.store = options.store || new MemoryEventStore();
    this.pollIntervalMs = options.pollIntervalMs || 5000;

    if (options.startLedger !== undefined) {
      this.store.saveCursor({
        lastLedger: options.startLedger,
        updatedAt: Date.now(),
      });
    }
  }

  getStore(): IEventStore {
    return this.store;
  }

  async pollOnce(): Promise<number> {
    const cursor = await this.store.getCursor();
    const latestLedger = await this.poller.getLatestLedger();

    if (latestLedger <= cursor.lastLedger) {
      return 0;
    }

    const fromLedger = cursor.lastLedger > 0 ? cursor.lastLedger + 1 : Math.max(1, latestLedger - 100);
    const rawEvents = await this.poller.fetchEvents(fromLedger, latestLedger);

    const indexedEvents = rawEvents.map(decodeSorobanEvent);
    const savedCount = await this.store.saveEvents(indexedEvents);

    const maxProcessedLedger = rawEvents.reduce(
      (max, e) => Math.max(max, e.ledger),
      latestLedger
    );

    await this.store.saveCursor({
      lastLedger: maxProcessedLedger,
      lastEventId: rawEvents.length > 0 ? rawEvents[rawEvents.length - 1].id : cursor.lastEventId,
      updatedAt: Date.now(),
    });

    return savedCount;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    const runLoop = async () => {
      if (!this.isRunning) return;
      try {
        await this.pollOnce();
      } catch (err: any) {
        console.warn(`[BuildBond Indexer] Polling cycle warning: ${err.message}`);
      } finally {
        if (this.isRunning) {
          this.timer = setTimeout(runLoop, this.pollIntervalMs);
        }
      }
    };

    runLoop();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
