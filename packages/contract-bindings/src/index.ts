import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";
export * as Factory from "./factory.js";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}




export type Role = {tag: "Owner", values: void} | {tag: "Contractor", values: void} | {tag: "Inspector", values: void} | {tag: "Arbiter", values: void};


export interface Milestone {
  amount: i128;
  approved_at: Option<u64>;
  defect_deadline_at: Option<u64>;
  due_at: u64;
  evidence_hash: Option<Buffer>;
  frozen_remaining_secs: Option<u64>;
  id: u32;
  immediate_amount: i128;
  inspection_deadline_secs: u64;
  paid_amount: i128;
  retainage_amount: i128;
  retained_released: i128;
  status: MilestoneStatus;
  submitted_at: Option<u64>;
}


export interface Accounting {
  allocated: i128;
  committed: i128;
  contractor_payable: i128;
  deposited: i128;
  disputed: i128;
  owner_refundable: i128;
  retainage_locked: i128;
  withdrawn: i128;
}


export interface ProjectView {
  accounting: Accounting;
  milestone_count: u32;
  status: ProjectStatus;
  terms: ProjectTerms;
}


export interface CoverageView {
  allocated: i128;
  coverage_ratio_bps: u32;
  covered_milestones: u32;
  deposited: i128;
  is_fully_covered: boolean;
  total_committed: i128;
  total_milestones: u32;
  unallocated: i128;
}


export interface ProjectTerms {
  arbiter: string;
  contractor: string;
  defect_period_secs: u64;
  funding_policy: FundingPolicy;
  inspector: string;
  owner: string;
  payment_token: string;
  retainage_bps: u32;
  terms_hash: Buffer;
  total_committed: i128;
}


export interface ClaimableView {
  contractor_payable: i128;
  owner_refundable: i128;
  retainage_claimable: i128;
}


export interface DisputeRecord {
  amount_disputed: i128;
  contractor_award: i128;
  frozen_remaining_secs: Option<u64>;
  initiator: string;
  milestone_id: u32;
  opened_at: u64;
  owner_refund: i128;
  previous_milestone_status: MilestoneStatus;
  reason_hash: Buffer;
  report_hash: Option<Buffer>;
  resolved_at: Option<u64>;
  status: DisputeStatus;
}

export enum DisputeStatus {
  Open = 1,
  Resolved = 2,
}

export enum FundingPolicy {
  FullyFunded = 0,
  Rolling = 1,
}

export type ProjectStatus = {tag: "Draft", values: void} | {tag: "AwaitingAcceptance", values: void} | {tag: "AwaitingFunding", values: void} | {tag: "Active", values: void} | {tag: "Suspended", values: void} | {tag: "Terminating", values: void} | {tag: "Completed", values: void} | {tag: "Terminated", values: void};


export interface AcceptanceView {
  accepted: boolean;
  actor: string;
  declined: boolean;
  reason_hash: Option<Buffer>;
  role: Role;
  terms_hash: Option<Buffer>;
  timestamp: u64;
}

export const BuildBondError = {
  1: {message:"AlreadyInitialized"},
  2: {message:"NotInitialized"},
  3: {message:"Unauthorized"},
  4: {message:"InvalidAddress"},
  5: {message:"InvalidAmount"},
  6: {message:"InvalidBasisPoints"},
  7: {message:"InvalidTimestamp"},
  8: {message:"InvalidTermsHash"},
  9: {message:"InvalidState"},
  10: {message:"ProjectNotActive"},
  11: {message:"RoleNotAccepted"},
  12: {message:"RoleAlreadyAccepted"},
  13: {message:"ReplacementNotApproved"},
  14: {message:"MilestoneNotFound"},
  15: {message:"MilestoneAlreadySubmitted"},
  16: {message:"MilestoneAlreadyApproved"},
  17: {message:"MilestoneNotFunded"},
  18: {message:"InspectionDeadlinePassed"},
  19: {message:"InsufficientCoverage"},
  20: {message:"InsufficientEscrowBalance"},
  21: {message:"NothingToWithdraw"},
  22: {message:"RetainageNotMature"},
  23: {message:"RetainageAlreadyReleased"},
  24: {message:"ActiveDispute"},
  25: {message:"DisputeNotFound"},
  26: {message:"DisputeAlreadyResolved"},
  27: {message:"InvalidDisputeAmount"},
  28: {message:"InvalidAwardAllocation"},
  29: {message:"ArbitrationDeadlinePassed"},
  30: {message:"ChangeOrderNotAccepted"},
  31: {message:"ChangeOrderNotFunded"},
  32: {message:"TerminationNotAccepted"},
  33: {message:"ArithmeticOverflow"},
  34: {message:"TokenTransferFailed"},
  35: {message:"ReentrantCall"},
  36: {message:"InvalidMilestoneCount"},
  37: {message:"MilestoneSumMismatch"}
}


