import React, { useState, useEffect } from 'react';
import { UIMilestone } from '../types/escrow';
import { computeEvidenceHash } from '../utils/crypto';

interface MilestoneEvidenceModalProps {
  milestone: UIMilestone;
  onClose: () => void;
  onSubmit: (milestoneId: number, description: string, fileName?: string) => Promise<void>;
  isBusy: boolean;
}

export const MilestoneEvidenceModal: React.FC<MilestoneEvidenceModalProps> = ({
  milestone,
  onClose,
  onSubmit,
  isBusy,
}) => {
  const [description, setDescription] = useState<string>('');
  const [fileName, setFileName] = useState<string>('site_inspection_report_core.pdf');
  const [liveHash, setLiveHash] = useState<string>('');

  useEffect(() => {
    let active = true;
    computeEvidenceHash(milestone.id, description || 'initial', fileName).then(hash => {
      if (active) setLiveHash(hash);
    });
    return () => { active = false; };
  }, [milestone.id, description, fileName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    await onSubmit(milestone.id, description, fileName);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3 className="modal-title">Submit Milestone #{milestone.id} Evidence</h3>
        <p className="modal-desc">
          Upload construction evidence documentation and photographs for independent engineering inspection.
        </p>

        <div className="milestone-target-summary">
          <strong>Deliverable:</strong> {milestone.title} (${milestone.amount.toLocaleString()})
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Evidence Documentation & Description</label>
            <textarea
              className="input-textarea"
              placeholder="Detail the work completed, materials used, batch numbers, concrete cylinder break test results, or welder certifications..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Attached Engineering File / Photo Archive</label>
            <input
              type="text"
              className="input-text"
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              placeholder="e.g. engineering_submittal_v1.pdf"
              required
            />
          </div>

          <div className="live-hash-preview">
            <span className="hash-title">Computed SHA-256 Digest (On-Chain Reference):</span>
            <code>{liveHash}</code>
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
              disabled={isBusy || !description.trim()}
            >
              {isBusy ? 'Signing Evidence...' : 'Submit Evidence on-chain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
