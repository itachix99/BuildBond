/**
 * Shared constants and types for BuildBond
 */

export * from './config.js';

export enum ProjectStatus {
  Draft = 'Draft',
  AwaitingAcceptance = 'AwaitingAcceptance',
  AwaitingFunding = 'AwaitingFunding',
  Active = 'Active',
  Suspended = 'Suspended',
  Terminating = 'Terminating',
  Completed = 'Completed',
  Terminated = 'Terminated',
}

export enum MilestoneStatus {
  Planned = 'Planned',
  Funded = 'Funded',
  Submitted = 'Submitted',
  Rejected = 'Rejected',
  Approved = 'Approved',
  InDefectPeriod = 'InDefectPeriod',
  Disputed = 'Disputed',
  ReworkRequired = 'ReworkRequired',
  RetainageClaimable = 'RetainageClaimable',
  Settled = 'Settled',
  Cancelled = 'Cancelled',
}

export enum Role {
  Owner = 'Owner',
  Contractor = 'Contractor',
  Inspector = 'Inspector',
  Arbiter = 'Arbiter',
}

export const NETWORK_PASSPHRASE_TESTNET = 'Test SDF Network ; September 2015';
export const DEFAULT_TESTNET_RPC_URL = 'https://soroban-testnet.stellar.org';
export const DEFAULT_TESTNET_HORIZON_URL = 'https://horizon-testnet.stellar.org';
export const BASIS_POINTS_DIVISOR = 10_000n;