export interface MilestoneInput {
  amount: i128;
  due_at: u64;
  id: u32;
  inspection_deadline_secs: u64;
}

export type MilestoneStatus = {tag: "Planned", values: void} | {tag: "Funded", values: void} | {tag: "Submitted", values: void} | {tag: "Rejected", values: void} | {tag: "Approved", values: void} | {tag: "InDefectPeriod", values: void} | {tag: "Disputed", values: void} | {tag: "ReworkRequired", values: void} | {tag: "RetainageClaimable", values: void} | {tag: "Settled", values: void} | {tag: "Cancelled", values: void};

export enum InspectionDecision {
  Approve = 1,
  Reject = 2,
}
















export type DataKey = {tag: "Initialized", values: void} | {tag: "Terms", values: void} | {tag: "Status", values: void} | {tag: "Accounting", values: void} | {tag: "MilestoneCount", values: void} | {tag: "Milestone", values: readonly [u32]} | {tag: "RoleAcceptance", values: readonly [Role]} | {tag: "Dispute", values: readonly [u32]};

export interface Client {
  /**
   * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deposits payment token into escrow custody, updating accounted liabilities and auto-allocating
   */
  deposit: ({funder, amount}: {funder: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a dispute transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  dispute: ({milestone_id}: {milestone_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Option<DisputeRecord>>>

  /**
   * Construct and simulate a project transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  project: (options?: MethodOptions) => Promise<AssembledTransaction<Result<ProjectView>>>

  /**
   * Construct and simulate a version transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the contract version symbol
   */
  version: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a activate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Activates the project escrow once all mandatory role acceptances exist
   */
  activate: ({caller}: {caller: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a coverage transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  coverage: (options?: MethodOptions) => Promise<AssembledTransaction<Result<CoverageView>>>

  /**
   * Construct and simulate a claimable transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  claimable: ({address}: {address: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<ClaimableView>>>

  /**
   * Construct and simulate a milestone transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  milestone: ({id}: {id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Milestone>>>

  /**
   * Construct and simulate a accounting transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  accounting: (options?: MethodOptions) => Promise<AssembledTransaction<Result<Accounting>>>

  /**
   * Construct and simulate a extend_ttl transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Extends the lifetime of the project instance and all durable milestone/dispute records.
   * Only the project owner may renew storage, and the requested lifetime is bounded by the
   * network maximum TTL to avoid creating unbounded retention obligations.
   */
  extend_ttl: ({owner, threshold, extend_to}: {owner: string, threshold: u32, extend_to: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initializes a dedicated project escrow with agreed terms and milestone schedule
   */
  initialize: ({terms, milestones}: {terms: ProjectTerms, milestones: Array<MilestoneInput>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a accept_role transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Explicit on-chain cryptographic role acceptance bound to exact terms hash
   */
  accept_role: ({actor, role, terms_hash}: {actor: string, role: Role, terms_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a decline_role transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Explicit on-chain role decline with documented reason hash
   */
  decline_role: ({actor, role, reason_hash}: {actor: string, role: Role, reason_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a open_dispute transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Opens a formal dispute on a milestone, freezing funds and defect timers
   */
  open_dispute: ({initiator, milestone_id, amount, reason_hash}: {initiator: string, milestone_id: u32, amount: i128, reason_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a claim_retainage transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Claims mature retainage after the defect liability period expires
   */
  claim_retainage: ({contractor, milestone_id}: {contractor: string, milestone_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a resolve_dispute transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Resolves a formal dispute with binding arbiter award allocation
   */
  resolve_dispute: ({arbiter, milestone_id, contractor_award, owner_refund, report_hash}: {arbiter: string, milestone_id: u32, contractor_award: i128, owner_refund: i128, report_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a role_acceptance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  role_acceptance: ({role}: {role: Role}, options?: MethodOptions) => Promise<AssembledTransaction<Option<AcceptanceView>>>

  /**
   * Construct and simulate a withdraw_earned transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraws earned payable balance to contractor
   */
  withdraw_earned: ({contractor, amount}: {contractor: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a withdraw_refund transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraws unallocated funds back to the project owner
   */
  withdraw_refund: ({owner, amount}: {owner: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a submit_milestone transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Submits completed milestone evidence by contractor
   */
  submit_milestone: ({contractor, milestone_id, evidence_hash}: {contractor: string, milestone_id: u32, evidence_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a inspect_milestone transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Inspects and approves or rejects a submitted milestone by accredited inspector
   */
  inspect_milestone: ({inspector, milestone_id, decision, report_hash}: {inspector: string, milestone_id: u32, decision: InspectionDecision, report_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a allocate_to_milestone transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Allocates unallocated deposited funds to a specific planned milestone
   */
  allocate_to_milestone: ({owner, milestone_id, amount}: {owner: string, milestone_id: u32, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAF5EZXBvc2l0cyBwYXltZW50IHRva2VuIGludG8gZXNjcm93IGN1c3RvZHksIHVwZGF0aW5nIGFjY291bnRlZCBsaWFiaWxpdGllcyBhbmQgYXV0by1hbGxvY2F0aW5nAAAAAAAHZGVwb3NpdAAAAAACAAAAAAAAAAZmdW5kZXIAAAAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAEAAAPpAAAAAgAAB9AAAAAOQnVpbGRCb25kRXJyb3IAAA==",
        "AAAAAAAAAAAAAAAHZGlzcHV0ZQAAAAABAAAAAAAAAAxtaWxlc3RvbmVfaWQAAAAEAAAAAQAAA+gAAAfQAAAADURpc3B1dGVSZWNvcmQAAAA=",
        "AAAAAAAAAAAAAAAHcHJvamVjdAAAAAAAAAAAAQAAA+kAAAfQAAAAC1Byb2plY3RWaWV3AAAAB9AAAAAOQnVpbGRCb25kRXJyb3IAAA==",
        "AAAAAAAAACNSZXR1cm5zIHRoZSBjb250cmFjdCB2ZXJzaW9uIHN5bWJvbAAAAAAHdmVyc2lvbgAAAAAAAAAAAQAAABE=",
        "AAAAAAAAAEZBY3RpdmF0ZXMgdGhlIHByb2plY3QgZXNjcm93IG9uY2UgYWxsIG1hbmRhdG9yeSByb2xlIGFjY2VwdGFuY2VzIGV4aXN0AAAAAAAIYWN0aXZhdGUAAAABAAAAAAAAAAZjYWxsZXIAAAAAABMAAAABAAAD6QAAAAIAAAfQAAAADkJ1aWxkQm9uZEVycm9yAAA=",
        "AAAAAAAAAAAAAAAIY292ZXJhZ2UAAAAAAAAAAQAAA+kAAAfQAAAADENvdmVyYWdlVmlldwAAB9AAAAAOQnVpbGRCb25kRXJyb3IAAA==",
        "AAAAAAAAAAAAAAAJY2xhaW1hYmxlAAAAAAAAAQAAAAAAAAAHYWRkcmVzcwAAAAATAAAAAQAAA+kAAAfQAAAADUNsYWltYWJsZVZpZXcAAAAAAAfQAAAADkJ1aWxkQm9uZEVycm9yAAA=",
        "AAAAAAAAAAAAAAAJbWlsZXN0b25lAAAAAAAAAQAAAAAAAAACaWQAAAAAAAQAAAABAAAD6QAAB9AAAAAJTWlsZXN0b25lAAAAAAAH0AAAAA5CdWlsZEJvbmRFcnJvcgAA",
        "AAAAAAAAAAAAAAAKYWNjb3VudGluZwAAAAAAAAAAAAEAAAPpAAAH0AAAAApBY2NvdW50aW5nAAAAAAfQAAAADkJ1aWxkQm9uZEVycm9yAAA=",
        "AAAAAAAAAPVFeHRlbmRzIHRoZSBsaWZldGltZSBvZiB0aGUgcHJvamVjdCBpbnN0YW5jZSBhbmQgYWxsIGR1cmFibGUgbWlsZXN0b25lL2Rpc3B1dGUgcmVjb3Jkcy4KT25seSB0aGUgcHJvamVjdCBvd25lciBtYXkgcmVuZXcgc3RvcmFnZSwgYW5kIHRoZSByZXF1ZXN0ZWQgbGlmZXRpbWUgaXMgYm91bmRlZCBieSB0aGUKbmV0d29yayBtYXhpbXVtIFRUTCB0byBhdm9pZCBjcmVhdGluZyB1bmJvdW5kZWQgcmV0ZW50aW9uIG9ibGlnYXRpb25zLgAAAAAAAApleHRlbmRfdHRsAAAAAAADAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAACXRocmVzaG9sZAAAAAAAAAQAAAAAAAAACWV4dGVuZF90bwAAAAAAAAQAAAABAAAD6QAAAAIAAAfQAAAADkJ1aWxkQm9uZEVycm9yAAA=",
        "AAAAAAAAAE9Jbml0aWFsaXplcyBhIGRlZGljYXRlZCBwcm9qZWN0IGVzY3JvdyB3aXRoIGFncmVlZCB0ZXJtcyBhbmQgbWlsZXN0b25lIHNjaGVkdWxlAAAAAAppbml0aWFsaXplAAAAAAACAAAAAAAAAAV0ZXJtcwAAAAAAB9AAAAAMUHJvamVjdFRlcm1zAAAAAAAAAAptaWxlc3RvbmVzAAAAAAPqAAAH0AAAAA5NaWxlc3RvbmVJbnB1dAAAAAAAAQAAA+kAAAACAAAH0AAAAA5CdWlsZEJvbmRFcnJvcgAA",
        "AAAAAAAAAElFeHBsaWNpdCBvbi1jaGFpbiBjcnlwdG9ncmFwaGljIHJvbGUgYWNjZXB0YW5jZSBib3VuZCB0byBleGFjdCB0ZXJtcyBoYXNoAAAAAAAAC2FjY2VwdF9yb2xlAAAAAAMAAAAAAAAABWFjdG9yAAAAAAAAEwAAAAAAAAAEcm9sZQAAB9AAAAAEUm9sZQAAAAAAAAAKdGVybXNfaGFzaAAAAAAD7gAAACAAAAABAAAD6QAAAAIAAAfQAAAADkJ1aWxkQm9uZEVycm9yAAA=",
        "AAAAAAAAADpFeHBsaWNpdCBvbi1jaGFpbiByb2xlIGRlY2xpbmUgd2l0aCBkb2N1bWVudGVkIHJlYXNvbiBoYXNoAAAAAAAMZGVjbGluZV9yb2xlAAAAAwAAAAAAAAAFYWN0b3IAAAAAAAATAAAAAAAAAARyb2xlAAAH0AAAAARSb2xlAAAAAAAAAAtyZWFzb25faGFzaAAAAAPuAAAAIAAAAAEAAAPpAAAAAgAAB9AAAAAOQnVpbGRCb25kRXJyb3IAAA==",
        "AAAAAAAAAEdPcGVucyBhIGZvcm1hbCBkaXNwdXRlIG9uIGEgbWlsZXN0b25lLCBmcmVlemluZyBmdW5kcyBhbmQgZGVmZWN0IHRpbWVycwAAAAAMb3Blbl9kaXNwdXRlAAAABAAAAAAAAAAJaW5pdGlhdG9yAAAAAAAAEwAAAAAAAAAMbWlsZXN0b25lX2lkAAAABAAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAtyZWFzb25faGFzaAAAAAPuAAAAIAAAAAEAAAPpAAAAAgAAB9AAAAAOQnVpbGRCb25kRXJyb3IAAA==",
        "AAAAAAAAAEFDbGFpbXMgbWF0dXJlIHJldGFpbmFnZSBhZnRlciB0aGUgZGVmZWN0IGxpYWJpbGl0eSBwZXJpb2QgZXhwaXJlcwAAAAAAAA9jbGFpbV9yZXRhaW5hZ2UAAAAAAgAAAAAAAAAKY29udHJhY3RvcgAAAAAAEwAAAAAAAAAMbWlsZXN0b25lX2lkAAAABAAAAAEAAAPpAAAAAgAAB9AAAAAOQnVpbGRCb25kRXJyb3IAAA==",
        "AAAAAAAAAD9SZXNvbHZlcyBhIGZvcm1hbCBkaXNwdXRlIHdpdGggYmluZGluZyBhcmJpdGVyIGF3YXJkIGFsbG9jYXRpb24AAAAAD3Jlc29sdmVfZGlzcHV0ZQAAAAAFAAAAAAAAAAdhcmJpdGVyAAAAABMAAAAAAAAADG1pbGVzdG9uZV9pZAAAAAQAAAAAAAAAEGNvbnRyYWN0b3JfYXdhcmQAAAALAAAAAAAAAAxvd25lcl9yZWZ1bmQAAAALAAAAAAAAAAtyZXBvcnRfaGFzaAAAAAPuAAAAIAAAAAEAAAPpAAAAAgAAB9AAAAAOQnVpbGRCb25kRXJyb3IAAA==",
        "AAAAAAAAAAAAAAAPcm9sZV9hY2NlcHRhbmNlAAAAAAEAAAAAAAAABHJvbGUAAAfQAAAABFJvbGUAAAABAAAD6AAAB9AAAAAOQWNjZXB0YW5jZVZpZXcAAA==",
        "AAAAAAAAAC5XaXRoZHJhd3MgZWFybmVkIHBheWFibGUgYmFsYW5jZSB0byBjb250cmFjdG9yAAAAAAAPd2l0aGRyYXdfZWFybmVkAAAAAAIAAAAAAAAACmNvbnRyYWN0b3IAAAAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAEAAAPpAAAAAgAAB9AAAAAOQnVpbGRCb25kRXJyb3IAAA==",
        "AAAAAAAAADVXaXRoZHJhd3MgdW5hbGxvY2F0ZWQgZnVuZHMgYmFjayB0byB0aGUgcHJvamVjdCBvd25lcgAAAAAAAA93aXRoZHJhd19yZWZ1bmQAAAAAAgAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAAAIAAAfQAAAADkJ1aWxkQm9uZEVycm9yAAA=",
        "AAAAAAAAADJTdWJtaXRzIGNvbXBsZXRlZCBtaWxlc3RvbmUgZXZpZGVuY2UgYnkgY29udHJhY3RvcgAAAAAAEHN1Ym1pdF9taWxlc3RvbmUAAAADAAAAAAAAAApjb250cmFjdG9yAAAAAAATAAAAAAAAAAxtaWxlc3RvbmVfaWQAAAAEAAAAAAAAAA1ldmlkZW5jZV9oYXNoAAAAAAAD7gAAACAAAAABAAAD6QAAAAIAAAfQAAAADkJ1aWxkQm9uZEVycm9yAAA=",
        "AAAAAAAAAE5JbnNwZWN0cyBhbmQgYXBwcm92ZXMgb3IgcmVqZWN0cyBhIHN1Ym1pdHRlZCBtaWxlc3RvbmUgYnkgYWNjcmVkaXRlZCBpbnNwZWN0b3IAAAAAABFpbnNwZWN0X21pbGVzdG9uZQAAAAAAAAQAAAAAAAAACWluc3BlY3RvcgAAAAAAABMAAAAAAAAADG1pbGVzdG9uZV9pZAAAAAQAAAAAAAAACGRlY2lzaW9uAAAH0AAAABJJbnNwZWN0aW9uRGVjaXNpb24AAAAAAAAAAAALcmVwb3J0X2hhc2gAAAAD7gAAACAAAAABAAAD6QAAAAIAAAfQAAAADkJ1aWxkQm9uZEVycm9yAAA=",
        "AAAAAAAAAEVBbGxvY2F0ZXMgdW5hbGxvY2F0ZWQgZGVwb3NpdGVkIGZ1bmRzIHRvIGEgc3BlY2lmaWMgcGxhbm5lZCBtaWxlc3RvbmUAAAAAAAAVYWxsb2NhdGVfdG9fbWlsZXN0b25lAAAAAAAAAwAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAxtaWxlc3RvbmVfaWQAAAAEAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAAAIAAAfQAAAADkJ1aWxkQm9uZEVycm9yAAA=",
        "AAAAAgAAAAAAAAAAAAAABFJvbGUAAAAEAAAAAAAAAAAAAAAFT3duZXIAAAAAAAAAAAAAAAAAAApDb250cmFjdG9yAAAAAAAAAAAAAAAAAAlJbnNwZWN0b3IAAAAAAAAAAAAAAAAAAAdBcmJpdGVyAA==",
        "AAAAAQAAAAAAAAAAAAAACU1pbGVzdG9uZQAAAAAAAA4AAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAALYXBwcm92ZWRfYXQAAAAD6AAAAAYAAAAAAAAAEmRlZmVjdF9kZWFkbGluZV9hdAAAAAAD6AAAAAYAAAAAAAAABmR1ZV9hdAAAAAAABgAAAAAAAAANZXZpZGVuY2VfaGFzaAAAAAAAA+gAAAPuAAAAIAAAAAAAAAAVZnJvemVuX3JlbWFpbmluZ19zZWNzAAAAAAAD6AAAAAYAAAAAAAAAAmlkAAAAAAAEAAAAAAAAABBpbW1lZGlhdGVfYW1vdW50AAAACwAAAAAAAAAYaW5zcGVjdGlvbl9kZWFkbGluZV9zZWNzAAAABgAAAAAAAAALcGFpZF9hbW91bnQAAAAACwAAAAAAAAAQcmV0YWluYWdlX2Ftb3VudAAAAAsAAAAAAAAAEXJldGFpbmVkX3JlbGVhc2VkAAAAAAAACwAAAAAAAAAGc3RhdHVzAAAAAAfQAAAAD01pbGVzdG9uZVN0YXR1cwAAAAAAAAAADHN1Ym1pdHRlZF9hdAAAA+gAAAAG",
        "AAAAAQAAAAAAAAAAAAAACkFjY291bnRpbmcAAAAAAAgAAAAAAAAACWFsbG9jYXRlZAAAAAAAAAsAAAAAAAAACWNvbW1pdHRlZAAAAAAAAAsAAAAAAAAAEmNvbnRyYWN0b3JfcGF5YWJsZQAAAAAACwAAAAAAAAAJZGVwb3NpdGVkAAAAAAAACwAAAAAAAAAIZGlzcHV0ZWQAAAALAAAAAAAAABBvd25lcl9yZWZ1bmRhYmxlAAAACwAAAAAAAAAQcmV0YWluYWdlX2xvY2tlZAAAAAsAAAAAAAAACXdpdGhkcmF3bgAAAAAAAAs=",
        "AAAAAQAAAAAAAAAAAAAAC1Byb2plY3RWaWV3AAAAAAQAAAAAAAAACmFjY291bnRpbmcAAAAAB9AAAAAKQWNjb3VudGluZwAAAAAAAAAAAA9taWxlc3RvbmVfY291bnQAAAAABAAAAAAAAAAGc3RhdHVzAAAAAAfQAAAADVByb2plY3RTdGF0dXMAAAAAAAAAAAAABXRlcm1zAAAAAAAH0AAAAAxQcm9qZWN0VGVybXM=",
        "AAAAAQAAAAAAAAAAAAAADENvdmVyYWdlVmlldwAAAAgAAAAAAAAACWFsbG9jYXRlZAAAAAAAAAsAAAAAAAAAEmNvdmVyYWdlX3JhdGlvX2JwcwAAAAAABAAAAAAAAAASY292ZXJlZF9taWxlc3RvbmVzAAAAAAAEAAAAAAAAAAlkZXBvc2l0ZWQAAAAAAAALAAAAAAAAABBpc19mdWxseV9jb3ZlcmVkAAAAAQAAAAAAAAAPdG90YWxfY29tbWl0dGVkAAAAAAsAAAAAAAAAEHRvdGFsX21pbGVzdG9uZXMAAAAEAAAAAAAAAAt1bmFsbG9jYXRlZAAAAAAL",
        "AAAAAQAAAAAAAAAAAAAADFByb2plY3RUZXJtcwAAAAoAAAAAAAAAB2FyYml0ZXIAAAAAEwAAAAAAAAAKY29udHJhY3RvcgAAAAAAEwAAAAAAAAASZGVmZWN0X3BlcmlvZF9zZWNzAAAAAAAGAAAAAAAAAA5mdW5kaW5nX3BvbGljeQAAAAAH0AAAAA1GdW5kaW5nUG9saWN5AAAAAAAAAAAAAAlpbnNwZWN0b3IAAAAAAAATAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAADXBheW1lbnRfdG9rZW4AAAAAAAATAAAAAAAAAA1yZXRhaW5hZ2VfYnBzAAAAAAAABAAAAAAAAAAKdGVybXNfaGFzaAAAAAAD7gAAACAAAAAAAAAAD3RvdGFsX2NvbW1pdHRlZAAAAAAL",
        "AAAAAQAAAAAAAAAAAAAADUNsYWltYWJsZVZpZXcAAAAAAAADAAAAAAAAABJjb250cmFjdG9yX3BheWFibGUAAAAAAAsAAAAAAAAAEG93bmVyX3JlZnVuZGFibGUAAAALAAAAAAAAABNyZXRhaW5hZ2VfY2xhaW1hYmxlAAAAAAs=",
        "AAAAAQAAAAAAAAAAAAAADURpc3B1dGVSZWNvcmQAAAAAAAAMAAAAAAAAAA9hbW91bnRfZGlzcHV0ZWQAAAAACwAAAAAAAAAQY29udHJhY3Rvcl9hd2FyZAAAAAsAAAAAAAAAFWZyb3plbl9yZW1haW5pbmdfc2VjcwAAAAAAA+gAAAAGAAAAAAAAAAlpbml0aWF0b3IAAAAAAAATAAAAAAAAAAxtaWxlc3RvbmVfaWQAAAAEAAAAAAAAAAlvcGVuZWRfYXQAAAAAAAAGAAAAAAAAAAxvd25lcl9yZWZ1bmQAAAALAAAAAAAAABlwcmV2aW91c19taWxlc3RvbmVfc3RhdHVzAAAAAAAH0AAAAA9NaWxlc3RvbmVTdGF0dXMAAAAAAAAAAAtyZWFzb25faGFzaAAAAAPuAAAAIAAAAAAAAAALcmVwb3J0X2hhc2gAAAAD6AAAA+4AAAAgAAAAAAAAAAtyZXNvbHZlZF9hdAAAAAPoAAAABgAAAAAAAAAGc3RhdHVzAAAAAAfQAAAADURpc3B1dGVTdGF0dXMAAAA=",
        "AAAAAwAAAAAAAAAAAAAADURpc3B1dGVTdGF0dXMAAAAAAAACAAAAAAAAAARPcGVuAAAAAQAAAAAAAAAIUmVzb2x2ZWQAAAAC",
        "AAAAAwAAAAAAAAAAAAAADUZ1bmRpbmdQb2xpY3kAAAAAAAACAAAAAAAAAAtGdWxseUZ1bmRlZAAAAAAAAAAAAAAAAAdSb2xsaW5nAAAAAAE=",
        "AAAAAgAAAAAAAAAAAAAADVByb2plY3RTdGF0dXMAAAAAAAAIAAAAAAAAAAAAAAAFRHJhZnQAAAAAAAAAAAAAAAAAABJBd2FpdGluZ0FjY2VwdGFuY2UAAAAAAAAAAAAAAAAAD0F3YWl0aW5nRnVuZGluZwAAAAAAAAAAAAAAAAZBY3RpdmUAAAAAAAAAAAAAAAAACVN1c3BlbmRlZAAAAAAAAAAAAAAAAAAAC1Rlcm1pbmF0aW5nAAAAAAAAAAAAAAAACUNvbXBsZXRlZAAAAAAAAAAAAAAAAAAAClRlcm1pbmF0ZWQAAA==",
        "AAAAAQAAAAAAAAAAAAAADkFjY2VwdGFuY2VWaWV3AAAAAAAHAAAAAAAAAAhhY2NlcHRlZAAAAAEAAAAAAAAABWFjdG9yAAAAAAAAEwAAAAAAAAAIZGVjbGluZWQAAAABAAAAAAAAAAtyZWFzb25faGFzaAAAAAPoAAAD7gAAACAAAAAAAAAABHJvbGUAAAfQAAAABFJvbGUAAAAAAAAACnRlcm1zX2hhc2gAAAAAA+gAAAPuAAAAIAAAAAAAAAAJdGltZXN0YW1wAAAAAAAABg==",
        "AAAABAAAAAAAAAAAAAAADkJ1aWxkQm9uZEVycm9yAAAAAAAlAAAAAAAAABJBbHJlYWR5SW5pdGlhbGl6ZWQAAAAAAAEAAAAAAAAADk5vdEluaXRpYWxpemVkAAAAAAACAAAAAAAAAAxVbmF1dGhvcml6ZWQAAAADAAAAAAAAAA5JbnZhbGlkQWRkcmVzcwAAAAAABAAAAAAAAAANSW52YWxpZEFtb3VudAAAAAAAAAUAAAAAAAAAEkludmFsaWRCYXNpc1BvaW50cwAAAAAABgAAAAAAAAAQSW52YWxpZFRpbWVzdGFtcAAAAAcAAAAAAAAAEEludmFsaWRUZXJtc0hhc2gAAAAIAAAAAAAAAAxJbnZhbGlkU3RhdGUAAAAJAAAAAAAAABBQcm9qZWN0Tm90QWN0aXZlAAAACgAAAAAAAAAPUm9sZU5vdEFjY2VwdGVkAAAAAAsAAAAAAAAAE1JvbGVBbHJlYWR5QWNjZXB0ZWQAAAAADAAAAAAAAAAWUmVwbGFjZW1lbnROb3RBcHByb3ZlZAAAAAAADQAAAAAAAAARTWlsZXN0b25lTm90Rm91bmQAAAAAAAAOAAAAAAAAABlNaWxlc3RvbmVBbHJlYWR5U3VibWl0dGVkAAAAAAAADwAAAAAAAAAYTWlsZXN0b25lQWxyZWFkeUFwcHJvdmVkAAAAEAAAAAAAAAASTWlsZXN0b25lTm90RnVuZGVkAAAAAAARAAAAAAAAABhJbnNwZWN0aW9uRGVhZGxpbmVQYXNzZWQAAAASAAAAAAAAABRJbnN1ZmZpY2llbnRDb3ZlcmFnZQAAABMAAAAAAAAAGUluc3VmZmljaWVudEVzY3Jvd0JhbGFuY2UAAAAAAAAUAAAAAAAAABFOb3RoaW5nVG9XaXRoZHJhdwAAAAAAABUAAAAAAAAAElJldGFpbmFnZU5vdE1hdHVyZQAAAAAAFgAAAAAAAAAYUmV0YWluYWdlQWxyZWFkeVJlbGVhc2VkAAAAFwAAAAAAAAANQWN0aXZlRGlzcHV0ZQAAAAAAABgAAAAAAAAAD0Rpc3B1dGVOb3RGb3VuZAAAAAAZAAAAAAAAABZEaXNwdXRlQWxyZWFkeVJlc29sdmVkAAAAAAAaAAAAAAAAABRJbnZhbGlkRGlzcHV0ZUFtb3VudAAAABsAAAAAAAAAFkludmFsaWRBd2FyZEFsbG9jYXRpb24AAAAAABwAAAAAAAAAGUFyYml0cmF0aW9uRGVhZGxpbmVQYXNzZWQAAAAAAAAdAAAAAAAAABZDaGFuZ2VPcmRlck5vdEFjY2VwdGVkAAAAAAAeAAAAAAAAABRDaGFuZ2VPcmRlck5vdEZ1bmRlZAAAAB8AAAAAAAAAFlRlcm1pbmF0aW9uTm90QWNjZXB0ZWQAAAAAACAAAAAAAAAAEkFyaXRobWV0aWNPdmVyZmxvdwAAAAAAIQAAAAAAAAATVG9rZW5UcmFuc2ZlckZhaWxlZAAAAAAiAAAAAAAAAA1SZWVudHJhbnRDYWxsAAAAAAAAIwAAAAAAAAAVSW52YWxpZE1pbGVzdG9uZUNvdW50AAAAAAAAJAAAAAAAAAAUTWlsZXN0b25lU3VtTWlzbWF0Y2gAAAAl",
        "AAAAAQAAAAAAAAAAAAAADk1pbGVzdG9uZUlucHV0AAAAAAAEAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAABmR1ZV9hdAAAAAAABgAAAAAAAAACaWQAAAAAAAQAAAAAAAAAGGluc3BlY3Rpb25fZGVhZGxpbmVfc2VjcwAAAAY=",
        "AAAAAgAAAAAAAAAAAAAAD01pbGVzdG9uZVN0YXR1cwAAAAALAAAAAAAAAAAAAAAHUGxhbm5lZAAAAAAAAAAAAAAAAAZGdW5kZWQAAAAAAAAAAAAAAAAACVN1Ym1pdHRlZAAAAAAAAAAAAAAAAAAACFJlamVjdGVkAAAAAAAAAAAAAAAIQXBwcm92ZWQAAAAAAAAAAAAAAA5JbkRlZmVjdFBlcmlvZAAAAAAAAAAAAAAAAAAIRGlzcHV0ZWQAAAAAAAAAAAAAAA5SZXdvcmtSZXF1aXJlZAAAAAAAAAAAAAAAAAASUmV0YWluYWdlQ2xhaW1hYmxlAAAAAAAAAAAAAAAAAAdTZXR0bGVkAAAAAAAAAAAAAAAACUNhbmNlbGxlZAAAAA==",
        "AAAAAwAAAAAAAAAAAAAAEkluc3BlY3Rpb25EZWNpc2lvbgAAAAAAAgAAAAAAAAAHQXBwcm92ZQAAAAABAAAAAAAAAAZSZWplY3QAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAAEVJvbGVBY2NlcHRlZEV2ZW50AAAAAAAAAQAAABNyb2xlX2FjY2VwdGVkX2V2ZW50AAAAAAQAAAAAAAAABHJvbGUAAAfQAAAABFJvbGUAAAAAAAAAAAAAAAVhY3RvcgAAAAAAABMAAAAAAAAAAAAAAAp0ZXJtc19oYXNoAAAAAAPuAAAAIAAAAAAAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAYAAAAAAAAAAg==",
        "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" ]),
      options
    )
  }
  public readonly fromJSON = {
    deposit: this.txFromJSON<Result<void>>,
        dispute: this.txFromJSON<Option<DisputeRecord>>,
        project: this.txFromJSON<Result<ProjectView>>,
        version: this.txFromJSON<string>,
        activate: this.txFromJSON<Result<void>>,
        coverage: this.txFromJSON<Result<CoverageView>>,
        claimable: this.txFromJSON<Result<ClaimableView>>,
        milestone: this.txFromJSON<Result<Milestone>>,
        accounting: this.txFromJSON<Result<Accounting>>,
        extend_ttl: this.txFromJSON<Result<void>>,
        initialize: this.txFromJSON<Result<void>>,
        accept_role: this.txFromJSON<Result<void>>,
        decline_role: this.txFromJSON<Result<void>>,
        open_dispute: this.txFromJSON<Result<void>>,
        claim_retainage: this.txFromJSON<Result<void>>,
        resolve_dispute: this.txFromJSON<Result<void>>,
        role_acceptance: this.txFromJSON<Option<AcceptanceView>>,
        withdraw_earned: this.txFromJSON<Result<void>>,
        withdraw_refund: this.txFromJSON<Result<void>>,
        submit_milestone: this.txFromJSON<Result<void>>,
        inspect_milestone: this.txFromJSON<Result<void>>,
        allocate_to_milestone: this.txFromJSON<Result<void>>
  }
}
