import React, { useState } from 'react';
import { Role } from '@buildbond/shared';
import { formatAddress } from '../utils/stellar';

interface MilestonePreview {
  id: number;
  title: string;
  amount: number;
  retainageBps: number;
  defectDays: number;
  status: string;
}

const SAMPLE_MILESTONES: MilestonePreview[] = [
  {
    id: 1,
    title: 'Milestone 1: Foundation & Substructure',
    amount: 25000,
    retainageBps: 1000, // 10%
    defectDays: 90,
    status: 'Ready for Escrow Deposit',
  },
  {
    id: 2,
    title: 'Milestone 2: Framing & Structural Enclosure',
    amount: 35000,
    retainageBps: 1000, // 10%
    defectDays: 90,
    status: 'Planned',
  },
];

export const ProjectPreviewCard: React.FC<{ connectedAddress: string | null }> = ({
  connectedAddress,
}) => {
  const [selectedMilestone, setSelectedMilestone] = useState<number>(1);
  const milestone = SAMPLE_MILESTONES.find((m) => m.id === selectedMilestone) || SAMPLE_MILESTONES[0];

  const retainageAmount = Math.floor((milestone.amount * milestone.retainageBps) / 10000);
  const immediateAmount = milestone.amount - retainageAmount;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
            <span className="badge badge-amber">Demo Escrow Model</span>
            <span className="badge badge-blue">USD Stablecoin Rail</span>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            Civic Center Expansion — Project Escrow #101
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Contractual milestones with independent inspection certification and 10% retainage custody.
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
            TOTAL COMMITTED VALUE
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
            $60,000.00 USDC
          </span>
        </div>
      </div>

      {/* Role Separations */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
          background: 'var(--bg-surface-elevated)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8125rem',
        }}
      >
        <div>
          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>{Role.Owner}</span>
          <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>
            {connectedAddress ? formatAddress(connectedAddress, 3) : 'GA...OWNR'}
          </strong>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>{Role.Contractor}</span>
          <strong className="font-mono" style={{ color: 'var(--accent-amber)' }}>
            GC...CNTR
          </strong>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>{Role.Inspector}</span>
          <strong className="font-mono" style={{ color: 'var(--accent-emerald)' }}>
            GI...INSP
          </strong>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>{Role.Arbiter}</span>
          <strong className="font-mono" style={{ color: 'var(--accent-blue)' }}>
            GA...ARBT
          </strong>
        </div>
      </div>

      {/* Milestone Tabs */}
      <div>
        <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
          SELECT MILESTONE:
        </label>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {SAMPLE_MILESTONES.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMilestone(m.id)}
              className={`btn ${selectedMilestone === m.id ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}
            >
              {m.title} (${m.amount.toLocaleString()})
            </button>
          ))}
        </div>
      </div>

      {/* Milestone Breakdown Card */}
      <div
        style={{
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          background: 'var(--bg-surface-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{milestone.title}</h4>
            <span style={{ fontSize: '0.8125rem', color: 'var(--accent-emerald)' }}>
              Status: {milestone.status}
            </span>
          </div>
          <span className="badge badge-amber" style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}>
            ${milestone.amount.toLocaleString()}.00 USDC
          </span>
        </div>

        {/* Payment Split Formula */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            padding: '1rem',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              IMMEDIATE DISBURSEMENT (90%)
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
              ${immediateAmount.toLocaleString()}.00
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Transferred to contractor immediately upon independent inspector approval.
            </p>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              RETAINAGE LOCKED (10% = 1,000 bps)
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
              ${retainageAmount.toLocaleString()}.00
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Locked in escrow for {milestone.defectDays} days defect period. Automatically claimable upon timer expiry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
