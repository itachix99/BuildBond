import { IndexedEvent, IndexerCursor, QueryOptions } from './types.js';

export interface IEventStore {
  saveEvents(events: IndexedEvent[]): Promise<number>;
  getEventsByContract(contractAddress: string, options?: QueryOptions): Promise<IndexedEvent[]>;
  getEventsByParticipant(participantAddress: string, options?: QueryOptions): Promise<IndexedEvent[]>;
  getEventsByMilestone(contractAddress: string, milestoneId: number): Promise<IndexedEvent[]>;
  getAllEvents(options?: QueryOptions): Promise<IndexedEvent[]>;
  getCursor(): Promise<IndexerCursor>;
  saveCursor(cursor: IndexerCursor): Promise<void>;
  clear(): Promise<void>;
  count(): Promise<number>;
}

export class MemoryEventStore implements IEventStore {
  private events: IndexedEvent[] = [];
  private eventIds = new Set<string>();
  private cursor: IndexerCursor = {
    lastLedger: 0,
    updatedAt: Date.now(),
  };

  async saveEvents(incoming: IndexedEvent[]): Promise<number> {
    let saved = 0;
    for (const ev of incoming) {
      if (!this.eventIds.has(ev.id)) {
        this.eventIds.add(ev.id);
        this.events.push(ev);
        saved++;
      }
    }
    // Keep events sorted by ledger then timestamp
    this.events.sort((a, b) => a.ledger - b.ledger || a.indexedAt - b.indexedAt);
    return saved;
  }

  async getEventsByContract(contractAddress: string, options?: QueryOptions): Promise<IndexedEvent[]> {
    const filtered = this.events.filter(
      ev => ev.contractAddress.toLowerCase() === contractAddress.toLowerCase()
    );
    return this.applyOptions(filtered, options);
  }

  async getEventsByParticipant(participantAddress: string, options?: QueryOptions): Promise<IndexedEvent[]> {
    const addr = participantAddress.toLowerCase();
    const filtered = this.events.filter(ev => {
      const p = ev.payload;
      if (!p) return false;
      return (
        p.owner?.toLowerCase() === addr ||
        p.contractor?.toLowerCase() === addr ||
        p.inspector?.toLowerCase() === addr ||
        p.arbiter?.toLowerCase() === addr ||
        p.actor?.toLowerCase() === addr ||
        p.funder?.toLowerCase() === addr ||
        p.caller?.toLowerCase() === addr ||
        p.beneficiary?.toLowerCase() === addr ||
        p.initiator?.toLowerCase() === addr
      );
    });
    return this.applyOptions(filtered, options);
  }

  async getEventsByMilestone(contractAddress: string, milestoneId: number): Promise<IndexedEvent[]> {
    return this.events.filter(
      ev =>
        ev.contractAddress.toLowerCase() === contractAddress.toLowerCase() &&
        ev.payload?.milestoneId === milestoneId
    );
  }

  async getAllEvents(options?: QueryOptions): Promise<IndexedEvent[]> {
    return this.applyOptions([...this.events], options);
  }

  async getCursor(): Promise<IndexerCursor> {
    return { ...this.cursor };
  }

  async saveCursor(cursor: IndexerCursor): Promise<void> {
    this.cursor = { ...cursor, updatedAt: Date.now() };
  }

  async clear(): Promise<void> {
    this.events = [];
    this.eventIds.clear();
    this.cursor = { lastLedger: 0, updatedAt: Date.now() };
  }

  async count(): Promise<number> {
    return this.events.length;
  }

  private applyOptions(list: IndexedEvent[], options?: QueryOptions): IndexedEvent[] {
    if (!options) return list;

    let res = list;
    if (options.eventType) {
      res = res.filter(e => e.eventType === options.eventType);
    }
    if (options.fromLedger !== undefined) {
      res = res.filter(e => e.ledger >= options.fromLedger!);
    }
    if (options.toLedger !== undefined) {
      res = res.filter(e => e.ledger <= options.toLedger!);
    }

    if (options.order === 'desc') {
      res = [...res].reverse();
    }

    const offset = options.offset || 0;
    const limit = options.limit !== undefined ? options.limit : res.length;

    return res.slice(offset, offset + limit);
  }
}
