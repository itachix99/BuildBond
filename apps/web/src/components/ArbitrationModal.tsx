import React, { useState, useEffect } from 'react';
import { UIDispute, UIProject } from '../types/escrow';
import { computeReportHash } from '../utils/crypto';

interface ArbitrationModalProps {
  project: UIProject;
  dispute: UIDispute;
  onClose: () => void;
  onResolveDispute: (
    milestoneId: number,
    contractorAward: number,
    ownerRefund: number,
    reportNotes: string
  ) => Promise<void>;
  isBusy: boolean;
}

export const ArbitrationModal: React.FC<ArbitrationModalProps> = ({
  project,
  dispute,
  onClose,
  onResolveDispute,
  isBusy,
}) => {
  const totalDisputed = dispute.amountDisputed;
  const [contractorPercent, setContractorPercent] = useState<number>(70);
  const [notes, setNotes] = useState<string>(
    'Arbitration hearing completed. Contractor performed substantial core work with minor remedial deductions awarded to Owner.'
  );
  const [reportHash, setReportHash] = useState<string>('');

  const contractorAward = Math.round((totalDisputed * contractorPercent) / 100);
  const ownerRefund = totalDisputed - contractorAward;

  useEffect(() => {
    let active = true;
    computeReportHash(dispute.milestoneId, 'Approve', notes || 'arbitration_ruling').then(hash => {
      if (active) setReportHash(hash);
    });
    return () => { active = false; };
  }, [dispute.milestoneId, notes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;
    await onResolveDispute(dispute.milestoneId, contractorAward, ownerRefund, notes);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3 className="modal-title">Neutral Arbitration Ruling & Award Allocation</h3>
        <p className="modal-desc">
          Issue a binding on-chain award allocation dividing the frozen ${totalDisputed.toLocaleString()} {project.paymentTokenSymbol} between Contractor earnings and Owner refund.
        </p>

        <div className="milestone-target-summary" style={{ borderLeftColor: 'var(--color-purple-500)' }}>
          <strong>Dispute on Milestone #{dispute.milestoneId}:</strong> Initiated by {dispute.initiatorRole}
          <div style={{ marginTop: '0.25rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            "{dispute.reasonText}"
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Split Allocation Slider */}
          <div className="form-group">
            <label className="form-label">Award Distribution Slider</label>
            <input
              type="range"
              min="0"
              max="100"
              value={contractorPercent}
              onChange={e => setContractorPercent(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--color-purple-500)', height: '8px', cursor: 'pointer' }}
            />
          </div>

          <div className="approval-split-preview" style={{ background: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
            <div className="split-row">
              <span>Contractor Award ({contractorPercent}%):</span>
              <strong style={{ color: 'var(--color-emerald-400)' }}>
                +{contractorAward.toLocaleString()} {project.paymentTokenSymbol}
              </strong>
            </div>
            <div className="split-row">
              <span>Owner Refund ({100 - contractorPercent}%):</span>
              <strong style={{ color: 'var(--color-blue-400)' }}>
                +{ownerRefund.toLocaleString()} {project.paymentTokenSymbol}
              </strong>
            </div>
            <div className="split-row-sub">
              ⚖️ Invariant Verified: ${contractorAward.toLocaleString()} + ${ownerRefund.toLocaleString()} = ${totalDisputed.toLocaleString()} (100% Conserved).
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Arbitration Hearing Findings & Formal Ruling</label>
            <textarea
              className="input-textarea"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="live-hash-preview">
            <span className="hash-title">Arbitration Ruling SHA-256 Digest:</span>
            <code>{reportHash}</code>
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
              style={{ background: 'var(--color-purple-500)', color: '#ffffff' }}
              disabled={isBusy || !notes.trim()}
            >
              {isBusy ? 'Executing Binding Award...' : 'Issue Binding Award & Reallocate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
