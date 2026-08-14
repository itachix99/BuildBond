import React from 'react';
import { IndexedProjectSummary } from '../utils/indexer';

interface IndexedProjectDirectoryProps {
  projects: IndexedProjectSummary[];
  participant: string;
  isLoading: boolean;
  configured: boolean;
  error: string | null;
}

function shortAddress(address: string): string {
  return address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-6)}` : address;
}

function formatCommitted(value: string): string {
  try {
    return BigInt(value).toLocaleString();
  } catch {
    return '—';
  }
}

export const IndexedProjectDirectory: React.FC<IndexedProjectDirectoryProps> = ({
  projects,
  participant,
  isLoading,
  configured,
  error,
}) => {
  if (!configured) return null;

  return (
    <section
      aria-label="Indexed project directory"
      style={{
        marginTop: '0.75rem',
        padding: '0.75rem 1.25rem',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Indexed project directory</strong>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
            Read-only RPC event view for {shortAddress(participant)}; contract state remains authoritative.
          </div>
        </div>
        {isLoading && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Refreshing…</span>}
      </div>

      {error && (
        <div role="alert" style={{ color: 'var(--accent-amber)', fontSize: '0.8125rem', marginTop: '0.6rem' }}>
          {error}. The local simulator remains available.
        </div>
      )}

      {!isLoading && !error && projects.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.6rem' }}>
          No indexed projects found for this participant.
        </div>
      )}

      {projects.length > 0 && (
        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.6rem' }}>
          {projects.map(project => (
            <div
              key={`${project.factoryAddress}:${project.projectId}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: '0.5rem 1rem',
                padding: '0.6rem 0.75rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <strong style={{ fontSize: '0.8125rem' }}>Factory project #{project.projectId}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  Escrow <code>{shortAddress(project.escrowAddress)}</code> · ledger {project.createdAtLedger}
                </div>
              </div>
              <strong style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                {formatCommitted(project.totalCommitted)} committed units
              </strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
