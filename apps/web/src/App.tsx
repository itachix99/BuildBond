import React, { useState } from 'react';
import { useFreighter } from './hooks/useFreighter';
import { useAccountBalance } from './hooks/useAccountBalance';
import { useEscrowWorkflow } from './hooks/useEscrowWorkflow';
import { WalletConnect } from './components/WalletConnect';
import { DirectPaymentModal } from './components/DirectPaymentModal';
import { RoleSwitcher } from './components/RoleSwitcher';
import { ProjectSelector } from './components/ProjectSelector';
import { CreateProjectModal } from './components/CreateProjectModal';
import { RoleAcceptanceCard } from './components/RoleAcceptanceCard';
import { FundingWorkspace } from './components/FundingWorkspace';
import { MilestoneList } from './components/MilestoneList';
import { MilestoneEvidenceModal } from './components/MilestoneEvidenceModal';
import { InspectionModal } from './components/InspectionModal';
import { WithdrawalHub } from './components/WithdrawalHub';
import { DisputeCenter } from './components/DisputeCenter';
import { OpenDisputeModal } from './components/OpenDisputeModal';
import { ArbitrationModal } from './components/ArbitrationModal';
import { TransactionAuditDrawer } from './components/TransactionAuditDrawer';
import { UIDispute, UIMilestone } from './types/escrow';

type TabType = 'milestones' | 'acceptance' | 'funding' | 'payouts' | 'disputes';

