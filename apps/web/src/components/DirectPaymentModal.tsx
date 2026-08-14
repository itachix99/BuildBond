import React, { useState } from 'react';
import {
  isValidStellarAddress,
  sendNativePayment,
  getExplorerTxUrl,
  formatXlmAmount,
} from '../utils/stellar';

interface DirectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourcePublicKey: string | null;
  availableBalance: string;
  isTestnet: boolean;
  onPaymentSuccess?: (txHash: string) => void;
}

type TxStage = 'idle' | 'simulating' | 'signing' | 'submitting' | 'confirming' | 'confirmed' | 'failed';

// Testnet sample contractor address for quick demonstration
const SAMPLE_CONTRACTOR_TESTNET = 'GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR';

export const DirectPaymentModal: React.FC<DirectPaymentModalProps> = ({
  isOpen,
  onClose,
  sourcePublicKey,
  availableBalance,
  isTestnet,
  onPaymentSuccess,
}) => {
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('BuildBond Level 1 Deposit');
  const [stage, setStage] = useState<TxStage>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [ledgerNum, setLedgerNum] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUseSample = () => {
    setDestination(SAMPLE_CONTRACTOR_TESTNET);
  };

  const handleUseMax = () => {
    const num = parseFloat(availableBalance);
    if (num > 0.0001) {
      // Leave 0.01 XLM for minimum reserve and base fee
      const maxSpendable = Math.max(0, num - 0.01);
      setAmount(maxSpendable.toFixed(4));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourcePublicKey) {
      setErrorMessage('Please connect your Freighter wallet first.');
      return;
    }
    if (!isTestnet) {
      setErrorMessage('Switch Freighter to Stellar Testnet before signing a payment.');
      return;
    }

    if (!isValidStellarAddress(destination)) {
      setErrorMessage('Destination is not a valid Stellar public key (G-address).');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid amount greater than 0 XLM.');
      return;
    }

    setErrorMessage(null);
    setStage('simulating');

    try {
      const result = await sendNativePayment(
        {
          sourcePublicKey,
          destinationPublicKey: destination.trim(),
          amount: amount.trim(),
          memo: memo.trim(),
        },
        (currentStatus) => {
          setStage(currentStatus);
        }
      );

      if (result.successful) {
        setTxHash(result.hash);
        setLedgerNum(result.ledger || null);
        setStage('confirmed');
        onPaymentSuccess?.(result.hash);
      } else {
        setErrorMessage(result.error || 'Transaction failed on network.');
        setStage('failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment execution failed.');
      setStage('failed');
    }
  };

  const handleReset = () => {
    setStage('idle');
    setTxHash(null);
    setErrorMessage(null);
  };

  return (
    <div className="modal-overlay" onClick={stage === 'idle' || stage === 'confirmed' || stage === 'failed' ? onClose : undefined}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-amber">Level 1 Rail</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Direct Testnet XLM Payment</h3>
          </div>
          {(stage === 'idle' || stage === 'confirmed' || stage === 'failed') && (
            <button className="modal-close-btn" onClick={onClose}>
              ✕
            </button>
          )}
        </div>

        {stage === 'confirmed' && txHash ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
            <div
              style={{
                background: 'var(--accent-emerald-glow)',
                border: '1px solid var(--accent-emerald)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '0.25rem' }}>
                Transaction Confirmed on Testnet!
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {ledgerNum ? `Included in ledger sequence #${ledgerNum}.` : 'Confirmed on Stellar network.'}
              </p>
            </div>

            <div className="card" style={{ background: 'var(--bg-surface-elevated)', padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                TRANSACTION HASH:
              </div>
              <div className="font-mono" style={{ fontSize: '0.8125rem', wordBreak: 'break-all', color: 'var(--text-primary)' }}>
                {txHash}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <a
                href={getExplorerTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ flex: 1, textDecoration: 'none' }}
              >
                Open in Stellar Expert Explorer ↗
              </a>
              <button onClick={handleReset} className="btn btn-outline">
                Send Another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Send native XLM on Stellar Testnet to demonstrate payment rail settlement before contract escrow deployment.
            </p>
            {!isTestnet && (
              <div role="alert" style={{ color: 'var(--accent-rose)', fontSize: '0.8125rem' }}>
                Freighter must be connected to Stellar Testnet before this payment rail is enabled.
              </div>
            )}

            {/* Destination Field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Destination Public Key (G-address)</label>
                <button
                  type="button"
                  onClick={handleUseSample}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-amber)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Use Contractor Demo Address
                </button>
              </div>
              <input
                type="text"
                placeholder="G..."
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                disabled={!isTestnet || (stage !== 'idle' && stage !== 'failed')}
                className="input-field font-mono"
                required
              />
            </div>

            {/* Amount Field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Amount (XLM)</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Available: {formatXlmAmount(availableBalance)} XLM (
                  <button
                    type="button"
                    onClick={handleUseMax}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-blue)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Max
                  </button>
                  )
                </span>
              </div>
              <input
                type="number"
                step="0.0000001"
                min="0.0000001"
                placeholder="e.g. 50.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={!isTestnet || (stage !== 'idle' && stage !== 'failed')}
                className="input-field"
                required
              />
            </div>

            {/* Memo Field */}
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>
                Transaction Memo (Optional, max 28 chars)
              </label>
              <input
                type="text"
                maxLength={28}
                placeholder="e.g. Milestone 1 Initial Deposit"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                disabled={!isTestnet || (stage !== 'idle' && stage !== 'failed')}
                className="input-field"
              />
            </div>

            {/* Transaction Progress Steps */}
            {stage !== 'idle' && stage !== 'failed' && (
              <div className="progress-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div className="spinner" />
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {stage === 'simulating' && '1/4: Simulating transaction on Testnet...'}
                    {stage === 'signing' && '2/4: Please approve in Freighter extension...'}
                    {stage === 'submitting' && '3/4: Submitting transaction to Horizon...'}
                    {stage === 'confirming' && '4/4: Confirming ledger inclusion...'}
                  </span>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width:
                        stage === 'simulating'
                          ? '25%'
                          : stage === 'signing'
                          ? '50%'
                          : stage === 'submitting'
                          ? '75%'
                          : '95%',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div
                style={{
                  background: 'var(--accent-rose-glow)',
                  border: '1px solid var(--accent-rose)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 1rem',
                  fontSize: '0.8125rem',
                  color: '#fda4af',
                }}
              >
                <strong>Error:</strong> {errorMessage}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={stage === 'simulating' || stage === 'signing' || stage === 'submitting' || stage === 'confirming'}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  stage === 'simulating' ||
                  stage === 'signing' ||
                  stage === 'submitting' ||
                  stage === 'confirming' ||
                  !sourcePublicKey
                }
                className="btn btn-primary"
              >
                {stage === 'idle' || stage === 'failed' ? 'Sign & Send Testnet XLM' : 'Processing...'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
