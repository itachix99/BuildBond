import React, { useState, useEffect } from 'react';
import { UIMilestone, UIProject } from '../types/escrow';
import { computeReportHash } from '../utils/crypto';

interface InspectionModalProps {
  project: UIProject;
  milestone: UIMilestone;
  onClose: () => void;
  onInspect: (milestoneId: number, decision: 'Approve' | 'Reject', notes: string) => Promise<void>;
  isBusy: boolean;
}

export const InspectionModal: React.FC<InspectionModalProps> = ({
  project,
  milestone,
  onClose,
  onInspect,
  isBusy,
}) => {
  const [decision, setDecision] = useState<'Approve' | 'Reject'>('Approve');
  const [notes, setNotes] = useState<string>('All physical site specifications verified against approved building plans. Quality standards satisfied.');
  const [reportHash, setReportHash] = useState<string>('');

  useEffect(() => {
    let active = true;
    computeReportHash(milestone.id, decision, notes).then(hash => {
      if (active) setReportHash(hash);
    });
    return () => { active = false; };
  }, [milestone.id, decision, notes]);

  const retainageAmount = Math.floor((milestone.amount * project.retainageBps) / 10000);
  const immediateAmount = milestone.amount - retainageAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;
    await onInspect(milestone.id, decision, notes);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3 className="modal-title">Independent Engineering Inspection Certification</h3>
        <p className="modal-desc">
          Review the contractor's submitted deliverable evidence and issue an irrevocable on-chain certification.
        </p>

        <div className="milestone-target-summary">
          <strong>Inspecting Deliverable:</strong> {milestone.title} ({milestone.amount.toLocaleString()} {project.paymentTokenSymbol})
        </div>

        {milestone.evidenceHash && (
          <div className="evidence-review-box">
            <span className="ev-label">Submitted Evidence Hash:</span>
            <code>{milestone.evidenceHash}</code>
            {milestone.evidenceNotes && (
              <div className="ev-note">"{milestone.evidenceNotes}"</div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Decision Selection */}
          <div className="decision-radio-group">
            <label className={`radio-label ${decision === 'Approve' ? 'selected success' : ''}`}>
              <input
                type="radio"
                name="decision"
                value="Approve"
                checked={decision === 'Approve'}
                onChange={() => setDecision('Approve')}
              />
              <div>
                <strong>Approve Milestone</strong>
                <p>Passes inspection. Unlocks immediate payout and starts defect clock.</p>
              </div>
            </label>

            <label className={`radio-label ${decision === 'Reject' ? 'selected danger' : ''}`}>
              <input
                type="radio"
                name="decision"
                value="Reject"
                checked={decision === 'Reject'}
                onChange={() => setDecision('Reject')}
              />
              <div>
                <strong>Reject / Require Rework</strong>
                <p>Fails criteria. Contractor must rectify defects and resubmit.</p>
              </div>
            </label>
          </div>

          {/* Retainage Calculation Preview (Approve) */}
          {decision === 'Approve' && (
            <div className="approval-split-preview">
              <div className="split-row">
                <span>Immediate Contractor Earnings (90%):</span>
                <strong>+{immediateAmount.toLocaleString()} {project.paymentTokenSymbol}</strong>
              </div>
              <div className="split-row">
                <span>Locked Retainage (10%):</span>
                <strong>+{retainageAmount.toLocaleString()} {project.paymentTokenSymbol}</strong>
              </div>
              <div className="split-row-sub">
                🛡️ Starts {project.defectPeriodDays}-day defect liability countdown before retainage can be claimed.
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Inspection Certification Report Notes</label>
            <textarea
              className="input-textarea"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="live-hash-preview">
            <span className="hash-title">Certification Report SHA-256 Digest:</span>
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
              className={`btn ${decision === 'Approve' ? 'btn-success' : 'btn-danger'}`}
              disabled={isBusy || !notes.trim()}
            >
              {isBusy
                ? 'Recording Certification...'
                : decision === 'Approve'
                  ? `Certify & Unlock $${immediateAmount.toLocaleString()} ${project.paymentTokenSymbol}`
                  : 'Issue Rejection Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
