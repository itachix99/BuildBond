import {
  IndexedEvent,
  IndexedProject,
  IndexerCursor,
  ProjectQueryOptions,
  QueryOptions,
} from './types.js';

export interface IEventStore {
  saveEvents(events: IndexedEvent[]): Promise<number>;
  getEventsByContract(contractAddress: string, options?: QueryOptions): Promise<IndexedEvent[]>;
  getEventsByParticipant(participantAddress: string, options?: QueryOptions): Promise<IndexedEvent[]>;
  getEventsByMilestone(contractAddress: string, milestoneId: number): Promise<IndexedEvent[]>;
  getAllEvents(options?: QueryOptions): Promise<IndexedEvent[]>;
  getProjects(options?: ProjectQueryOptions): Promise<IndexedProject[]>;
  getCursor(): Promise<IndexerCursor>;
  saveCursor(cursor: IndexerCursor): Promise<void>;
  clear(): Promise<void>;
  count(): Promise<number>;
}

export class MemoryEventStore implements IEventStore {
  protected events: IndexedEvent[] = [];
  protected eventIds = new Set<string>();
  protected projects = new Map<string, IndexedProject>();
  protected cursor: IndexerCursor = {
    lastLedger: 0,
    updatedAt: Date.now(),
  };

  async saveEvents(incoming: IndexedEvent[]): Promise<number> {
    let saved = 0;
    for (const ev of incoming) {
      const eventKey = `${ev.contractAddress.toLowerCase()}:${ev.id}`;
      if (!this.eventIds.has(eventKey)) {
        this.eventIds.add(eventKey);
        this.events.push(ev);
        saved++;
      }
    }
    // Keep events sorted by ledger then timestamp
    this.events.sort(
      (a, b) => a.ledger - b.ledger || a.indexedAt - b.indexedAt || a.id.localeCompare(b.id)
    );
    this.rebuildProjects();
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

  async getProjects(options?: ProjectQueryOptions): Promise<IndexedProject[]> {
    let projects = [...this.projects.values()];
    if (options?.participant) {
      const participant = options.participant.toLowerCase();
      projects = projects.filter(
        project =>
          project.owner.toLowerCase() === participant ||
          project.contractor.toLowerCase() === participant ||
          project.inspector?.toLowerCase() === participant ||
          project.arbiter?.toLowerCase() === participant
      );
    }
    projects.sort((a, b) => a.createdAtLedger - b.createdAtLedger || a.projectId - b.projectId);
    if (options?.order === 'desc') projects.reverse();
    const offset = options?.offset || 0;
    const limit = options?.limit ?? projects.length;
    return projects.slice(offset, offset + limit).map(project => ({ ...project }));
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
    this.projects.clear();
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

  protected snapshot(): {
    events: IndexedEvent[];
    projects: IndexedProject[];
    cursor: IndexerCursor;
  } {
    return {
      events: [...this.events],
      projects: [...this.projects.values()],
      cursor: { ...this.cursor },
    };
  }

  protected restore(snapshot: {
    events?: IndexedEvent[];
    projects?: IndexedProject[];
    cursor?: IndexerCursor;
  }): void {
    this.events = snapshot.events || [];
    this.eventIds = new Set(
      this.events.map(event => `${event.contractAddress.toLowerCase()}:${event.id}`)
    );
    this.projects = new Map(
      (snapshot.projects || []).map(project => [
        `${project.factoryAddress.toLowerCase()}:${project.projectId}`,
        project,
      ])
    );
    this.rebuildProjects();
    this.cursor = snapshot.cursor || { lastLedger: 0, updatedAt: Date.now() };
  }

  private indexProject(event: IndexedEvent): void {
    if (event.eventType === 'project_deployed') {
      const payload = event.payload;
      if (payload?.projectId === undefined || !payload.escrowAddress) return;
      const project: IndexedProject = {
        projectId: payload.projectId,
        factoryAddress: event.contractAddress,
        escrowAddress: payload.escrowAddress,
        owner: payload.owner || '',
        contractor: payload.contractor || '',
        totalCommitted: BigInt(payload.totalCommitted || 0),
        createdAtLedger: event.ledger,
        createdAt: event.ledgerClosedAt,
        salt: payload.salt,
        escrowWasmHash: payload.escrowWasmHash,
      };
      this.projects.set(`${event.contractAddress.toLowerCase()}:${project.projectId}`, project);
      return;
    }

    if (event.eventType !== 'role_accepted') return;
    const project = [...this.projects.values()].find(
      candidate => candidate.escrowAddress.toLowerCase() === event.contractAddress.toLowerCase()
    );
    if (!project || !event.payload?.actor) return;
    if (event.payload.role === 2) project.inspector = event.payload.actor;
    if (event.payload.role === 3) project.arbiter = event.payload.actor;
  }

  private rebuildProjects(): void {
    this.projects.clear();
    // Replays can contain same-ledger events in either order. Build the
    // deployment base first, then attach accepted roles deterministically.
    for (const event of this.events) {
      if (event.eventType === 'project_deployed') this.indexProject(event);
    }
    for (const event of this.events) {
      if (event.eventType === 'role_accepted') this.indexProject(event);
    }
  }
}

export interface FileEventStoreOptions {
  filePath: string;
}

/**
 * Atomic JSON-backed event store for single-process indexer deployments.
 * BigInts are tagged during serialization, and writes use a temp file + rename
 * so a process interruption cannot leave a partially written cursor or event log.
 */
export class FileEventStore extends MemoryEventStore {
  private readonly filePath: string;
  private readonly ready: Promise<void>;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(options: FileEventStoreOptions) {
    super();
    this.filePath = options.filePath;
    this.ready = this.load();
  }

  override async saveEvents(events: IndexedEvent[]): Promise<number> {
    return this.mutate(() => super.saveEvents(events));
  }

  override async getEventsByContract(address: string, options?: QueryOptions): Promise<IndexedEvent[]> {
    await this.idle();
    return super.getEventsByContract(address, options);
  }

  override async getEventsByParticipant(address: string, options?: QueryOptions): Promise<IndexedEvent[]> {
    await this.idle();
    return super.getEventsByParticipant(address, options);
  }

  override async getEventsByMilestone(address: string, milestoneId: number): Promise<IndexedEvent[]> {
    await this.idle();
    return super.getEventsByMilestone(address, milestoneId);
  }

  override async getAllEvents(options?: QueryOptions): Promise<IndexedEvent[]> {
    await this.idle();
    return super.getAllEvents(options);
  }

  override async getProjects(options?: ProjectQueryOptions): Promise<IndexedProject[]> {
    await this.idle();
    return super.getProjects(options);
  }

  override async getCursor(): Promise<IndexerCursor> {
    await this.idle();
    return super.getCursor();
  }

  override async saveCursor(cursor: IndexerCursor): Promise<void> {
    await this.mutate(() => super.saveCursor(cursor));
  }

  override async clear(): Promise<void> {
    await this.mutate(() => super.clear());
  }

  override async count(): Promise<number> {
    await this.idle();
    return super.count();
  }

  private async idle(): Promise<void> {
    await this.ready;
    await this.writeQueue;
  }

  private async mutate<T>(operation: () => Promise<T>): Promise<T> {
    await this.ready;
    const pending = this.writeQueue.then(async () => {
      const result = await operation();
      await this.persist();
      return result;
    });
    this.writeQueue = pending.then(() => undefined, () => undefined);
    return pending;
  }

  private async load(): Promise<void> {
    try {
      const fs = await import('node:fs/promises');
      const raw = await fs.readFile(this.filePath, 'utf8');
      this.restore(JSON.parse(raw, reviveBigInts));
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  private async persist(): Promise<void> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp-${process.pid}`;
    await fs.writeFile(temporaryPath, JSON.stringify(this.snapshot(), bigintReplacer), 'utf8');
    await fs.rename(temporaryPath, this.filePath);
  }
}

function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? { __bigint__: value.toString() } : value;
}

function reviveBigInts(_key: string, value: any): unknown {
  return value && typeof value === 'object' && typeof value.__bigint__ === 'string'
    ? BigInt(value.__bigint__)
    : value;
}
