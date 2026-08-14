import React from 'react';
import { MilestoneStage, RoleType, UIMilestone, UIProject } from '../types/escrow';

interface MilestoneListProps {
  project: UIProject;
  activeRole: RoleType;
  simulatedLedgerTimestamp: number;
  onOpenEvidenceModal: (milestone: UIMilestone) => void;
  onOpenInspectionModal: (milestone: UIMilestone) => void;
  onClaimRetainage: (milestoneId: number) => Promise<void>;
  isBusy: boolean;
}

export const MilestoneList: React.FC<MilestoneListProps> = ({
  project,
  activeRole,
  simulatedLedgerTimestamp,
  onOpenEvidenceModal,
  onOpenInspectionModal,
  onClaimRetainage,
  isBusy,
}) => {
  const getStatusBadge = (status: MilestoneStage) => {
    switch (status) {
      case 'Planned':
        return <span className="status-pill default">Planned</span>;
      case 'Funded':
        return <span className="status-pill info">Funded & Ready</span>;
      case 'Submitted':
        return <span className="status-pill warning">Under Inspection</span>;
      case 'Rejected':
        return <span className="status-pill danger">Rework Required</span>;
      case 'InDefectPeriod':
        return <span className="status-pill success">Approved / In Defect Clock</span>;
      case 'Settled':
        return <span className="status-pill purple">Settled & Completed ✓</span>;
      default:
        return <span className="status-pill default">{status}</span>;
    }
  };

  return (
    <div className="milestones-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Milestone Schedule & Verification Pipeline</h2>
          <p className="section-subtitle">
            Phased physical deliverables with cryptographic evidence hashes, independent certification, and defect liability clocks.
          </p>
        </div>
      </div>

      <div className="milestones-grid">
        {project.milestones.map((m, index) => {
          const isContractor = activeRole === 'Contractor';
          const isInspector = activeRole === 'Inspector';

          const canSubmitEvidence = isContractor && (m.status === 'Funded' || m.status === 'Rejected');
          const canInspect = isInspector && m.status === 'Submitted';

          // Defect liability timing calculation
          const defectDeadline = m.defectDeadlineAt || 0;
          const isDefectMature = m.status === 'InDefectPeriod' && simulatedLedgerTimestamp >= defectDeadline;
          const remainingSecs = Math.max(0, defectDeadline - simulatedLedgerTimestamp);
          const remainingDays = Math.ceil(remainingSecs / 86400);

          const canClaimRetainage = isContractor && m.status === 'InDefectPeriod' && isDefectMature && m.retainedReleased < m.retainageAmount;

          return (
            <div key={m.id} className={`milestone-card ${m.status.toLowerCase()}`}>
              <div className="milestone-card-top">
                <div className="milestone-number">
                  <span className="num-circle">{index + 1}</span>
                  <div>
                    <h3 className="milestone-name">{m.title}</h3>
                    <div className="milestone-id">ID: #{m.id} • Due: {new Date(m.dueAt * 1000).toLocaleDateString()}</div>
                  </div>
                </div>
                <div>{getStatusBadge(m.status)}</div>
              </div>

              <p className="milestone-description">{m.description}</p>

              {/* Financial Split Breakdown */}
              <div className="milestone-payout-breakdown">
                <div className="payout-row">
                  <span className="payout-label">Milestone Value:</span>
                  <span className="payout-val primary">{m.amount.toLocaleString()} {project.paymentTokenSymbol}</span>
                </div>
                <div className="payout-row-sub">
                  <span>Immediate (90%): <strong>{m.immediateAmount.toLocaleString()} {project.paymentTokenSymbol}</strong></span>
                  <span>Retainage Locked (10%): <strong>{m.retainageAmount.toLocaleString()} {project.paymentTokenSymbol}</strong></span>
                </div>
              </div>

              {/* Evidence Hash Display (if submitted) */}
              {m.evidenceHash && (
                <div className="evidence-digest-box">
                  <div className="digest-header">
                    <span>📄 Evidence Digest:</span>
                    <code>{m.evidenceHash.slice(0, 18)}...{m.evidenceHash.slice(-8)}</code>
                  </div>
                  {m.evidenceNotes && (
                    <div className="evidence-note">"{m.evidenceNotes}"</div>
                  )}
                </div>
              )}

              {/* Defect Liability Clock (if approved) */}
              {m.status === 'InDefectPeriod' && (
                <div className={`defect-clock-box ${isDefectMature ? 'mature' : 'ticking'}`}>
                  <div className="clock-header">
                    <span>🛡️ Defect Liability Clock ({project.defectPeriodDays} Days):</span>
                    <strong>{isDefectMature ? 'Matured & Claimable ✓' : `${remainingDays} Days Remaining`}</strong>
                  </div>
                  <div className="clock-bar">
                    <div
                      className="clock-progress"
                      style={{
                        width: isDefectMature ? '100%' : `${Math.min(100, Math.round(((project.defectPeriodDays * 86400 - remainingSecs) / (project.defectPeriodDays * 86400)) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="clock-sub">
                    Retainage locked: {m.retainageAmount.toLocaleString()} {project.paymentTokenSymbol} • Release: {new Date(defectDeadline * 1000).toLocaleDateString()}
                  </div>
                </div>
              )}

              {/* Settled Confirmation */}
              {m.status === 'Settled' && (
                <div className="settled-box">
                  <span>✓ 100% Settled: {m.amount.toLocaleString()} {project.paymentTokenSymbol} (Immediate: {m.immediateAmount.toLocaleString()} + Retainage: {m.retainedReleased.toLocaleString()})</span>
                </div>
              )}

              {/* Contextual Action Buttons */}
              <div className="milestone-actions">
                {canSubmitEvidence && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onOpenEvidenceModal(m)}
                    disabled={isBusy}
                  >
                    {m.status === 'Rejected' ? 'Resubmit Corrected Evidence...' : 'Submit Work Evidence...'}
                  </button>
                )}

                {canInspect && (
                  <button
                    type="button"
                    className="btn btn-warning"
                    onClick={() => onOpenInspectionModal(m)}
                    disabled={isBusy}
                  >
                    Inspect & Certify Milestone...
                  </button>
                )}

                {canClaimRetainage && (
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => onClaimRetainage(m.id)}
                    disabled={isBusy}
                  >
                    Claim Retainage ({m.retainageAmount.toLocaleString()} {project.paymentTokenSymbol})
                  </button>
                )}

                {!canSubmitEvidence && !canInspect && !canClaimRetainage && m.status === 'Planned' && (
                  <div className="hint-text">Awaiting project funding allocation</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
