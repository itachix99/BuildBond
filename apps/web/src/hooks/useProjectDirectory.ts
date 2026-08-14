import { useCallback, useEffect, useState } from 'react';
import { fetchIndexedProjects, IndexedProjectSummary, isIndexerConfigured } from '../utils/indexer';

export function useProjectDirectory(participant: string) {
  const [projects, setProjects] = useState<IndexedProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isIndexerConfigured();

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!configured) {
      setProjects([]);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setProjects(await fetchIndexedProjects(participant, signal));
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(cause instanceof Error ? cause.message : 'Unable to load indexed projects');
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [configured, participant]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  return { projects, isLoading, error, configured, refresh };
}
