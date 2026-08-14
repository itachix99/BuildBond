import { useState, useCallback, useMemo } from 'react';
import {
  DEMO_PERSONAS,
  RolePersona,
  RoleType,
  TransactionLog,
  UIProject,
} from '../types/escrow';
import { computeEvidenceHash, computeReportHash } from '../utils/crypto';

export const INITIAL_PROJECT: UIProject = {
  id: 'bb-escrow-austin-phase1',
  title: 'Austin Innovation Center - Phase 1 Core & Shell',
  location: 'Austin, Texas, USA',
  contractAddress: 'CCBUILDBONDESCROW7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X99',
  status: 'AwaitingAcceptance',
  termsHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  owner: DEMO_PERSONAS.Owner.address,
  contractor: DEMO_PERSONAS.Contractor.address,
  inspector: DEMO_PERSONAS.Inspector.address,
  arbiter: DEMO_PERSONAS.Arbiter.address,
  paymentTokenSymbol: 'USDC',
  paymentTokenAddress: 'CUSDC7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7XTESTNET01',
  totalCommitted: 60000,
  retainageBps: 1000, // 10%
  defectPeriodDays: 90,
  fundingPolicy: 'FullyFunded',
  createdAt: Date.now() - 3600000,
  milestones: [
    {
      id: 1,
      title: 'Foundation & Subsurface Concrete Pour',
      description: 'Excavation, grading, moisture barrier installation, rebar cage reinforcement, and certified high-strength 4000 PSI concrete pour.',
      amount: 25000,
      immediateAmount: 22500,
      retainageAmount: 2500,
      status: 'Planned',
      dueAt: Math.floor(Date.now() / 1000) + 14 * 86400,
      inspectionDeadlineSecs: 7 * 86400,
      retainedReleased: 0,
    },
    {
      id: 2,
      title: 'Structural Steel Framing & Shear Walls',
      description: 'Erection of heavy structural steel columns, beams, composite metal deck framing, torque-checked bolt connections, and certified welding inspections.',
      amount: 35000,
      immediateAmount: 31500,
      retainageAmount: 3500,
      status: 'Planned',
      dueAt: Math.floor(Date.now() / 1000) + 35 * 86400,
      inspectionDeadlineSecs: 7 * 86400,
      retainedReleased: 0,
    },
  ],
  acceptances: {
    Owner: {
      role: 'Owner',
      actor: DEMO_PERSONAS.Owner.address,
      accepted: true,
      declined: false,
      timestamp: Math.floor(Date.now() / 1000) - 3600,
      termsHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
    Contractor: {
      role: 'Contractor',
      actor: DEMO_PERSONAS.Contractor.address,
      accepted: false,
      declined: false,
      timestamp: 0,
    },
    Inspector: {
      role: 'Inspector',
      actor: DEMO_PERSONAS.Inspector.address,
      accepted: false,
      declined: false,
      timestamp: 0,
    },
    Arbiter: {
      role: 'Arbiter',
      actor: DEMO_PERSONAS.Arbiter.address,
      accepted: false,
      declined: false,
      timestamp: 0,
    },
  },
  accounting: {
    deposited: 0,
    committed: 60000,
    allocated: 0,
    contractorPayable: 0,
    retainageLocked: 0,
    disputed: 0,
    ownerRefundable: 0,
    withdrawn: 0,
  },
  disputes: {},
};

export const DEMO_PROJECT_2: UIProject = {
  id: 'bb-escrow-seattle-medical',
  title: 'Seattle Medical Pavilion - Cleanrooms & HVAC',
  location: 'Seattle, Washington, USA',
  contractAddress: 'CCBUILDBONDESCROW7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X02',
  status: 'Active',
  termsHash: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
  owner: DEMO_PERSONAS.Owner.address,
  contractor: DEMO_PERSONAS.Contractor.address,
  inspector: DEMO_PERSONAS.Inspector.address,
  arbiter: DEMO_PERSONAS.Arbiter.address,
  paymentTokenSymbol: 'USDC',
  paymentTokenAddress: 'CUSDC7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7XTESTNET01',
  totalCommitted: 100000,
  retainageBps: 1000,
  defectPeriodDays: 90,
  fundingPolicy: 'FullyFunded',
  createdAt: Date.now() - 7200000,
  milestones: [
    {
      id: 1,
      title: 'HEPA Air Filtration & Cleanroom Walls',
      description: 'ISO-Class 5 compliant wall panels and ductwork sealing.',
      amount: 40000,
      immediateAmount: 36000,
      retainageAmount: 4000,
      status: 'InDefectPeriod',
      dueAt: Math.floor(Date.now() / 1000) - 10000,
      inspectionDeadlineSecs: 7 * 86400,
      approvedAt: Math.floor(Date.now() / 1000) - 8000,
      defectDeadlineAt: Math.floor(Date.now() / 1000) - 8000 + 90 * 86400,
      retainedReleased: 0,
    },
    {
      id: 2,
      title: 'Medical Gas Lines & Backup Power',
      description: 'Oxygen, vacuum, and N2O manifold piping with automated emergency transfer switch.',
      amount: 60000,
      immediateAmount: 54000,
      retainageAmount: 6000,
      status: 'Funded',
      dueAt: Math.floor(Date.now() / 1000) + 20 * 86400,
      inspectionDeadlineSecs: 7 * 86400,
      retainedReleased: 0,
    },
  ],
  acceptances: {
    Owner: { role: 'Owner', actor: DEMO_PERSONAS.Owner.address, accepted: true, declined: false, timestamp: Math.floor(Date.now() / 1000) - 20000 },
    Contractor: { role: 'Contractor', actor: DEMO_PERSONAS.Contractor.address, accepted: true, declined: false, timestamp: Math.floor(Date.now() / 1000) - 19000 },
    Inspector: { role: 'Inspector', actor: DEMO_PERSONAS.Inspector.address, accepted: true, declined: false, timestamp: Math.floor(Date.now() / 1000) - 18000 },
    Arbiter: { role: 'Arbiter', actor: DEMO_PERSONAS.Arbiter.address, accepted: true, declined: false, timestamp: Math.floor(Date.now() / 1000) - 17000 },
  },
  accounting: {
    deposited: 100000,
    committed: 100000,
    allocated: 60000,
    contractorPayable: 36000,
    retainageLocked: 4000,
    disputed: 0,
    ownerRefundable: 0,
    withdrawn: 0,
  },
  disputes: {},
};

export function useEscrowWorkflow(freighterAddress: string | null) {
  const [projects, setProjects] = useState<UIProject[]>([INITIAL_PROJECT, DEMO_PROJECT_2]);
  const [activeProjectId, setActiveProjectId] = useState<string>(INITIAL_PROJECT.id);

  const [activeRole, setActiveRole] = useState<RoleType>('Owner');
  const [useFreighterWallet, setUseFreighterWallet] = useState<boolean>(false);
  const [simulatedTimeOffsetSecs, setSimulatedTimeOffsetSecs] = useState<number>(0);
  const [logs, setLogs] = useState<TransactionLog[]>([]);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  // Active project selection
  const project = useMemo(() => {
    return projects.find(p => p.id === activeProjectId) || projects[0];
  }, [projects, activeProjectId]);

  // Helper to mutate active project
  const updateCurrentProject = useCallback((updater: (prev: UIProject) => UIProject) => {
    setProjects(prevProjects =>
      prevProjects.map(p => (p.id === activeProjectId ? updater(p) : p))
    );
  }, [activeProjectId]);

  // Current active effective address
  const activeAddress = useMemo(() => {
    if (useFreighterWallet && freighterAddress) {
      return freighterAddress;
    }
    return DEMO_PERSONAS[activeRole].address;
  }, [useFreighterWallet, freighterAddress, activeRole]);

  const activePersona: RolePersona = useMemo(() => {
    const base = DEMO_PERSONAS[activeRole];
    if (useFreighterWallet && freighterAddress) {
      return {
        ...base,
        address: freighterAddress,
        title: `${base.title} (Freighter: ${freighterAddress.slice(0, 4)}...${freighterAddress.slice(-4)})`,
      };
    }
    return base;
  }, [activeRole, useFreighterWallet, freighterAddress]);

  // Current simulated ledger timestamp
  const simulatedLedgerTimestamp = useMemo(() => {
    return Math.floor(Date.now() / 1000) + simulatedTimeOffsetSecs;
  }, [simulatedTimeOffsetSecs]);

  // Append transaction log helper
  const addLog = useCallback((
    title: string,
    method: string,
    details: string,
    status: 'simulated' | 'simulating' | 'signing' | 'confirmed' | 'failed' = 'simulated'
  ) => {
    const newLog: TransactionLog = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      title,
      actorRole: activeRole,
      actorAddress: activeAddress,
      method,
      source: 'simulated',
      status,
      details: `[SIMULATED] ${details}`,
    };
    setLogs(prev => [newLog, ...prev]);
  }, [activeRole, activeAddress]);

  // 1. Accept Role Action
  const acceptRole = useCallback(async (role: RoleType) => {
    setIsBusy(true);
    try {
      addLog(`Role Acceptance (${role})`, 'accept_role', `Submitting cryptographic accept_role for ${role} bound to terms hash ${project.termsHash.slice(0, 10)}...`);
      
      await new Promise(r => setTimeout(r, 600));

      updateCurrentProject(prev => {
        const nextAcceptances = {
          ...prev.acceptances,
          [role]: {
            ...prev.acceptances[role],
            accepted: true,
            declined: false,
            timestamp: simulatedLedgerTimestamp,
            termsHash: prev.termsHash,
          },
        };

        const allMandatoryAccepted =
          nextAcceptances.Contractor.accepted &&
          nextAcceptances.Inspector.accepted &&
          nextAcceptances.Arbiter.accepted;

        const nextStatus = allMandatoryAccepted
          ? prev.accounting.deposited >= prev.totalCommitted
            ? 'Active'
            : 'AwaitingFunding'
          : prev.status;

        return {
          ...prev,
          acceptances: nextAcceptances,
          status: nextStatus,
        };
      });

      addLog(`Role Acceptance Simulated (${role})`, 'accept_role', `Applied ${role} role acceptance to the local demo state; no transaction was submitted.`);
    } finally {
      setIsBusy(false);
    }
  }, [project.termsHash, simulatedLedgerTimestamp, updateCurrentProject, addLog]);

  // 2. Decline Role Action
  const declineRole = useCallback(async (role: RoleType, reason: string) => {
    setIsBusy(true);
    try {
      const reasonHash = await computeReportHash(0, 'Reject', reason);
      addLog(`Role Decline (${role})`, 'decline_role', `Declining role invitation for ${role}. Reason hash: ${reasonHash.slice(0, 10)}...`);
      await new Promise(r => setTimeout(r, 600));

      updateCurrentProject(prev => ({
        ...prev,
        status: 'Suspended',
        acceptances: {
          ...prev.acceptances,
          [role]: {
            ...prev.acceptances[role],
            accepted: false,
            declined: true,
            timestamp: simulatedLedgerTimestamp,
            reasonHash,
          },
        },
      }));
    } finally {
      setIsBusy(false);
    }
  }, [simulatedLedgerTimestamp, updateCurrentProject, addLog]);

  // 3. Deposit & Fund Escrow Action
  const depositFunds = useCallback(async (amount: number) => {
    setIsBusy(true);
    try {
      addLog('Escrow Deposit', 'deposit', `Transferring ${amount.toLocaleString()} ${project.paymentTokenSymbol} via SEP-41 token client into escrow custody.`);
      await new Promise(r => setTimeout(r, 800));

      updateCurrentProject(prev => {
        const newDeposited = prev.accounting.deposited + amount;
        let newAllocated = prev.accounting.allocated;

        // Auto-allocate milestones under FullyFunded policy
        const nextMilestones = prev.milestones.map(m => {
          if (m.status === 'Planned') {
            const availableUnallocated = newDeposited - newAllocated;
            if (availableUnallocated >= m.amount) {
              newAllocated += m.amount;
              return { ...m, status: 'Funded' as const };
            }
          }
          return m;
        });

        const allAccepted =
          prev.acceptances.Contractor.accepted &&
          prev.acceptances.Inspector.accepted &&
          prev.acceptances.Arbiter.accepted;

        const nextStatus = allAccepted ? 'Active' : 'AwaitingAcceptance';

        return {
          ...prev,
          status: nextStatus,
          milestones: nextMilestones,
          accounting: {
            ...prev.accounting,
            deposited: newDeposited,
            allocated: newAllocated,
          },
        };
      });

      addLog('Deposit Simulated', 'deposit', `Local demo custody increased by ${amount.toLocaleString()} ${project.paymentTokenSymbol}. No token transfer occurred.`);
    } finally {
      setIsBusy(false);
    }
  }, [project.paymentTokenSymbol, updateCurrentProject, addLog]);

  // 4. Submit Milestone Evidence Action
  const submitMilestone = useCallback(async (milestoneId: number, description: string, fileName?: string) => {
    setIsBusy(true);
    try {
      const evidenceHash = await computeEvidenceHash(milestoneId, description, fileName);
      addLog(`Milestone #${milestoneId} Submission`, 'submit_milestone', `Contractor submitting completed work evidence digest: ${evidenceHash.slice(0, 16)}...`);
      await new Promise(r => setTimeout(r, 600));

      updateCurrentProject(prev => ({
        ...prev,
        milestones: prev.milestones.map(m => {
          if (m.id === milestoneId) {
            return {
              ...m,
              status: 'Submitted',
              evidenceHash,
              evidenceNotes: description,
            };
          }
          return m;
        }),
      }));

      addLog(`Milestone #${milestoneId} Submission Simulated`, 'submit_milestone', `Evidence digest stored in the local demo state; no contract call occurred.`);
    } finally {
      setIsBusy(false);
    }
  }, [updateCurrentProject, addLog]);

  // 5. Inspect Milestone Action (Approve / Reject)
  const inspectMilestone = useCallback(async (
    milestoneId: number,
    decision: 'Approve' | 'Reject',
    notes: string
  ) => {
    setIsBusy(true);
    try {
      const reportHash = await computeReportHash(milestoneId, decision, notes);
      addLog(`Milestone #${milestoneId} Inspection (${decision})`, 'inspect_milestone', `Inspector recording ${decision} certification. Report digest: ${reportHash.slice(0, 16)}...`);
      await new Promise(r => setTimeout(r, 800));

      updateCurrentProject(prev => {
        const targetMilestone = prev.milestones.find(m => m.id === milestoneId);
        if (!targetMilestone) return prev;

        if (decision === 'Reject') {
          return {
            ...prev,
            milestones: prev.milestones.map(m => m.id === milestoneId ? { ...m, status: 'Rejected' as const } : m),
          };
        }

        // Exact Retainage Calculation
        const retainageAmount = Math.floor((targetMilestone.amount * prev.retainageBps) / 10000);
        const immediateAmount = targetMilestone.amount - retainageAmount;
        const approvedAt = simulatedLedgerTimestamp;
        const defectDeadlineAt = approvedAt + prev.defectPeriodDays * 86400;

        const nextMilestones = prev.milestones.map(m => {
          if (m.id === milestoneId) {
            return {
              ...m,
              status: 'InDefectPeriod' as const,
              immediateAmount,
              retainageAmount,
              approvedAt,
              defectDeadlineAt,
            };
          }
          return m;
        });

        return {
          ...prev,
          milestones: nextMilestones,
          accounting: {
            ...prev.accounting,
            allocated: prev.accounting.allocated - targetMilestone.amount,
            contractorPayable: prev.accounting.contractorPayable + immediateAmount,
            retainageLocked: prev.accounting.retainageLocked + retainageAmount,
          },
        };
      });

      addLog(`Milestone #${milestoneId} Inspection Simulated`, 'inspect_milestone', `Local demo approval applied; no on-chain earnings were unlocked.`);
    } finally {
      setIsBusy(false);
    }
  }, [simulatedLedgerTimestamp, updateCurrentProject, addLog]);

  // 6. Withdraw Earned Immediate Earnings Action
  const withdrawEarned = useCallback(async (amount: number) => {
    setIsBusy(true);
    try {
      addLog('Earnings Withdrawal Simulated', 'withdraw_earned', `Local demo withdrawal of ${amount.toLocaleString()} ${project.paymentTokenSymbol}; no token transfer occurred.`);
      await new Promise(r => setTimeout(r, 700));

      updateCurrentProject(prev => ({
        ...prev,
        accounting: {
          ...prev.accounting,
          contractorPayable: prev.accounting.contractorPayable - amount,
          withdrawn: prev.accounting.withdrawn + amount,
        },
      }));

      addLog('Withdrawal Simulation Applied', 'withdraw_earned', `Local demo balance updated by ${amount.toLocaleString()} ${project.paymentTokenSymbol}.`);
    } finally {
      setIsBusy(false);
    }
  }, [project.paymentTokenSymbol, updateCurrentProject, addLog]);

  // 7. Claim Mature Retainage Action
  const claimRetainage = useCallback(async (milestoneId: number) => {
    setIsBusy(true);
    try {
      const target = project.milestones.find(m => m.id === milestoneId);
      if (!target) return;

      const claimableAmount = target.retainageAmount - target.retainedReleased;
      addLog(`Retainage Claim (#${milestoneId})`, 'claim_retainage', `Claiming mature defect liability retainage of ${claimableAmount.toLocaleString()} ${project.paymentTokenSymbol}.`);
      await new Promise(r => setTimeout(r, 800));

      updateCurrentProject(prev => {
        const nextMilestones = prev.milestones.map(m => {
          if (m.id === milestoneId) {
            return {
              ...m,
              status: 'Settled' as const,
              retainedReleased: m.retainageAmount,
            };
          }
          return m;
        });

        const allSettled = nextMilestones.every(m => m.status === 'Settled');

        return {
          ...prev,
          status: allSettled ? 'Completed' : prev.status,
          milestones: nextMilestones,
          accounting: {
            ...prev.accounting,
            retainageLocked: prev.accounting.retainageLocked - claimableAmount,
            withdrawn: prev.accounting.withdrawn + claimableAmount,
          },
        };
      });

      addLog(`Retainage Release Simulated (#${milestoneId})`, 'claim_retainage', `Local demo retainage was released. No token transfer occurred.`);
    } finally {
      setIsBusy(false);
    }
  }, [project.milestones, project.paymentTokenSymbol, updateCurrentProject, addLog]);

  // 8. Open Dispute Action
  const openDispute = useCallback(async (milestoneId: number, reason: string) => {
    setIsBusy(true);
    try {
      const reasonHash = await computeReportHash(milestoneId, 'Reject', reason);
      addLog(`Dispute Initiated (#${milestoneId})`, 'open_dispute', `${activeRole} opening formal dispute on Milestone #${milestoneId}. Reason digest: ${reasonHash.slice(0, 16)}...`);
      await new Promise(r => setTimeout(r, 800));

      updateCurrentProject(prev => {
        const target = prev.milestones.find(m => m.id === milestoneId);
        if (!target) return prev;

        const prevStatus = target.status;
        let amountDisputed = target.amount;
        let nextAllocated = prev.accounting.allocated;
        let nextRetainageLocked = prev.accounting.retainageLocked;
        let frozenRemainingSecs: number | undefined = undefined;

        if (prevStatus === 'InDefectPeriod') {
          amountDisputed = target.retainageAmount - target.retainedReleased;
          const deadline = target.defectDeadlineAt || 0;
          frozenRemainingSecs = Math.max(0, deadline - simulatedLedgerTimestamp);
          nextRetainageLocked -= amountDisputed;
        } else {
          nextAllocated -= amountDisputed;
        }

        const nextAccounting = {
          ...prev.accounting,
          allocated: nextAllocated,
          retainageLocked: nextRetainageLocked,
          disputed: prev.accounting.disputed + amountDisputed,
        };

        const nextMilestones = prev.milestones.map(m => {
          if (m.id === milestoneId) {
            return {
              ...m,
              status: 'Disputed' as const,
            };
          }
          return m;
        });

        const newDispute = {
          milestoneId,
          initiator: activeAddress,
          initiatorRole: activeRole,
          reasonHash,
          reasonText: reason,
          openedAt: simulatedLedgerTimestamp,
          amountDisputed,
          status: 'Open' as const,
          previousMilestoneStatus: prevStatus,
          frozenRemainingSecs,
          contractorAward: 0,
          ownerRefund: 0,
        };

        return {
          ...prev,
          milestones: nextMilestones,
          accounting: nextAccounting,
          disputes: {
            ...prev.disputes,
            [milestoneId]: newDispute,
          },
        };
      });

      addLog(`Dispute Simulation Applied (#${milestoneId})`, 'open_dispute', `Local demo funds were marked disputed and the simulated defect clock was paused.`);
    } finally {
      setIsBusy(false);
    }
  }, [activeRole, activeAddress, simulatedLedgerTimestamp, updateCurrentProject, addLog]);

  // 9. Resolve Dispute Action (Arbiter)
  const resolveDispute = useCallback(async (
    milestoneId: number,
    contractorAward: number,
    ownerRefund: number,
    reportNotes: string
  ) => {
    setIsBusy(true);
    try {
      const reportHash = await computeReportHash(milestoneId, 'Approve', reportNotes);
      addLog(`Arbitration Award (#${milestoneId})`, 'resolve_dispute', `Arbiter issuing binding award: Contractor $${contractorAward.toLocaleString()} / Owner Refund $${ownerRefund.toLocaleString()}.`);
      await new Promise(r => setTimeout(r, 900));

      updateCurrentProject(prev => {
        const targetDispute = prev.disputes[milestoneId];
        if (!targetDispute) return prev;

        const nextAccounting = {
          ...prev.accounting,
          disputed: prev.accounting.disputed - targetDispute.amountDisputed,
          contractorPayable: prev.accounting.contractorPayable + contractorAward,
          ownerRefundable: prev.accounting.ownerRefundable + ownerRefund,
        };

        const nextMilestones = prev.milestones.map(m => {
          if (m.id === milestoneId) {
            return {
              ...m,
              status: 'Settled' as const,
              retainedReleased: targetDispute.previousMilestoneStatus === 'InDefectPeriod' ? m.retainageAmount : m.retainedReleased,
              paidAmount: contractorAward,
            };
          }
          return m;
        });

        const nextDispute = {
          ...targetDispute,
          status: 'Resolved' as const,
          contractorAward,
          ownerRefund,
          reportHash,
          reportNotes,
          resolvedAt: simulatedLedgerTimestamp,
        };

        return {
          ...prev,
          milestones: nextMilestones,
          accounting: nextAccounting,
          disputes: {
            ...prev.disputes,
            [milestoneId]: nextDispute,
          },
        };
      });

      addLog(`Arbitration Simulation Applied (#${milestoneId})`, 'resolve_dispute', `Local demo award applied to contractor payable and owner refundable buckets; no contract call occurred.`);
    } finally {
      setIsBusy(false);
    }
  }, [simulatedLedgerTimestamp, updateCurrentProject, addLog]);

  // 10. Deploy Project via Factory
  const deployProject = useCallback(async (newProject: UIProject) => {
    setIsBusy(true);
    try {
      addLog(
        'Factory Deployment Simulated',
        'deploy_project',
        `Simulating creation of an isolated escrow for "${newProject.title}" with a local salt and terms hash.`
      );
      await new Promise(r => setTimeout(r, 1000));

      setProjects(prev => [newProject, ...prev]);
      setActiveProjectId(newProject.id);

      addLog(
        'Escrow Deployed & Registered',
        'deploy_project',
        `Project added to the local demo registry; no factory deployment or indexing occurred.`
      );
    } finally {
      setIsBusy(false);
    }
  }, [addLog]);

  // Fast forward simulated ledger time (e.g. +90 days)
  const fastForwardDays = useCallback((days: number) => {
    setSimulatedTimeOffsetSecs(prev => prev + days * 86400);
    addLog('Time Fast-Forward', 'simulated_clock', `Advanced simulated ledger time by +${days} days to test retainage maturity.`);
  }, [addLog]);

  // Reset demo project
  const resetDemo = useCallback(() => {
    setProjects([INITIAL_PROJECT, DEMO_PROJECT_2]);
    setActiveProjectId(INITIAL_PROJECT.id);
    setSimulatedTimeOffsetSecs(0);
    setLogs([]);
    addLog('Reset Workspace', 'system', 'Reset BuildBond demo projects to clean initial state.');
  }, [addLog]);

  return {
    projects,
    activeProjectId,
    selectProject: setActiveProjectId,
    project,
    activeRole,
    setActiveRole,
    activeAddress,
    activePersona,
    useFreighterWallet,
    setUseFreighterWallet,
    simulatedLedgerTimestamp,
    simulatedTimeOffsetSecs,
    fastForwardDays,
    logs,
    isBusy,
    acceptRole,
    declineRole,
    depositFunds,
    submitMilestone,
    inspectMilestone,
    withdrawEarned,
    claimRetainage,
    openDispute,
    resolveDispute,
    deployProject,
    resetDemo,
  };
}
