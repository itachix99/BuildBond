import React from 'react';
import { RoleType, UIDispute, UIMilestone, UIProject } from '../types/escrow';

interface DisputeCenterProps {
  project: UIProject;
  activeRole: RoleType;
  onOpenDisputeModal: (milestone: UIMilestone) => void;
  onOpenArbitrationModal: (dispute: UIDispute) => void;
  isBusy: boolean;
}

export const DisputeCenter: React.FC<DisputeCenterProps> = ({
  project,
  activeRole,
  onOpenDisputeModal,
  onOpenArbitrationModal,
  isBusy,
}) => {
  const disputesList = Object.values(project.disputes);
  const isArbiter = activeRole === 'Arbiter';
  const isOwnerOrContractor = activeRole === 'Owner' || activeRole === 'Contractor';

  // Find milestones that can be disputed (Submitted, Rejected, InDefectPeriod, Funded)
  const eligibleMilestones = project.milestones.filter(m =>
    (m.status === 'Submitted' || m.status === 'Rejected' || m.status === 'InDefectPeriod' || m.status === 'Funded') &&
    !project.disputes[m.id]?.status
  );

  return (
    <div className="card dispute-center-card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Construction Dispute & Neutral Arbitration Center</h2>
          <p className="card-subtitle">
            Local simulation of bounded dispute resolution, defect timer freezing, and neutral arbiter split awards.
          </p>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="accounting-metrics-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="metric-box warning">
          <div className="metric-label">Active Disputes</div>
          <div className="metric-value">{disputesList.filter(d => d.status === 'Open').length}</div>
          <div className="metric-hint">Awaiting arbitration ruling</div>
        </div>

        <div className="metric-box highlight">
          <div className="metric-label">Frozen In Dispute</div>
          <div className="metric-value">{project.accounting.disputed.toLocaleString()} <span>{project.paymentTokenSymbol}</span></div>
          <div className="metric-hint">Marked frozen in local demo state</div>
        </div>

        <div className="metric-box success">
          <div className="metric-label">Resolved Disputes</div>
          <div className="metric-value">{disputesList.filter(d => d.status === 'Resolved').length}</div>
          <div className="metric-hint">Simulated awards applied locally</div>
        </div>
      </div>

      {/* Active Disputes List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Dispute Records ({disputesList.length})
        </h3>

        {disputesList.length === 0 ? (
          <div className="empty-logs" style={{ padding: '2rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
            No active disputes on this project. All deliverables progressing normally.
          </div>
        ) : (
          disputesList.map(dispute => {
            const milestone = project.milestones.find(m => m.id === dispute.milestoneId);
            const isOpen = dispute.status === 'Open';

            return (
              <div
                key={dispute.milestoneId}
                className="card"
                style={{
                  background: 'var(--bg-surface-elevated)',
                  borderColor: isOpen ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Milestone #{dispute.milestoneId}: {milestone?.title}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Initiated by <strong>{dispute.initiatorRole}</strong> at {new Date(dispute.openedAt * 1000).toLocaleString()}
                    </span>
                  </div>

                  <span className={`status-pill ${isOpen ? 'danger' : 'success'}`}>
                    {isOpen ? 'Open Dispute (Frozen)' : 'Resolved by Arbiter ✓'}
                  </span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <strong>Initiator Claim:</strong> "{dispute.reasonText}"
                  </div>
                  <div style={{ color: 'var(--accent-blue)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                    Reason Digest: {dispute.reasonHash.slice(0, 20)}...
                  </div>
                </div>

                {isOpen ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Frozen Custody: <strong>{dispute.amountDisputed.toLocaleString()} {project.paymentTokenSymbol}</strong>
                    </span>

                    {isArbiter ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ background: 'var(--color-purple-500)', color: '#ffffff' }}
                        onClick={() => onOpenArbitrationModal(dispute)}
                        disabled={isBusy}
                      >
                        ⚖️ Conduct Arbitration Ruling...
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Awaiting neutral arbiter hearing & ruling
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      <span>Award to Contractor: <strong style={{ color: 'var(--color-emerald-400)' }}>+{dispute.contractorAward.toLocaleString()} {project.paymentTokenSymbol}</strong></span>
                      <span>Refund to Owner: <strong style={{ color: 'var(--color-blue-400)' }}>+{dispute.ownerRefund.toLocaleString()} {project.paymentTokenSymbol}</strong></span>
                    </div>
                    {dispute.reportNotes && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                        Ruling: "{dispute.reportNotes}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Option to Open Dispute on Eligible Milestones */}
      {isOwnerOrContractor && eligibleMilestones.length > 0 && (
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            ELIGIBLE MILESTONES FOR FORMAL DISPUTE:
          </h4>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {eligibleMilestones.map(m => (
              <button
                key={m.id}
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.8125rem', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                onClick={() => onOpenDisputeModal(m)}
                disabled={isBusy}
              >
                ⚠️ Open Dispute on #{m.id}: {m.title.slice(0, 24)}...
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
