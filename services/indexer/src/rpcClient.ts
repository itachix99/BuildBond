import { rpc } from '@stellar/stellar-sdk';
import { RawSorobanEvent } from './eventDecoder.js';

export interface RpcPollerOptions {
  rpcUrl: string;
  contractIds?: string[];
  batchSize?: number;
  maxRetries?: number;
}

export class SorobanRpcPoller {
  private server: rpc.Server;
  private contractIds: string[];
  private batchSize: number;
  private maxRetries: number;

  constructor(options: RpcPollerOptions) {
    this.server = new rpc.Server(options.rpcUrl);
    this.contractIds = options.contractIds || [];
    this.batchSize = options.batchSize || 100;
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Fetches latest ledger sequence from Soroban RPC
   */
  async getLatestLedger(): Promise<number> {
    const health = await this.server.getHealth();
    return health.latestLedger || 0;
  }

  /**
   * Fetches contract events starting from a specific ledger sequence
   */
  async fetchEvents(startLedger: number, endLedger?: number): Promise<RawSorobanEvent[]> {
    const filters: rpc.Api.EventFilter[] = [
      this.contractIds.length > 0
        ? { type: 'contract', contractIds: this.contractIds }
        : { type: 'contract' },
    ];
    const allEvents: RawSorobanEvent[] = [];
    let cursor: string | undefined;
    let previousCursor: string | undefined;

    for (let page = 0; page < 10_000; page++) {
      const response = await this.fetchPage(
        cursor
          ? { cursor, filters, limit: this.batchSize }
          : { startLedger, endLedger, filters, limit: this.batchSize }
      );
      const pageEvents: RawSorobanEvent[] = (response.events || []).map((ev: any) => ({
        id: ev.id,
        type: ev.type,
        ledger: ev.ledger,
        ledgerClosedAt: ev.ledgerClosedAt,
        contractId: ev.contractId?.toString() || '',
        txHash: ev.txHash,
        topic: ev.topic || [],
        value: ev.value,
        inSuccessfulContractCall: ev.inSuccessfulContractCall,
      }));
      allEvents.push(...pageEvents);

      const nextCursor = response.cursor;
      if (
        pageEvents.length < this.batchSize ||
        !nextCursor ||
        nextCursor === previousCursor
      ) {
        break;
      }
      previousCursor = nextCursor;
      cursor = nextCursor;
    }

    return endLedger ? allEvents.filter(event => event.ledger <= endLedger) : allEvents;
  }

  private async fetchPage(request: rpc.Api.GetEventsRequest): Promise<rpc.Api.GetEventsResponse> {
    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        return await this.server.getEvents(request);
      } catch (err: any) {
        attempt++;
        if (attempt >= this.maxRetries) {
          throw new Error(
            `Failed to fetch events from Soroban RPC after ${attempt} attempts: ${err.message}`
          );
        }
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 8000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
    throw new Error('RPC event page request exhausted retries');
  }
}
