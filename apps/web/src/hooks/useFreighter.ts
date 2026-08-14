import { useState, useEffect, useCallback } from 'react';
import freighterApi from '@stellar/freighter-api';
import { NETWORK_PASSPHRASE_TESTNET } from '@buildbond/shared';

const { isConnected, requestAccess, getAddress, getNetworkDetails } = freighterApi;

export interface FreighterWalletState {
  isInstalled: boolean;
  isConnected: boolean;
  publicKey: string | null;
  network: string | null;
  networkPassphrase: string | null;
  isTestnet: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useFreighter() {
  const [state, setState] = useState<FreighterWalletState>({
    isInstalled: false,
    isConnected: false,
    publicKey: null,
    network: null,
    networkPassphrase: null,
    isTestnet: false,
    isLoading: true,
    error: null,
  });

  const checkConnection = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Check if Freighter extension is installed
      const installed = await isConnected();
      if (!installed || !(installed as any).isConnected) {
        setState({
          isInstalled: false,
          isConnected: false,
          publicKey: null,
          network: null,
          networkPassphrase: null,
          isTestnet: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      // 2. Check address
      const addrResult = await getAddress();
      const pubKey = addrResult?.address;

      if (!pubKey) {
        setState({
          isInstalled: true,
          isConnected: false,
          publicKey: null,
          network: null,
          networkPassphrase: null,
          isTestnet: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      // 3. Get network details
      let networkName = 'UNKNOWN';
      let networkPassphrase = '';
      try {
        const netDetails = await getNetworkDetails();
        if (netDetails) {
          networkName = (netDetails as any).network || 'UNKNOWN';
          networkPassphrase = (netDetails as any).networkPassphrase || '';
        }
      } catch (err) {
        console.warn('Could not verify Freighter network details:', err);
      }

      const isTestnet = networkPassphrase === NETWORK_PASSPHRASE_TESTNET;

      setState({
        isInstalled: true,
        isConnected: true,
        publicKey: pubKey,
        network: networkName,
        networkPassphrase,
        isTestnet,
        isLoading: false,
        error: isTestnet ? null : 'Freighter is not on Stellar Testnet. Please switch network.',
      });
    } catch (err: any) {
      console.error('Error checking Freighter status:', err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err?.message || 'Failed to connect to Freighter wallet.',
      }));
    }
  }, []);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const installed = await isConnected();
      if (!installed || !(installed as any).isConnected) {
        window.open('https://www.freighter.app/', '_blank');
        throw new Error('Freighter extension not found. Please install Freighter from freighter.app.');
      }

      const accessResult = await requestAccess();
      const pubKey = accessResult?.address;

      if (!pubKey) {
        throw new Error('Please log in and allow connection in the Freighter extension.');
      }

      let networkName = 'UNKNOWN';
      let networkPassphrase = '';
      try {
        const netDetails = await getNetworkDetails();
        if (netDetails) {
          networkName = (netDetails as any).network || 'UNKNOWN';
          networkPassphrase = (netDetails as any).networkPassphrase || '';
        }
      } catch (err) {
        console.warn('Could not verify Freighter network details:', err);
      }

      const isTestnet = networkPassphrase === NETWORK_PASSPHRASE_TESTNET;

      setState({
        isInstalled: true,
        isConnected: true,
        publicKey: pubKey,
        network: networkName,
        networkPassphrase,
        isTestnet,
        isLoading: false,
        error: isTestnet ? null : 'Freighter is on wrong network. Please switch to Testnet.',
      });
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err?.message || 'Connection rejected or failed.',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isConnected: false,
      publicKey: null,
      error: null,
    }));
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    ...state,
    connect,
    disconnect,
    refresh: checkConnection,
  };
}
