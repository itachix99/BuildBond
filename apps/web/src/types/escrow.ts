/**
 * BuildBond Escrow Frontend Types and Role Personas
 */

export type RoleType = 'Owner' | 'Contractor' | 'Inspector' | 'Arbiter';

export interface RolePersona {
  role: RoleType;
  title: string;
  badgeColor: string;
  address: string;
  description: string;
  avatar: string;
}

export const DEMO_PERSONAS: Record<RoleType, RolePersona> = {
  Owner: {
    role: 'Owner',
    title: 'Project Developer (Owner)',
    badgeColor: '#3B82F6', // Blue
    address: 'GAOWNER7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X777',
    description: 'Creates project, funds escrow via stablecoin deposit, monitors milestone completion, withdraws excess refunds.',
    avatar: '🏗️',
  },
  Contractor: {
    role: 'Contractor',
    title: 'General Contractor (Builder)',
    badgeColor: '#10B981', // Emerald
    address: 'GACONTRACTOR7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X888',
    description: 'Accepts terms, completes physical construction work, submits cryptographic evidence, withdraws immediate earnings, claims mature retainage.',
    avatar: '👷',
  },
  Inspector: {
    role: 'Inspector',
    title: 'Independent Certifier (Inspector)',
    badgeColor: '#F59E0B', // Amber
    address: 'GAINSPECTOR7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X999',
    description: 'Independently inspects site evidence against building code and plans, issues on-chain approval or rejection with audit reports.',
    avatar: '📐',
  },
  Arbiter: {
    role: 'Arbiter',
    title: 'Neutral Dispute Arbiter',
    badgeColor: '#8B5CF6', // Purple
    address: 'GAARBITER7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X000',
    description: 'Impartial mediator ready to resolve formal construction disputes and award frozen funds pursuant to arbitration hearings.',
    avatar: '⚖️',
  },
};

export type ProjectStage =
  | 'AwaitingAcceptance'
  | 'AwaitingFunding'
  | 'Active'
  | 'Suspended'
  | 'Completed'
  | 'Terminated';

export type MilestoneStage =
  | 'Planned'
  | 'Funded'
  | 'Submitted'
  | 'Rejected'
  | 'InDefectPeriod'
  | 'Disputed'
  | 'Settled';

export interface UIMilestone {
  id: number;
  title: string;
  description: string;
  amount: number;
  immediateAmount: number;
  retainageAmount: number;
  status: MilestoneStage;
  dueAt: number;
  inspectionDeadlineSecs: number;
  evidenceHash?: string;
  evidenceNotes?: string;
  approvedAt?: number;
  defectDeadlineAt?: number;
  retainedReleased: number;
}

export interface UIAcceptance {
  role: RoleType;
  actor: string;
  accepted: boolean;
  declined: boolean;
  timestamp: number;
  termsHash?: string;
  reasonHash?: string;
}

export interface UIAccounting {
  deposited: number;
  committed: number;
  allocated: number;
  contractorPayable: number;
  retainageLocked: number;
  disputed: number;
  ownerRefundable: number;
  withdrawn: number;
}

export interface UIProject {
  id: string;
  title: string;
  location: string;
  contractAddress: string;
  status: ProjectStage;
  termsHash: string;
  owner: string;
  contractor: string;
  inspector: string;
  arbiter: string;
  paymentTokenSymbol: string;
  paymentTokenAddress: string;
  totalCommitted: number;
  retainageBps: number;
  defectPeriodDays: number;
  fundingPolicy: 'FullyFunded' | 'Rolling';
  createdAt: number;
  milestones: UIMilestone[];
  acceptances: Record<RoleType, UIAcceptance>;
  accounting: UIAccounting;
}

export interface TransactionLog {
  id: string;
  timestamp: number;
  title: string;
  actorRole: RoleType;
  actorAddress: string;
  method: string;
  txHash: string;
  status: 'simulating' | 'signing' | 'confirmed' | 'failed';
  details: string;
  stellarExpertUrl: string;
}
