import { useState, useEffect, useCallback } from 'react';
import { fetchAccountBalance } from '../utils/stellar';

export interface AccountBalanceState {
  nativeBalance: string;
  isLoading: boolean;
  isFunded: boolean;
  error: string | null;
}

export function useAccountBalance(publicKey: string | null) {
  const [state, setState] = useState<AccountBalanceState>({
    nativeBalance: '0',
    isLoading: false,
    isFunded: true,
    error: null,
  });

  const refreshBalance = useCallback(async () => {
    if (!publicKey) {
      setState({
        nativeBalance: '0',
        isLoading: false,
        isFunded: true,
        error: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const balanceData = await fetchAccountBalance(publicKey);
      const nativeNum = parseFloat(balanceData.native);
      setState({
        nativeBalance: balanceData.native,
        isLoading: false,
        isFunded: nativeNum > 0 || balanceData.balances.length > 0,
        error: null,
      });
    } catch (err: any) {
      console.error('Error fetching account balance:', err);
      setState({
        nativeBalance: '0',
        isLoading: false,
        isFunded: false,
        error: err?.message || 'Could not query account balance from Horizon.',
      });
    }
  }, [publicKey]);

  useEffect(() => {
    refreshBalance();
    const interval = setInterval(refreshBalance, 8000);
    return () => clearInterval(interval);
  }, [refreshBalance]);

  return {
    ...state,
    refresh: refreshBalance,
  };
}
