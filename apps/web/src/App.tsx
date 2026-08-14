import React, { useState } from 'react';
import { useFreighter } from './hooks/useFreighter';
import { useAccountBalance } from './hooks/useAccountBalance';
import { WalletConnect } from './components/WalletConnect';
import { DirectPaymentModal } from './components/DirectPaymentModal';
import { ProjectPreviewCard } from './components/ProjectPreviewCard';
import { getExplorerTxUrl } from './utils/stellar';

export const App: React.FC = () => {
  const freighter = useFreighter();
  const balance = useAccountBalance(freighter.publicKey);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [recentTxHashes, setRecentTxHashes] = useState<string[]>([]);

  const handlePaymentSuccess = (txHash: string) => {
    setRecentTxHashes((prev) => [txHash, ...prev]);
    balance.refresh();
  };

  return (
    <div className="container">
      {/* Header with Logo and Live Wallet Controls */}
      <header className="header">
        <div className="logo-group">
          <div className="logo-badge">BB</div>
          <div>
            <h1 className="logo-title">BuildBond</h1>
            <p className="logo-subtitle">
              Milestone Escrow, Retainage, and Dispute Resolution on Stellar
            </p>
          </div>
        </div>

        <WalletConnect
          isInstalled={freighter.isInstalled}
          isConnected={freighter.isConnected}
          publicKey={freighter.publicKey}
          network={freighter.network}
          isTestnet={freighter.isTestnet}
          nativeBalance={balance.nativeBalance}
          isLoading={freighter.isLoading}
          isBalanceLoading={balance.isLoading}
          error={freighter.error}
          onConnect={freighter.connect}
          onDisconnect={freighter.disconnect}
          onRefresh={balance.refresh}
        />
      </header>

      {/* Main Content */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Level 1 Hero Payment Rail Action Card */}
        <section
          className="card"
          style={{
            borderLeft: '4px solid var(--accent-amber)',
            background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-surface-subtle) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div style={{ maxWidth: '720px' }}>
              <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '0.5rem' }}>
                <span className="badge badge-amber">Level 1 Foundation</span>
                <span className="badge badge-emerald">Verified Payment Rail</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                Direct Stellar Testnet Settlement
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
                Connect your Freighter wallet, query live Testnet native XLM balances, and execute
                verifiable Testnet transactions with step-by-step state tracking and direct Stellar
                Expert explorer verification.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '220px' }}>
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={!freighter.isConnected || !freighter.isTestnet}
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.25rem', fontSize: '0.9375rem' }}
              >
                Send Testnet XLM Payment →
              </button>
              {!freighter.isConnected && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Connect Freighter on Testnet to send
                </span>
              )}
              {freighter.isConnected && !balance.isFunded && (
                <a
                  href="https://laboratory.stellar.org/#account-creator?network=test"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', textAlign: 'center' }}
                >
                  Unfunded account? Fund with Friendbot ↗
                </a>
              )}
            </div>
          </div>

          {/* Recent Level 1 Transaction History */}
          {recentTxHashes.length > 0 && (
            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                RECENT TESTNET TRANSACTIONS IN THIS SESSION:
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recentTxHashes.map((hash) => (
                  <div
                    key={hash}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--bg-surface-elevated)',
                      padding: '0.5rem 0.875rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <span className="font-mono" style={{ color: 'var(--accent-emerald)' }}>
                      ✓ {hash.slice(0, 16)}...{hash.slice(-8)}
                    </span>
                    <a
                      href={getExplorerTxUrl(hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="badge badge-blue"
                      style={{ textDecoration: 'none' }}
                    >
                      View on Stellar Expert ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Interactive BuildBond Escrow Preview Model */}
        <ProjectPreviewCard connectedAddress={freighter.publicKey} />
      </main>

      {/* Direct Payment Modal */}
      <DirectPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        sourcePublicKey={freighter.publicKey}
        availableBalance={balance.nativeBalance}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default App;
