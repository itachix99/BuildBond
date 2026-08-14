import { useCallback, useEffect, useState } from 'react';
import {
  fetchIndexedProjectDetails,
  IndexedProjectDetails,
  IndexedProjectSummary,
} from '../utils/indexer';

export function useIndexedProjectDetails(project: IndexedProjectSummary | undefined) {
  const [details, setDetails] = useState<IndexedProjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!project) {
      setDetails(null);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setDetails(await fetchIndexedProjectDetails(project, signal));
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(cause instanceof Error ? cause.message : 'Unable to load indexed project details');
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [project]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  return { details, isLoading, error, refresh };
}
