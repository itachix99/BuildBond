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
    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        const filters: rpc.Api.EventFilter[] = [];

        if (this.contractIds.length > 0) {
          filters.push({
            type: 'contract',
            contractIds: this.contractIds,
          });
        } else {
          filters.push({
            type: 'contract',
          });
        }

        const response = await this.server.getEvents({
          startLedger,
          filters,
          limit: this.batchSize,
        });

        const rawEvents: RawSorobanEvent[] = (response.events || []).map((ev: any) => ({
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

        if (endLedger) {
          return rawEvents.filter(e => e.ledger <= endLedger);
        }

        return rawEvents;
      } catch (err: any) {
        attempt++;
        if (attempt >= this.maxRetries) {
          throw new Error(`Failed to fetch events from Soroban RPC after ${attempt} attempts: ${err.message}`);
        }
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 8000);
        await new Promise(r => setTimeout(r, backoffMs));
      }
    }
    return [];
  }
}