export const App: React.FC = () => {
  const freighter = useFreighter();
  const balance = useAccountBalance(freighter.publicKey);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('milestones');

  const [activeEvidenceMilestone, setActiveEvidenceMilestone] = useState<UIMilestone | null>(null);
  const [activeInspectionMilestone, setActiveInspectionMilestone] = useState<UIMilestone | null>(null);
  const [activeDisputeMilestone, setActiveDisputeMilestone] = useState<UIMilestone | null>(null);
  const [activeArbitrationDispute, setActiveArbitrationDispute] = useState<UIDispute | null>(null);

  const escrow = useEscrowWorkflow(freighter.publicKey);
  const openDisputesCount = Object.values(escrow.project.disputes).filter(d => d.status === 'Open').length;

  return (
    <div className="container">
      {/* App Header */}
      <header className="header">
        <div className="logo-group">
          <div className="logo-badge">BB</div>
          <div>
            <h1 className="logo-title">BuildBond</h1>
            <p className="logo-subtitle">
              Milestone Escrow, Retainage & Defect Liability Settlement on Stellar
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsPaymentModalOpen(true)}
            disabled={!freighter.isConnected}
            style={{ fontSize: '0.8125rem' }}
          >
            Direct XLM Pay
          </button>

          <WalletConnect
            isInstalled={freighter.isInstalled}
            isConnected={freighter.isConnected}
            publicKey={freighter.publicKey}
            network={freighter.network}
            isTestnet={freighter.isTestnet}
            nativeBalance={balance.nativeBalance}
            isLoading={freighter.isLoading}
            isBalanceLoading={balance.isLoading}
            error={freighter.error}
            onConnect={freighter.connect}
            onDisconnect={freighter.disconnect}
            onRefresh={balance.refresh}
          />
        </div>
      </header>

      {/* Interactive Role Switcher & Clock Simulator */}
      <RoleSwitcher
        activeRole={escrow.activeRole}
        onSelectRole={escrow.setActiveRole}
        activePersona={escrow.activePersona}
        activeAddress={escrow.activeAddress}
        freighterAddress={freighter.publicKey}
        useFreighterWallet={escrow.useFreighterWallet}
        onToggleFreighter={escrow.setUseFreighterWallet}
        simulatedTimeOffsetSecs={escrow.simulatedTimeOffsetSecs}
        onFastForwardDays={escrow.fastForwardDays}
        onResetDemo={escrow.resetDemo}
      />

      {/* Multi-Project Factory Selector Bar */}
      <ProjectSelector
        projects={escrow.projects}
        currentProjectId={escrow.activeProjectId}
        onSelectProject={escrow.selectProject}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        activeAddress={escrow.activeAddress}
      />

      {/* Active Escrow Project Banner */}
      <section className="project-banner-card">
        <div className="project-banner-main">
          <div className="project-tags">
            <span className="badge badge-blue">Soroban Escrow</span>
            <span className={`status-pill ${escrow.project.status === 'Active' ? 'success' : escrow.project.status === 'Suspended' ? 'danger' : 'warning'}`}>
              Status: {escrow.project.status}
            </span>
            <span className="badge badge-amber">{escrow.project.paymentTokenSymbol} Settlement</span>
            {openDisputesCount > 0 && (
              <span className="status-pill danger">⚠️ {openDisputesCount} Active Dispute</span>
            )}
          </div>
          <h2 className="project-title">{escrow.project.title}</h2>
          <div className="project-meta">
            <span>📍 {escrow.project.location}</span>
            <span>•</span>
            <span>Contract: <code>{escrow.project.contractAddress.slice(0, 10)}...{escrow.project.contractAddress.slice(-6)}</code></span>
            <span>•</span>
            <span>Commitment: <strong>{escrow.project.totalCommitted.toLocaleString()} {escrow.project.paymentTokenSymbol}</strong></span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'milestones' ? 'active' : ''}`}
            onClick={() => setActiveTab('milestones')}
          >
            📋 Milestones ({escrow.project.milestones.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'acceptance' ? 'active' : ''}`}
            onClick={() => setActiveTab('acceptance')}
          >
            ✍️ Role Signatures
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'funding' ? 'active' : ''}`}
            onClick={() => setActiveTab('funding')}
          >
            💎 Escrow & Coverage ({escrow.project.accounting.deposited.toLocaleString()} {escrow.project.paymentTokenSymbol})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'payouts' ? 'active' : ''}`}
            onClick={() => setActiveTab('payouts')}
          >
            💰 Payouts & Retainage ({escrow.project.accounting.contractorPayable.toLocaleString()} {escrow.project.paymentTokenSymbol})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'disputes' ? 'active' : ''}`}
            onClick={() => setActiveTab('disputes')}
          >
            ⚖️ Arbitration {openDisputesCount > 0 ? `(${openDisputesCount})` : ''}
          </button>
        </div>
      </section>

      {/* Main Tab Views */}
      <main className="tab-content">
        {activeTab === 'milestones' && (
          <MilestoneList
            project={escrow.project}
            activeRole={escrow.activeRole}
            simulatedLedgerTimestamp={escrow.simulatedLedgerTimestamp}
            onOpenEvidenceModal={setActiveEvidenceMilestone}
            onOpenInspectionModal={setActiveInspectionMilestone}
            onClaimRetainage={escrow.claimRetainage}
            isBusy={escrow.isBusy}
          />
        )}

        {activeTab === 'acceptance' && (
          <RoleAcceptanceCard
            project={escrow.project}
            activeRole={escrow.activeRole}
            onAcceptRole={escrow.acceptRole}
            onDeclineRole={escrow.declineRole}
            isBusy={escrow.isBusy}
          />
        )}

        {activeTab === 'funding' && (
          <FundingWorkspace
            project={escrow.project}
            activeRole={escrow.activeRole}
            onDeposit={escrow.depositFunds}
            isBusy={escrow.isBusy}
          />
        )}

        {activeTab === 'payouts' && (
          <WithdrawalHub
            project={escrow.project}
            activeRole={escrow.activeRole}
            simulatedLedgerTimestamp={escrow.simulatedLedgerTimestamp}
            onWithdrawEarned={escrow.withdrawEarned}
            onClaimRetainage={escrow.claimRetainage}
            onFastForwardDays={escrow.fastForwardDays}
            isBusy={escrow.isBusy}
          />
        )}

        {activeTab === 'disputes' && (
          <DisputeCenter
            project={escrow.project}
            activeRole={escrow.activeRole}
            onOpenDisputeModal={setActiveDisputeMilestone}
            onOpenArbitrationModal={setActiveArbitrationDispute}
            isBusy={escrow.isBusy}
          />
        )}
      </main>

      {/* Contractor Evidence Submission Modal */}
      {activeEvidenceMilestone && (
        <MilestoneEvidenceModal
          milestone={activeEvidenceMilestone}
          onClose={() => setActiveEvidenceMilestone(null)}
          onSubmit={escrow.submitMilestone}
          isBusy={escrow.isBusy}
        />
      )}

      {/* Independent Inspector Certification Modal */}
      {activeInspectionMilestone && (
        <InspectionModal
          project={escrow.project}
          milestone={activeInspectionMilestone}
          onClose={() => setActiveInspectionMilestone(null)}
          onInspect={escrow.inspectMilestone}
          isBusy={escrow.isBusy}
        />
      )}

      {/* Dispute Opening Modal (Owner / Contractor) */}
      {activeDisputeMilestone && (
        <OpenDisputeModal
          project={escrow.project}
          milestone={activeDisputeMilestone}
          onClose={() => setActiveDisputeMilestone(null)}
          onOpenDispute={escrow.openDispute}
          isBusy={escrow.isBusy}
        />
      )}

      {/* Neutral Arbitration Award Ruling Modal (Arbiter) */}
      {activeArbitrationDispute && (
        <ArbitrationModal
          project={escrow.project}
          dispute={activeArbitrationDispute}
          onClose={() => setActiveArbitrationDispute(null)}
          onResolveDispute={escrow.resolveDispute}
          isBusy={escrow.isBusy}
        />
      )}

      {/* Deploy Project Modal (Factory) */}
      {isCreateModalOpen && (
        <CreateProjectModal
          onClose={() => setIsCreateModalOpen(false)}
          onDeployProject={escrow.deployProject}
          isBusy={escrow.isBusy}
        />
      )}

      {/* Direct Level 1 Payment Rail Modal */}
      <DirectPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        sourcePublicKey={freighter.publicKey}
        availableBalance={balance.nativeBalance}
        onPaymentSuccess={() => balance.refresh()}
      />

      {/* On-Chain Transaction Audit Drawer */}
      <TransactionAuditDrawer logs={escrow.logs} />
    </div>
  );
};

export default App;
