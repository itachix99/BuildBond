import { decodeSorobanEvent } from './eventDecoder.js';
import { SorobanRpcPoller, RpcPollerOptions } from './rpcClient.js';
import { IEventStore, MemoryEventStore } from './storage.js';

export interface IndexerServiceOptions extends RpcPollerOptions {
  store?: IEventStore;
  pollIntervalMs?: number;
  startLedger?: number;
  confirmationLedgers?: number;
}

export class BuildBondIndexerService {
  private poller: SorobanRpcPoller;
  private store: IEventStore;
  private pollIntervalMs: number;
  private isRunning: boolean = false;
  private timer: any = null;
  private confirmationLedgers: number;
  private startLedger?: number;

  constructor(options: IndexerServiceOptions) {
    this.poller = new SorobanRpcPoller(options);
    this.store = options.store || new MemoryEventStore();
    this.pollIntervalMs = options.pollIntervalMs || 5000;
    this.confirmationLedgers = Math.max(0, options.confirmationLedgers || 0);
    this.startLedger = options.startLedger;
  }

  getStore(): IEventStore {
    return this.store;
  }

  async pollOnce(): Promise<number> {
    let cursor = await this.store.getCursor();
    if (this.startLedger !== undefined && cursor.lastLedger === 0) {
      await this.store.saveCursor({ lastLedger: this.startLedger, updatedAt: Date.now() });
      cursor = await this.store.getCursor();
    }
    const networkLatestLedger = await this.poller.getLatestLedger();
    const latestLedger = Math.max(0, networkLatestLedger - this.confirmationLedgers);

    if (latestLedger <= cursor.lastLedger) {
      return 0;
    }

    const fromLedger = cursor.lastLedger > 0 ? cursor.lastLedger + 1 : Math.max(1, latestLedger - 100);
    const rawEvents = await this.poller.fetchEvents(fromLedger, latestLedger);

    const indexedEvents = rawEvents
      .filter(event => event.inSuccessfulContractCall !== false)
      .map(decodeSorobanEvent);
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
