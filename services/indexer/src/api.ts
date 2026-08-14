import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { buildMilestoneTimeline, buildProjectAuditTrail } from './query.js';
import { IEventStore } from './storage.js';
import { BuildBondEventType, IndexedEvent, ProjectQueryOptions, QueryOptions } from './types.js';

export interface IndexerApiOptions {
  store: IEventStore;
  host?: string;
  port?: number;
  corsOrigin?: string;
}

export interface IndexerApiAddress {
  host: string;
  port: number;
}

/**
 * Read-only HTTP API for the indexer's non-authoritative read model.
 *
 * The server intentionally exposes no write or transaction-authorizing routes.
 * All large integer values are serialized as decimal strings so browser clients
 * cannot lose precision through JavaScript Number conversion.
 */
export class IndexerApiServer {
  private readonly store: IEventStore;
  private readonly host: string;
  private readonly port: number;
  private readonly corsOrigin: string;
  private server?: Server;

  constructor(options: IndexerApiOptions) {
    this.store = options.store;
    this.host = options.host || '127.0.0.1';
    this.port = options.port ?? 8787;
    this.corsOrigin = options.corsOrigin || '*';
  }

  async start(): Promise<IndexerApiAddress> {
    if (this.server) return this.address();
    this.server = createServer((request, response) => {
      void this.handle(request, response);
    });
    await new Promise<void>((resolve, reject) => {
      const server = this.server!;
      server.once('error', reject);
      server.listen(this.port, this.host, () => {
        server.removeListener('error', reject);
        resolve();
      });
    });
    return this.address();
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    const server = this.server;
    this.server = undefined;
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }

  private address(): IndexerApiAddress {
    const address = this.server?.address();
    if (!address || typeof address === 'string') {
      return { host: this.host, port: this.port };
    }
    return { host: address.address, port: address.port };
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    this.setHeaders(response);
    if (request.method === 'OPTIONS') {
      response.statusCode = 204;
      response.end();
      return;
    }
    if (request.method !== 'GET') {
      this.writeError(response, 405, 'Only GET requests are supported');
      return;
    }

    try {
      const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      const path = url.pathname.split('/').filter(Boolean);

      if (path.length === 0 || path[0] === 'health') {
        const [cursor, eventsCount] = await Promise.all([
          this.store.getCursor(),
          this.store.count(),
        ]);
        this.writeJson(response, 200, { ok: true, cursor, eventsCount });
        return;
      }

      if (path[0] === 'projects') {
        await this.handleProjects(path.slice(1), url.searchParams, response);
        return;
      }

      if (path[0] === 'events' && path.length === 1) {
        const events = await this.getEvents(url.searchParams);
        this.writeJson(response, 200, { events, count: events.length });
        return;
      }

      this.writeError(response, 404, 'Route not found');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      this.writeError(response, 400, message);
    }
  }

  private async handleProjects(
    path: string[],
    search: URLSearchParams,
    response: ServerResponse
  ): Promise<void> {
    if (path.length === 0) {
      const options = parseProjectQuery(search);
      const projects = await this.store.getProjects(options);
      this.writeJson(response, 200, { projects, count: projects.length, options });
      return;
    }

    if (path.length < 2) {
      this.writeError(response, 404, 'Project route requires factory address and project ID');
      return;
    }

    const factoryAddress = decodeURIComponent(path[0]);
    const projectId = parseInteger(path[1], 'project ID');
    const projects = await this.store.getProjects({ limit: 10000 });
    const project = projects.find(
      candidate =>
        candidate.factoryAddress.toLowerCase() === factoryAddress.toLowerCase() &&
        candidate.projectId === projectId
    );
    if (!project) {
      this.writeError(response, 404, 'Project not found');
      return;
    }

    if (path.length === 2) {
      const [events, audit] = await Promise.all([
        this.store.getEventsByContract(project.escrowAddress, { order: 'desc', limit: 100 }),
        buildProjectAuditTrail(this.store, project.escrowAddress),
      ]);
      this.writeJson(response, 200, { project, events, audit });
      return;
    }

    if (path.length === 3 && path[2] === 'audit') {
      const audit = await buildProjectAuditTrail(this.store, project.escrowAddress);
      this.writeJson(response, 200, audit);
      return;
    }

    if (path.length === 4 && path[2] === 'milestones') {
      const milestoneId = parseInteger(path[3], 'milestone ID');
      const timeline = await buildMilestoneTimeline(this.store, project.escrowAddress, milestoneId);
      this.writeJson(response, 200, timeline);
      return;
    }

    this.writeError(response, 404, 'Project route not found');
  }

  private async getEvents(search: URLSearchParams): Promise<IndexedEvent[]> {
    const options = parseEventQuery(search);
    const contractAddress = search.get('contractAddress');
    const participant = search.get('participant');
    if (contractAddress && participant) {
      throw new Error('Use either contractAddress or participant, not both');
    }
    if (contractAddress) return this.store.getEventsByContract(contractAddress, options);
    if (participant) return this.store.getEventsByParticipant(participant, options);
    return this.store.getAllEvents(options);
  }

  private setHeaders(response: ServerResponse): void {
    response.setHeader('Access-Control-Allow-Origin', this.corsOrigin);
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Cache-Control', 'no-store');
  }

  private writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
    response.statusCode = statusCode;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(body, bigintReplacer));
  }

  private writeError(response: ServerResponse, statusCode: number, message: string): void {
    this.writeJson(response, statusCode, { error: message });
  }
}

function parseProjectQuery(search: URLSearchParams): ProjectQueryOptions {
  return {
    participant: search.get('participant') || undefined,
    limit: parseBoundedInteger(search.get('limit'), 'limit', 100),
    offset: parseBoundedInteger(search.get('offset'), 'offset', 0),
    order: parseOrder(search.get('order')),
  };
}

function parseEventQuery(search: URLSearchParams): QueryOptions {
  return {
    limit: parseBoundedInteger(search.get('limit'), 'limit', 100),
    offset: parseBoundedInteger(search.get('offset'), 'offset', 0),
    order: parseOrder(search.get('order')),
    eventType: parseEventType(search.get('eventType')),
    fromLedger: parseOptionalInteger(search.get('fromLedger'), 'fromLedger'),
    toLedger: parseOptionalInteger(search.get('toLedger'), 'toLedger'),
  };
}

function parseEventType(value: string | null): BuildBondEventType | undefined {
  return value ? (value as BuildBondEventType) : undefined;
}

function parseOrder(value: string | null): 'asc' | 'desc' | undefined {
  if (!value) return undefined;
  if (value !== 'asc' && value !== 'desc') throw new Error('order must be asc or desc');
  return value;
}

function parseBoundedInteger(value: string | null, name: string, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer`);
  if (name === 'limit' && parsed > 100) throw new Error('limit must be at most 100');
  return parsed;
}

function parseOptionalInteger(value: string | null, name: string): number | undefined {
  return value === null ? undefined : parseBoundedInteger(value, name, 0);
}

function parseInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer`);
  return parsed;
}

function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}
