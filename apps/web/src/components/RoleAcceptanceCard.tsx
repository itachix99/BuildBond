import React, { useState } from 'react';
import { DEMO_PERSONAS, RoleType, UIProject } from '../types/escrow';

interface RoleAcceptanceCardProps {
  project: UIProject;
  activeRole: RoleType;
  onAcceptRole: (role: RoleType) => Promise<void>;
  onDeclineRole: (role: RoleType, reason: string) => Promise<void>;
  isBusy: boolean;
}

export const RoleAcceptanceCard: React.FC<RoleAcceptanceCardProps> = ({
  project,
  activeRole,
  onAcceptRole,
  onDeclineRole,
  isBusy,
}) => {
  const [declineReason, setDeclineReason] = useState<string>('');
  const [showDeclineModal, setShowDeclineModal] = useState<boolean>(false);

  const roles: RoleType[] = ['Owner', 'Contractor', 'Inspector', 'Arbiter'];
  const activeAcceptance = project.acceptances[activeRole];
  const canAct = activeRole !== 'Owner' && !activeAcceptance?.accepted && !activeAcceptance?.declined;

  const handleDeclineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineReason.trim()) return;
    await onDeclineRole(activeRole, declineReason);
    setShowDeclineModal(false);
    setDeclineReason('');
  };

  return (
    <div className="card role-acceptance-card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Cryptographic Role Acceptance</h2>
          <p className="card-subtitle">
            All participants must explicitly verify and sign against the exact SHA-256 terms digest before construction begins.
          </p>
        </div>
        <div className="terms-hash-badge" title="Exact Canonical Terms Hash">
          <span className="hash-label">Terms Hash:</span>
          <code>{project.termsHash.slice(0, 16)}...{project.termsHash.slice(-8)}</code>
        </div>
      </div>

      {/* Role Acceptance Grid */}
      <div className="acceptance-grid">
        {roles.map(role => {
          const acc = project.acceptances[role];
          const persona = DEMO_PERSONAS[role];
          const isAccepted = acc?.accepted;
          const isDeclined = acc?.declined;

          return (
            <div
              key={role}
              className={`acceptance-item ${isAccepted ? 'accepted' : isDeclined ? 'declined' : 'pending'}`}
            >
              <div className="acceptance-item-header">
                <span className="role-avatar">{persona.avatar}</span>
                <span className="role-name">{role}</span>
                <span className={`status-pill ${isAccepted ? 'success' : isDeclined ? 'danger' : 'warning'}`}>
                  {isAccepted ? 'Accepted ✓' : isDeclined ? 'Declined ✗' : 'Pending'}
                </span>
              </div>
              <div className="acceptance-address">
                <code>{acc.actor ? `${acc.actor.slice(0, 8)}...${acc.actor.slice(-6)}` : 'Unassigned'}</code>
              </div>
              {isAccepted && acc.timestamp > 0 && (
                <div className="acceptance-time">
                  Signed at: {new Date(acc.timestamp * 1000).toLocaleTimeString()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Area for Active Role */}
      {canAct && (
        <div className="active-role-action-box">
          <div className="action-text">
            <span>You are currently operating as <strong>{activeRole}</strong>. Do you accept the escrow terms and milestone obligations?</span>
          </div>
          <div className="action-buttons">
            <button
              type="button"
              className="btn btn-secondary danger"
              onClick={() => setShowDeclineModal(true)}
              disabled={isBusy}
            >
              Decline Role...
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onAcceptRole(activeRole)}
              disabled={isBusy}
            >
              {isBusy ? 'Applying Simulation...' : `Accept Role (simulated) as ${activeRole}`}
            </button>
          </div>
        </div>
      )}

      {/* Decline Reason Modal */}
      {showDeclineModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 className="modal-title">Decline Role Invitation</h3>
            <p className="modal-desc">
              Declining this role will place the local demo project in <strong>Suspended</strong> status. Please provide a formal reason digest for the simulation log.
            </p>
            <form onSubmit={handleDeclineSubmit}>
              <textarea
                className="input-textarea"
                placeholder="Reason for declining terms (e.g. scope clarification needed, retainage percentage dispute)..."
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                rows={4}
                required
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeclineModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={isBusy || !declineReason.trim()}
                >
                  {isBusy ? 'Submitting...' : 'Confirm Role Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
