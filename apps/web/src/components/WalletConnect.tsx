import React from 'react';
import { formatAddress, formatXlmAmount, getExplorerAccountUrl } from '../utils/stellar';

interface WalletConnectProps {
  isInstalled: boolean;
  isConnected: boolean;
  publicKey: string | null;
  network: string | null;
  isTestnet: boolean;
  nativeBalance: string;
  isLoading: boolean;
  isBalanceLoading: boolean;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({
  isInstalled,
  isConnected,
  publicKey,
  network,
  isTestnet,
  nativeBalance,
  isLoading,
  isBalanceLoading,
  error,
  onConnect,
  onDisconnect,
  onRefresh,
}) => {
  if (!isInstalled) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <a
          href="https://www.freighter.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ textDecoration: 'none', fontSize: '0.8125rem', padding: '0.5rem 1rem' }}
        >
          Install Freighter
        </a>
      </div>
    );
  }

  if (!isConnected || !publicKey) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' }}>
        <button
          onClick={onConnect}
          disabled={isLoading}
          className="btn btn-primary"
          style={{ fontSize: '0.8125rem', padding: '0.5rem 1.125rem' }}
        >
          {isLoading ? 'Connecting...' : 'Connect Freighter'}
        </button>
        {error && (
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', maxWidth: '280px', textAlign: 'right' }}>
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
      {/* Network Badge */}
      <span className={`badge ${isTestnet ? 'badge-emerald' : 'badge-rose'}`} title={`Network: ${network}`}>
        {isTestnet ? 'Testnet' : network || 'Unknown Network'}
      </span>

      {/* Balance display */}
      <div
        className="card"
        style={{
          padding: '0.375rem 0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.8125rem',
          background: 'var(--bg-surface-elevated)',
        }}
      >
        <span style={{ color: 'var(--text-secondary)' }}>Balance:</span>
        <span style={{ fontWeight: 700, color: 'var(--accent-amber)' }}>
          {isBalanceLoading ? '...' : `${formatXlmAmount(nativeBalance)} XLM`}
        </span>
        <button
          onClick={onRefresh}
          title="Refresh Balance"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            padding: '0 0.125rem',
          }}
        >
          ↻
        </button>
      </div>

      {/* Public Key and Account Link */}
      <a
        href={getExplorerAccountUrl(publicKey)}
        target="_blank"
        rel="noopener noreferrer"
        className="badge badge-blue font-mono"
        style={{ textDecoration: 'none', padding: '0.375rem 0.625rem', fontSize: '0.8125rem' }}
        title="View on Stellar Expert Explorer"
      >
        {formatAddress(publicKey, 4)} ↗
      </a>

      {/* Disconnect Button */}
      <button
        onClick={onDisconnect}
        className="btn btn-outline"
        style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
        title="Disconnect Wallet"
      >
        Disconnect
      </button>
    </div>
  );
};
