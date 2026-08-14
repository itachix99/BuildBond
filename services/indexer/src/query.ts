import { IEventStore } from './storage.js';
import { MilestoneTimeline, ProjectAuditTrail, IndexedEvent } from './types.js';

/**
 * Builds a chronological milestone lifecycle timeline from indexed events
 */
export async function buildMilestoneTimeline(
  store: IEventStore,
  contractAddress: string,
  milestoneId: number
): Promise<MilestoneTimeline> {
  const events = await store.getEventsByMilestone(contractAddress, milestoneId);

  let currentStatus = 'Planned';
  let submittedAt: string | undefined;
  let inspectedAt: string | undefined;
  let approvedAt: string | undefined;
  let disputedAt: string | undefined;
  let settledAt: string | undefined;
  let defectDeadlineAt: string | undefined;

  for (const ev of events) {
    switch (ev.eventType) {
      case 'milestone_funded':
        currentStatus = 'Funded';
        break;
      case 'milestone_submitted':
        currentStatus = 'Submitted';
        submittedAt = ev.ledgerClosedAt;
        break;
      case 'inspection_recorded':
        inspectedAt = ev.ledgerClosedAt;
        if (ev.payload.decision === 2) {
          currentStatus = 'Rejected';
        }
        break;
      case 'milestone_approved':
        currentStatus = 'InDefectPeriod';
        approvedAt = ev.ledgerClosedAt;
        defectDeadlineAt = new Date(Number(ev.payload.defectDeadlineAt) * 1000).toISOString();
        break;
      case 'dispute_opened':
        currentStatus = 'Disputed';
        disputedAt = ev.ledgerClosedAt;
        break;
      case 'dispute_resolved':
      case 'retainage_claimed':
        currentStatus = 'Settled';
        settledAt = ev.ledgerClosedAt;
        break;
    }
  }

  return {
    milestoneId,
    contractAddress,
    currentStatus,
    events,
    submittedAt,
    inspectedAt,
    approvedAt,
    disputedAt,
    settledAt,
    defectDeadlineAt,
  };
}

/**
 * Builds a comprehensive financial audit trail for an escrow contract
 */
export async function buildProjectAuditTrail(
  store: IEventStore,
  contractAddress: string
): Promise<ProjectAuditTrail> {
  const events = await store.getEventsByContract(contractAddress);

  let totalDeposited = 0n;
  let totalAllocated = 0n;
  let totalPaid = 0n;
  let totalRetainageClaimed = 0n;
  let totalRefunded = 0n;
  let totalDisputed = 0n;

  for (const ev of events) {
    const p = ev.payload;
    if (!p) continue;

    switch (ev.eventType) {
      case 'project_funded':
        totalDeposited += BigInt(p.amount || 0n);
        break;
      case 'milestone_funded':
        totalAllocated += BigInt(p.amount || 0n);
        break;
      case 'payment_withdrawn':
        totalPaid += BigInt(p.amount || 0n);
        break;
      case 'retainage_claimed':
        totalRetainageClaimed += BigInt(p.amount || 0n);
        totalPaid += BigInt(p.amount || 0n);
        break;
      case 'refund_withdrawn':
        totalRefunded += BigInt(p.amount || 0n);
        break;
      case 'dispute_opened':
        totalDisputed += BigInt(p.amountDisputed || 0n);
        break;
      case 'dispute_resolved':
        totalPaid += BigInt(p.contractorAward || 0n);
        totalRefunded += BigInt(p.ownerRefund || 0n);
        break;
    }
  }

  return {
    contractAddress,
    eventsCount: events.length,
    totalDeposited,
    totalAllocated,
    totalPaid,
    totalRetainageClaimed,
    totalRefunded,
    totalDisputed,
    events,
  };
}

/**
 * Gets participant-scoped escrow activity
 */
export async function getParticipantEscrowActivity(
  store: IEventStore,
  participantAddress: string
): Promise<IndexedEvent[]> {
  return store.getEventsByParticipant(participantAddress, { order: 'desc' });
}
