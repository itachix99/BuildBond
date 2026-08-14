import React, { useState } from 'react';
import { RoleType, UIProject } from '../types/escrow';

interface FundingWorkspaceProps {
  project: UIProject;
  activeRole: RoleType;
  onDeposit: (amount: number) => Promise<void>;
  isBusy: boolean;
}

export const FundingWorkspace: React.FC<FundingWorkspaceProps> = ({
  project,
  activeRole,
  onDeposit,
  isBusy,
}) => {
  const [customAmount, setCustomAmount] = useState<string>('25000');
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);

  const { accounting, totalCommitted, paymentTokenSymbol } = project;
  const coverageRatio = totalCommitted > 0
    ? Math.min(100, Math.round((accounting.allocated / totalCommitted) * 100))
    : 0;

  const unallocated = accounting.deposited - accounting.allocated - accounting.contractorPayable - accounting.retainageLocked - accounting.withdrawn;

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customAmount);
    if (isNaN(val) || val <= 0) return;
    await onDeposit(val);
    setShowDepositModal(false);
  };

  const isOwner = activeRole === 'Owner';

  return (
    <div className="card funding-workspace-card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Escrow Custody & Live Coverage</h2>
          <p className="card-subtitle">
            SEP-41 stablecoin escrow reserves backing construction milestones with guaranteed payment solvency.
          </p>
        </div>
        {isOwner && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowDepositModal(true)}
            disabled={isBusy}
          >
            + Deposit {paymentTokenSymbol}
          </button>
        )}
      </div>

      {/* Coverage Progress Bar */}
      <div className="coverage-bar-wrapper">
        <div className="coverage-bar-labels">
          <span className="coverage-status-text">
            <strong>Milestone Coverage:</strong> {coverageRatio}% ({accounting.allocated.toLocaleString()} / {totalCommitted.toLocaleString()} {paymentTokenSymbol})
          </span>
          <span className={`coverage-pill ${coverageRatio === 100 ? 'full' : 'partial'}`}>
            {coverageRatio === 100 ? 'Fully Funded (100%)' : `${coverageRatio}% Covered`}
          </span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${coverageRatio}%`,
              backgroundColor: coverageRatio === 100 ? 'var(--color-emerald-500)' : 'var(--color-blue-500)',
            }}
          />
        </div>
      </div>

      {/* Financial Accounting Grid */}
      <div className="accounting-metrics-grid">
        <div className="metric-box">
          <div className="metric-label">Total Committed</div>
          <div className="metric-value">{totalCommitted.toLocaleString()} <span>{paymentTokenSymbol}</span></div>
          <div className="metric-hint">Fixed contract terms</div>
        </div>

        <div className="metric-box highlight">
          <div className="metric-label">Escrow Custody</div>
          <div className="metric-value">{accounting.deposited.toLocaleString()} <span>{paymentTokenSymbol}</span></div>
          <div className="metric-hint">Total deposited to date</div>
        </div>

        <div className="metric-box">
          <div className="metric-label">Allocated to Milestones</div>
          <div className="metric-value">{accounting.allocated.toLocaleString()} <span>{paymentTokenSymbol}</span></div>
          <div className="metric-hint">Reserved for pending work</div>
        </div>

        <div className="metric-box success">
          <div className="metric-label">Contractor Payable</div>
          <div className="metric-value">{accounting.contractorPayable.toLocaleString()} <span>{paymentTokenSymbol}</span></div>
          <div className="metric-hint">Earned & ready to withdraw</div>
        </div>

        <div className="metric-box warning">
          <div className="metric-label">Retainage Locked</div>
          <div className="metric-value">{accounting.retainageLocked.toLocaleString()} <span>{paymentTokenSymbol}</span></div>
          <div className="metric-hint">10% in defect liability clock</div>
        </div>

        <div className="metric-box">
          <div className="metric-label">Unallocated / Refundable</div>
          <div className="metric-value">{Math.max(0, unallocated).toLocaleString()} <span>{paymentTokenSymbol}</span></div>
          <div className="metric-hint">Available for new milestones</div>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 className="modal-title">Deposit {paymentTokenSymbol} into Escrow</h3>
            <p className="modal-desc">
              Deposited funds will be locked in the Soroban escrow contract and auto-allocated to milestones in sequence.
            </p>
            <form onSubmit={handleDepositSubmit}>
              <div className="form-group">
                <label className="form-label">Deposit Amount ({paymentTokenSymbol})</label>
                <input
                  type="number"
                  className="input-text"
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                  min="1"
                  step="1000"
                  required
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="presets-row">
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => setCustomAmount('10000')}
                >
                  $10,000
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => setCustomAmount('25000')}
                >
                  $25,000 (M1)
                </button>
                <button
                  type="button"
                  className="preset-btn highlight"
                  onClick={() => setCustomAmount('60000')}
                >
                  $60,000 (100% Full)
                </button>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDepositModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isBusy || parseFloat(customAmount) <= 0}
                >
                  {isBusy ? 'Processing Deposit...' : `Confirm Deposit of $${parseFloat(customAmount || '0').toLocaleString()} ${paymentTokenSymbol}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
