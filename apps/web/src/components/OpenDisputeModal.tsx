import React, { useState, useEffect } from 'react';
import { UIMilestone, UIProject } from '../types/escrow';
import { computeReportHash } from '../utils/crypto';

interface OpenDisputeModalProps {
  project: UIProject;
  milestone: UIMilestone;
  onClose: () => void;
  onOpenDispute: (milestoneId: number, reason: string) => Promise<void>;
  isBusy: boolean;
}

export const OpenDisputeModal: React.FC<OpenDisputeModalProps> = ({
  project,
  milestone,
  onClose,
  onOpenDispute,
  isBusy,
}) => {
  const [reason, setReason] = useState<string>('');
  const [reasonHash, setReasonHash] = useState<string>('');

  useEffect(() => {
    let active = true;
    computeReportHash(milestone.id, 'Reject', reason || 'dispute_reason').then(hash => {
      if (active) setReasonHash(hash);
    });
    return () => { active = false; };
  }, [milestone.id, reason]);

  const disputedAmount = milestone.status === 'InDefectPeriod'
    ? milestone.retainageAmount - milestone.retainedReleased
    : milestone.amount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    await onOpenDispute(milestone.id, reason);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3 className="modal-title">Initiate Formal Construction Dispute</h3>
        <p className="modal-desc">
          Opening a formal dispute freezes the deliverable's funds in smart contract custody, pauses defect liability timers, and refers the matter to the neutral arbiter.
        </p>

        <div className="milestone-target-summary" style={{ borderLeftColor: 'var(--accent-rose)' }}>
          <strong>Disputed Deliverable:</strong> #{milestone.id} - {milestone.title} (${disputedAmount.toLocaleString()} {project.paymentTokenSymbol})
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Statement of Dispute & Non-Conformance</label>
            <textarea
              className="input-textarea"
              placeholder="State the factual basis of the dispute (e.g. concrete cylinder test failure, unauthorized material substitution, failure to complete punch-list items within deadline)..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="live-hash-preview">
            <span className="hash-title">Dispute Reason SHA-256 Digest:</span>
            <code>{reasonHash}</code>
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
              className="btn btn-danger"
              disabled={isBusy || !reason.trim()}
            >
              {isBusy ? 'Freezing Funds on Testnet...' : `Freeze $${disputedAmount.toLocaleString()} & Open Dispute`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
