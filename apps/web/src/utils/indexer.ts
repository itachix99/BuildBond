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

export function isIndexerConfigured(): boolean {
  return configuredIndexerUrl() !== null;
}
