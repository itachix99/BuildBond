/**
 * BuildBond Event Indexer Domain Types & Data Models
 */

export type BuildBondEventType =
  | 'project_created'
  | 'role_accepted'
  | 'role_declined'
  | 'project_activated'
  | 'project_completed'
  | 'project_funded'
  | 'milestone_funded'
  | 'milestone_submitted'
  | 'inspection_recorded'
  | 'milestone_approved'
  | 'payment_withdrawn'
  | 'retainage_claimed'
  | 'refund_withdrawn'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'project_deployed'
  | 'wasm_hash_updated'
  | 'unknown';

export interface ProjectCreatedPayload {
  owner: string;
  contractor: string;
  inspector: string;
  arbiter: string;
  paymentToken: string;
  totalCommitted: bigint;
  retainageBps: number;
  defectPeriodSecs: bigint;
  fundingPolicy: number;
  termsHash: string;
  timestamp: bigint;
}

export interface RoleAcceptedPayload {
  role: number;
  actor: string;
  termsHash: string;
  timestamp: bigint;
}

export interface RoleDeclinedPayload {
  role: number;
  actor: string;
  reasonHash: string;
  timestamp: bigint;
}

export interface ProjectActivatedPayload {
  caller: string;
  timestamp: bigint;
}

export interface ProjectCompletedPayload {
  timestamp: bigint;
}

export interface ProjectFundedPayload {
  funder: string;
  amount: bigint;
  newDeposited: bigint;
  coverageRatioBps: number;
  timestamp: bigint;
}

export interface MilestoneFundedPayload {
  milestoneId: number;
  amount: bigint;
  timestamp: bigint;
}

export interface MilestoneSubmittedPayload {
  milestoneId: number;
  contractor: string;
  evidenceHash: string;
  timestamp: bigint;
}

export interface InspectionRecordedPayload {
  milestoneId: number;
  inspector: string;
  decision: number; // 1 = Approve, 2 = Reject
  reportHash: string;
  timestamp: bigint;
}

export interface MilestoneApprovedPayload {
  milestoneId: number;
  immediateAmount: bigint;
  retainageAmount: bigint;
  defectDeadlineAt: bigint;
  timestamp: bigint;
}

export interface PaymentWithdrawnPayload {
  beneficiary: string;
  amount: bigint;
  timestamp: bigint;
}

export interface RetainageClaimedPayload {
  milestoneId: number;
  contractor: string;
  amount: bigint;
  timestamp: bigint;
}

export interface RefundWithdrawnPayload {
  owner: string;
  amount: bigint;
  timestamp: bigint;
}

export interface DisputeOpenedPayload {
  milestoneId: number;
  initiator: string;
  amountDisputed: bigint;
  reasonHash: string;
  timestamp: bigint;
}

export interface DisputeResolvedPayload {
  milestoneId: number;
  arbiter: string;
  contractorAward: bigint;
  ownerRefund: bigint;
  reportHash: string;
  timestamp: bigint;
}

export interface ProjectDeployedPayload {
  projectId: number;
  escrowAddress: string;
  owner: string;
  contractor: string;
  totalCommitted: bigint;
  timestamp: bigint;
  salt?: string;
  escrowWasmHash?: string;
}

export interface WasmHashUpdatedPayload {
  oldWasmHash: string;
  newWasmHash: string;
  admin: string;
  timestamp: bigint;
}

export interface IndexedEvent<T = any> {
  id: string;
  contractAddress: string;
  eventType: BuildBondEventType;
  ledger: number;
  ledgerClosedAt: string;
  txHash: string;
  payload: T;
  indexedAt: number;
}

export interface IndexerCursor {
  lastLedger: number;
  lastEventId?: string;
  updatedAt: number;
}

export interface IndexedProject {
  projectId: number;
  factoryAddress: string;
  escrowAddress: string;
  owner: string;
  contractor: string;
  totalCommitted: bigint;
  createdAtLedger: number;
  createdAt: string;
  salt?: string;
  escrowWasmHash?: string;
}

export interface ProjectQueryOptions {
  participant?: string;
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
  eventType?: BuildBondEventType;
  fromLedger?: number;
  toLedger?: number;
}

export interface MilestoneTimeline {
  milestoneId: number;
  contractAddress: string;
  currentStatus: string;
  events: IndexedEvent[];
  submittedAt?: string;
  inspectedAt?: string;
  approvedAt?: string;
  disputedAt?: string;
  settledAt?: string;
  defectDeadlineAt?: string;
}

export interface ProjectAuditTrail {
  contractAddress: string;
  eventsCount: number;
  totalDeposited: bigint;
  totalAllocated: bigint;
  totalPaid: bigint;
  totalRetainageClaimed: bigint;
  totalRefunded: bigint;
  totalDisputed: bigint;
  events: IndexedEvent[];
}
