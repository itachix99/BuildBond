import React from 'react';
import { IndexedProjectSummary } from '../utils/indexer';
import { ReconciledEscrowState } from '../utils/reconciliation';

interface ContractReconciliationCardProps {
  indexedProject?: IndexedProjectSummary;
  state: ReconciledEscrowState | null;
  isLoading: boolean;
  error: string | null;
}

function formatAmount(value: string): string {
  try {
    return BigInt(value).toLocaleString();
  } catch {
    return '—';
  }
}

export const ContractReconciliationCard: React.FC<ContractReconciliationCardProps> = ({
  indexedProject,
  state,
  isLoading,
  error,
}) => {
  if (!indexedProject) return null;
  const commitmentMismatch = state && state.terms.totalCommitted !== indexedProject.totalCommitted;

  return (
    <section
      aria-label="Direct contract reconciliation"
      style={{
        marginTop: '0.75rem',
        padding: '0.9rem 1.25rem',
        background: 'var(--bg-surface-elevated)',
        border: `1px solid ${commitmentMismatch ? 'var(--accent-amber)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <strong>Direct contract reconciliation</strong>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
            Soroban reads for <code>{indexedProject.escrowAddress}</code>; no transaction is submitted.
          </div>
        </div>
        <span className={`status-pill ${state && !commitmentMismatch ? 'success' : 'warning'}`}>
          {isLoading ? 'Reading…' : state && !commitmentMismatch ? 'Reconciled' : 'Needs review'}
        </span>
      </div>

      {error && (
        <div role="alert" style={{ color: 'var(--accent-amber)', fontSize: '0.8125rem', marginTop: '0.65rem' }}>
          {error}. Indexed values remain advisory until the contract read succeeds.
        </div>
      )}

      {state && (
        <>
          {commitmentMismatch && (
            <div role="alert" style={{ color: 'var(--accent-amber)', fontSize: '0.8125rem', marginTop: '0.65rem' }}>
              Commitment differs: indexer {formatAmount(indexedProject.totalCommitted)} vs contract {formatAmount(state.terms.totalCommitted)}. Do not use the indexed value for payment decisions.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', marginTop: '0.75rem' }}>
            <Metric label="Contract status" value={state.status} />
            <Metric label="Deposited" value={formatAmount(state.accounting.deposited)} />
            <Metric label="Allocated" value={formatAmount(state.accounting.allocated)} />
            <Metric label="Payable" value={formatAmount(state.accounting.contractorPayable)} />
            <Metric label="Retainage locked" value={formatAmount(state.accounting.retainageLocked)} />
            <Metric label="Disputed" value={formatAmount(state.accounting.disputed)} />
            <Metric label="Coverage" value={`${state.coverage.coverageRatioBps} bps`} />
            <Metric label="Milestones covered" value={`${state.coverage.coveredMilestones}/${state.coverage.totalMilestones}`} />
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.65rem' }}>
            Last direct read: {new Date(state.fetchedAt).toLocaleString()}. Contract state is authoritative for custody, eligibility, and authorization.
          </div>
        </>
      )}
    </section>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ padding: '0.55rem 0.65rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{label}</div>
    <strong style={{ display: 'block', marginTop: '0.2rem', fontSize: '0.9rem' }}>{value}</strong>
  </div>
);
