export interface IndexedProjectSummary {
  projectId: number;
  factoryAddress: string;
  escrowAddress: string;
  owner: string;
  contractor: string;
  inspector?: string;
  arbiter?: string;
  totalCommitted: string;
  createdAtLedger: number;
  createdAt: string;
  salt?: string;
  escrowWasmHash?: string;
}

export interface IndexedEventSummary {
  id: string;
  contractAddress: string;
  eventType: string;
  ledger: number;
  ledgerClosedAt: string;
  txHash: string;
  payload: Record<string, unknown>;
  indexedAt: number;
}

export interface IndexedAuditSummary {
  contractAddress: string;
  eventsCount: number;
  totalDeposited: string;
  totalAllocated: string;
  totalPaid: string;
  totalRetainageClaimed: string;
  totalRefunded: string;
  totalDisputed: string;
  events: IndexedEventSummary[];
}

export interface IndexedProjectDetails {
  project: IndexedProjectSummary;
  events: IndexedEventSummary[];
  audit: IndexedAuditSummary;
}

interface ProjectDirectoryResponse {
  projects: IndexedProjectSummary[];
}

function configuredIndexerUrl(): string | null {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const value = env?.VITE_INDEXER_API_URL?.trim();
  return value ? value.replace(/\/$/, '') : null;
}

export async function fetchIndexedProjects(
  participant: string,
  signal?: AbortSignal
): Promise<IndexedProjectSummary[]> {
  const baseUrl = configuredIndexerUrl();
  if (!baseUrl) return [];
  const url = new URL(`${baseUrl}/projects`);
  if (participant) url.searchParams.set('participant', participant);
  url.searchParams.set('order', 'desc');
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Indexer project query failed (${response.status})`);
  const body = (await response.json()) as ProjectDirectoryResponse;
  if (!body || !Array.isArray(body.projects)) throw new Error('Indexer returned an invalid project directory');
  return body.projects;
}

export async function fetchIndexedProjectDetails(
  project: IndexedProjectSummary,
  signal?: AbortSignal
): Promise<IndexedProjectDetails> {
  const baseUrl = configuredIndexerUrl();
  if (!baseUrl) throw new Error('Indexer API is not configured');
  const url = `${baseUrl}/projects/${encodeURIComponent(project.factoryAddress)}/${project.projectId}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Indexer project detail query failed (${response.status})`);
  const body = (await response.json()) as IndexedProjectDetails;
  if (!body?.project || !Array.isArray(body.events) || !body.audit) {
    throw new Error('Indexer returned an invalid project detail response');
  }
  return body;
}

export function isIndexerConfigured(): boolean {
  return configuredIndexerUrl() !== null;
}
