import React, { useState, useEffect } from 'react';
import { DEMO_PERSONAS, UIProject } from '../types/escrow';
import { computeTermsHash } from '../utils/crypto';

interface CreateProjectModalProps {
  onClose: () => void;
  onDeployProject: (newProject: UIProject) => Promise<void>;
  isBusy: boolean;
}

interface NewMilestoneInput {
  title: string;
  amount: number;
  inspectionDeadlineDays: number;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  onClose,
  onDeployProject,
  isBusy,
}) => {
  const [title, setTitle] = useState('Denver Logistics Terminal - Cold Storage Hub');
  const [location, setLocation] = useState('Denver, CO');
  const [owner, setOwner] = useState(DEMO_PERSONAS.Owner.address);
  const [contractor, setContractor] = useState(DEMO_PERSONAS.Contractor.address);
  const [inspector, setInspector] = useState(DEMO_PERSONAS.Inspector.address);
  const [arbiter, setArbiter] = useState(DEMO_PERSONAS.Arbiter.address);
  const [paymentTokenSymbol, setPaymentTokenSymbol] = useState('USDC');
  const [retainageBps, setRetainageBps] = useState(1000); // 10%
  const [defectPeriodDays, setDefectPeriodDays] = useState(90);
  const [fundingPolicy, setFundingPolicy] = useState<'FullyFunded' | 'Rolling'>('FullyFunded');

  const [milestones, setMilestones] = useState<NewMilestoneInput[]>([
    { title: 'Excavation, Subsurface Utilities & Slab Pour', amount: 30000, inspectionDeadlineDays: 7 },
    { title: 'Structural Steel Erecting & Thermal Envelope', amount: 45000, inspectionDeadlineDays: 7 },
    { title: 'Refrigeration Plant Installation & Commissioning', amount: 25000, inspectionDeadlineDays: 14 },
  ]);

  const totalCommitted = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  const [termsHash, setTermsHash] = useState<string>('');

  useEffect(() => {
    let active = true;
    computeTermsHash({
      title,
      owner,
      contractor,
      inspector,
      arbiter,
      paymentToken: 'CUSDC7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7XTESTNET01',
      totalCommitted,
      retainageBps,
      defectPeriodDays,
      milestones: milestones.map((m, idx) => ({
        id: idx + 1,
        title: m.title,
        amount: m.amount,
        inspectionDeadlineDays: m.inspectionDeadlineDays,
      })),
    }).then(hash => {
      if (active) setTermsHash(hash);
    });
    return () => { active = false; };
  }, [title, owner, contractor, inspector, arbiter, totalCommitted, retainageBps, defectPeriodDays, milestones]);

  const handleAddMilestone = () => {
    setMilestones(prev => [
      ...prev,
      {
        title: `Milestone #${prev.length + 1} Deliverable`,
        amount: 15000,
        inspectionDeadlineDays: 7,
      },
    ]);
  };

  const handleRemoveMilestone = (index: number) => {
    if (milestones.length <= 1) return;
    setMilestones(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateMilestone = (index: number, field: keyof NewMilestoneInput, value: any) => {
    setMilestones(prev =>
      prev.map((m, idx) => (idx === index ? { ...m, [field]: value } : m))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || milestones.length === 0 || totalCommitted <= 0) return;

    const projectId = `bb-escrow-${Date.now().toString(36)}`;
    const randomContractAddr = `CBONDFAC${Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('')}`;

    const newProject: UIProject = {
      id: projectId,
      title,
      location,
      contractAddress: randomContractAddr,
      status: 'AwaitingAcceptance',
      termsHash,
      owner,
      contractor,
      inspector,
      arbiter,
      paymentTokenSymbol,
      paymentTokenAddress: 'CUSDC7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7XTESTNET01',
      totalCommitted,
      retainageBps,
      defectPeriodDays,
      fundingPolicy,
      createdAt: Math.floor(Date.now() / 1000),
      milestones: milestones.map((m, idx) => ({
        id: idx + 1,
        title: m.title,
        description: `Construction deliverable specifications for ${m.title}.`,
        amount: Number(m.amount),
        immediateAmount: 0,
        retainageAmount: 0,
        status: 'Planned',
        dueAt: Math.floor(Date.now() / 1000) + (idx + 1) * 30 * 86400,
        inspectionDeadlineSecs: m.inspectionDeadlineDays * 86400,
        retainedReleased: 0,
      })),
      acceptances: {
        Owner: {
          role: 'Owner',
          actor: owner,
          accepted: true,
          declined: false,
          timestamp: Math.floor(Date.now() / 1000),
          termsHash,
        },
        Contractor: {
          role: 'Contractor',
          actor: contractor,
          accepted: false,
          declined: false,
          timestamp: 0,
        },
        Inspector: {
          role: 'Inspector',
          actor: inspector,
          accepted: false,
          declined: false,
          timestamp: 0,
        },
        Arbiter: {
          role: 'Arbiter',
          actor: arbiter,
          accepted: false,
          declined: false,
          timestamp: 0,
        },
      },
      accounting: {
        deposited: 0,
        committed: totalCommitted,
        allocated: 0,
        contractorPayable: 0,
        retainageLocked: 0,
        disputed: 0,
        ownerRefundable: 0,
        withdrawn: 0,
      },
      disputes: {},
    };

    await onDeployProject(newProject);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '680px' }}>
        <h3 className="modal-title">Deploy Dedicated Escrow Project via Factory</h3>
        <p className="modal-desc">
          Deploy an isolated, unhackable Soroban escrow contract instance initialized with cryptographic terms and multi-stage deliverable schedule.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Project Title</label>
              <input
                type="text"
                className="input-text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                type="text"
                className="input-text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Contractor Address</label>
              <input
                type="text"
                className="input-text"
                value={contractor}
                onChange={e => setContractor(e.target.value)}
                style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Inspector Address</label>
              <input
                type="text"
                className="input-text"
                value={inspector}
                onChange={e => setInspector(e.target.value)}
                style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Owner Address</label>
              <input
                type="text"
                className="input-text"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Neutral Arbiter Address</label>
              <input
                type="text"
                className="input-text"
                value={arbiter}
                onChange={e => setArbiter(e.target.value)}
                style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Token</label>
              <select
                className="input-text"
                value={paymentTokenSymbol}
                onChange={e => setPaymentTokenSymbol(e.target.value)}
              >
                <option value="USDC">USDC (simulation)</option>
                <option value="XLM">Native XLM</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Retainage</label>
              <select
                className="input-text"
                value={retainageBps}
                onChange={e => setRetainageBps(parseInt(e.target.value, 10))}
              >
                <option value={500}>5% (500 bps)</option>
                <option value={1000}>10% (1,000 bps)</option>
                <option value={1500}>15% (1,500 bps)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Defect Clock</label>
              <select
                className="input-text"
                value={defectPeriodDays}
                onChange={e => setDefectPeriodDays(parseInt(e.target.value, 10))}
              >
                <option value={30}>30 Days</option>
                <option value={90}>90 Days</option>
                <option value={180}>180 Days</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Funding</label>
              <select
                className="input-text"
                value={fundingPolicy}
                onChange={e => setFundingPolicy(e.target.value as any)}
              >
                <option value="FullyFunded">Fully Funded</option>
                <option value="Rolling">Rolling</option>
              </select>
            </div>
          </div>

          {/* Milestone Schedule */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                Deliverables ({milestones.length} Milestones — Total: ${totalCommitted.toLocaleString()} {paymentTokenSymbol})
              </label>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                onClick={handleAddMilestone}
              >
                + Add Milestone
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
              {milestones.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 2fr 1fr 1fr auto',
                    gap: '0.5rem',
                    alignItems: 'center',
                    background: 'var(--bg-surface-elevated)',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>#{idx + 1}</span>
                  <input
                    type="text"
                    className="input-text"
                    style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                    value={m.title}
                    onChange={e => handleUpdateMilestone(idx, 'title', e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    className="input-text"
                    style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                    value={m.amount}
                    onChange={e => handleUpdateMilestone(idx, 'amount', parseInt(e.target.value, 10) || 0)}
                    min={100}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.inspectionDeadlineDays}d Insp.</span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontSize: '0.875rem' }}
                    onClick={() => handleRemoveMilestone(idx)}
                    disabled={milestones.length <= 1}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="live-hash-preview">
            <span className="hash-title">Canonical Terms SHA-256 Digest:</span>
            <code>{termsHash}</code>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isBusy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isBusy || totalCommitted <= 0}
            >
              {isBusy ? 'Creating Simulation...' : `Create Simulated Escrow ($${totalCommitted.toLocaleString()} ${paymentTokenSymbol})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
