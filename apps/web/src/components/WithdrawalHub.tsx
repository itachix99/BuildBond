import React, { useState } from 'react';
import { RoleType, UIProject } from '../types/escrow';

interface WithdrawalHubProps {
  project: UIProject;
  activeRole: RoleType;
  simulatedLedgerTimestamp: number;
  onWithdrawEarned: (amount: number) => Promise<void>;
  onClaimRetainage: (milestoneId: number) => Promise<void>;
  onFastForwardDays: (days: number) => void;
  isBusy: boolean;
}

export const WithdrawalHub: React.FC<WithdrawalHubProps> = ({
  project,
  activeRole,
  simulatedLedgerTimestamp,
  onWithdrawEarned,
  onClaimRetainage,
  onFastForwardDays,
  isBusy,
}) => {
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);

  const { accounting, paymentTokenSymbol } = project;
  const isContractor = activeRole === 'Contractor';

  const approvedMilestones = project.milestones.filter(m => m.status === 'InDefectPeriod' || m.status === 'Settled');

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(withdrawAmount);
    if (isNaN(val) || val <= 0 || val > accounting.contractorPayable) return;
    await onWithdrawEarned(val);
    setShowWithdrawModal(false);
    setWithdrawAmount('');
  };

  return (
    <div className="card withdrawal-hub-card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Contractor Payouts & Retainage Settlement</h2>
          <p className="card-subtitle">
            Pull-based immediate earnings withdrawal and defect liability retainage release.
          </p>
        </div>
        {isContractor && accounting.contractorPayable > 0 && (
          <button
            type="button"
            className="btn btn-success"
            onClick={() => {
              setWithdrawAmount(accounting.contractorPayable.toString());
              setShowWithdrawModal(true);
            }}
            disabled={isBusy}
          >
            Withdraw Earned ({accounting.contractorPayable.toLocaleString()} {paymentTokenSymbol})
          </button>
        )}
      </div>

      <div className="withdrawal-metrics-row">
        <div className="payout-card ready">
          <div className="payout-icon">💰</div>
          <div className="payout-info">
            <div className="payout-title">Immediate Payable Earnings</div>
            <div className="payout-amount">{accounting.contractorPayable.toLocaleString()} {paymentTokenSymbol}</div>
            <div className="payout-desc">
              {accounting.contractorPayable > 0
                ? 'Ready for instant pull withdrawal to contractor wallet.'
                : 'No approved immediate earnings awaiting withdrawal.'}
            </div>
          </div>
        </div>

        <div className="payout-card locked">
          <div className="payout-icon">🛡️</div>
          <div className="payout-info">
            <div className="payout-title">Locked Retainage Reserves</div>
            <div className="payout-amount">{accounting.retainageLocked.toLocaleString()} {paymentTokenSymbol}</div>
            <div className="payout-desc">
              Held in smart contract custody until {project.defectPeriodDays}-day defect liability periods mature.
            </div>
          </div>
        </div>

        <div className="payout-card history">
          <div className="payout-icon">🏦</div>
          <div className="payout-info">
            <div className="payout-title">Total Disbursed to Date</div>
            <div className="payout-amount">{accounting.withdrawn.toLocaleString()} {paymentTokenSymbol}</div>
            <div className="payout-desc">
              Cumulative earnings pulled from this escrow instance.
            </div>
          </div>
        </div>
      </div>

      {/* Retainage Breakdown per Milestone */}
      {approvedMilestones.length > 0 && (
        <div className="retainage-milestones-list">
          <div className="retainage-list-header">
            <h4>Active Defect Liability Retainage Schedules</h4>
            <button
              type="button"
              className="fast-forward-hint-btn"
              onClick={() => onFastForwardDays(project.defectPeriodDays)}
              title="Fast forward simulated time past defect liability period"
            >
              ⏩ Advance +{project.defectPeriodDays} Days
            </button>
          </div>

          <div className="retainage-items-grid">
            {approvedMilestones.map(m => {
              const defectDeadline = m.defectDeadlineAt || 0;
              const isMature = m.status === 'InDefectPeriod' && simulatedLedgerTimestamp >= defectDeadline;
              const isSettled = m.status === 'Settled';
              const remainingSecs = Math.max(0, defectDeadline - simulatedLedgerTimestamp);
              const remainingDays = Math.ceil(remainingSecs / 86400);

              return (
                <div key={m.id} className={`retainage-item ${isSettled ? 'settled' : isMature ? 'mature' : 'locked'}`}>
                  <div className="retainage-item-top">
                    <div>
                      <strong>Milestone #{m.id}: {m.title}</strong>
                      <div className="retainage-amount-label">
                        Locked Amount: {m.retainageAmount.toLocaleString()} {paymentTokenSymbol} (10%)
                      </div>
                    </div>
                    <div>
                      {isSettled ? (
                        <span className="status-pill success">Settled ✓</span>
                      ) : isMature ? (
                        <span className="status-pill info">Mature & Claimable</span>
                      ) : (
                        <span className="status-pill warning">{remainingDays} Days Left</span>
                      )}
                    </div>
                  </div>

                  {!isSettled && (
                    <div className="retainage-item-bottom">
                      <div className="deadline-text">
                        Release Date: {new Date(defectDeadline * 1000).toLocaleDateString()}
                      </div>
                      {isContractor && isMature && (
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => onClaimRetainage(m.id)}
                          disabled={isBusy}
                        >
                          Claim Retainage ({m.retainageAmount.toLocaleString()} {paymentTokenSymbol})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 className="modal-title">Withdraw Immediate Earnings</h3>
            <p className="modal-desc">
              Transfer approved earnings from the escrow contract directly into the contractor's wallet.
            </p>
            <form onSubmit={handleWithdrawSubmit}>
              <div className="form-group">
                <label className="form-label">Withdrawal Amount ({paymentTokenSymbol})</label>
                <input
                  type="number"
                  className="input-text"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  min="1"
                  max={accounting.contractorPayable}
                  required
                />
                <span className="input-hint">
                  Available to withdraw: {accounting.contractorPayable.toLocaleString()} {paymentTokenSymbol}
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowWithdrawModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={isBusy || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > accounting.contractorPayable}
                >
                  {isBusy ? 'Transferring...' : `Confirm Transfer of $${parseFloat(withdrawAmount || '0').toLocaleString()} ${paymentTokenSymbol}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
