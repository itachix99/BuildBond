import { useCallback, useEffect, useState } from 'react';
import { readEscrowState, ReconciledEscrowState } from '../utils/reconciliation';

export function useContractReconciliation(contractAddress: string | undefined) {
  const [state, setState] = useState<ReconciledEscrowState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!contractAddress) {
      setState(null);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setState(await readEscrowState(contractAddress));
    } catch (cause) {
      setState(null);
      setError(cause instanceof Error ? cause.message : 'Unable to reconcile direct contract state');
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress]);

  useEffect(() => {
    void refresh();
    if (!contractAddress) return;
    const interval = setInterval(() => void refresh(), 15000);
    return () => clearInterval(interval);
  }, [contractAddress, refresh]);

  return { state, isLoading, error, refresh };
}
