import React from 'react';
import { UIProject } from '../types/escrow';

interface ProjectSelectorProps {
  projects: UIProject[];
  currentProjectId: string;
  onSelectProject: (projectId: string) => void;
  onOpenCreateModal: () => void;
  activeAddress: string;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  currentProjectId,
  onSelectProject,
  onOpenCreateModal,
  activeAddress,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.75rem 1.25rem',
        marginBottom: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Simulated Construction Escrow:
        </span>

        <select
          className="input-text"
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', fontWeight: 600, minWidth: '280px' }}
          value={currentProjectId}
          onChange={e => onSelectProject(e.target.value)}
        >
          {projects.map(p => {
            const isOwner = p.owner === activeAddress;
            const isContractor = p.contractor === activeAddress;
            const isInspector = p.inspector === activeAddress;
            const isArbiter = p.arbiter === activeAddress;
            const roleTag = isOwner ? ' [Owner]' : isContractor ? ' [Contractor]' : isInspector ? ' [Inspector]' : isArbiter ? ' [Arbiter]' : '';

            return (
              <option key={p.id} value={p.id}>
                {p.title} (${p.totalCommitted.toLocaleString()} {p.paymentTokenSymbol}){roleTag}
              </option>
            );
          })}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Local demo registry: <strong>{projects.length} Projects</strong>
        </span>

        <button
          type="button"
          className="btn btn-primary"
          style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
          onClick={onOpenCreateModal}
        >
          + Create Simulated Project...
        </button>
      </div>
    </div>
  );
};
