use soroban_sdk::{contracterror, contracttype, Address, BytesN};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum BuildBondError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidAddress = 4,
    InvalidAmount = 5,
    InvalidBasisPoints = 6,
    InvalidTimestamp = 7,
    InvalidTermsHash = 8,
    InvalidState = 9,
    ProjectNotActive = 10,
    RoleNotAccepted = 11,
    RoleAlreadyAccepted = 12,
    ReplacementNotApproved = 13,
    MilestoneNotFound = 14,
    MilestoneAlreadySubmitted = 15,
    MilestoneAlreadyApproved = 16,
    MilestoneNotFunded = 17,
    InspectionDeadlinePassed = 18,
    InsufficientCoverage = 19,
    InsufficientEscrowBalance = 20,
    NothingToWithdraw = 21,
    RetainageNotMature = 22,
    RetainageAlreadyReleased = 23,
    ActiveDispute = 24,
    DisputeNotFound = 25,
    DisputeAlreadyResolved = 26,
    InvalidDisputeAmount = 27,
    InvalidAwardAllocation = 28,
    ArbitrationDeadlinePassed = 29,
    ChangeOrderNotAccepted = 30,
    ChangeOrderNotFunded = 31,
    TerminationNotAccepted = 32,
    ArithmeticOverflow = 33,
    TokenTransferFailed = 34,
    ReentrantCall = 35,
    InvalidMilestoneCount = 36,
    MilestoneSumMismatch = 37,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum ProjectStatus {
    Draft,
    AwaitingAcceptance,
    AwaitingFunding,
    Active,
    Suspended,
    Terminating,
    Completed,
    Terminated,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum MilestoneStatus {
    Planned,
    Funded,
    Submitted,
    Rejected,
    Approved,
    InDefectPeriod,
    Disputed,
    ReworkRequired,
    RetainageClaimable,
    Settled,
    Cancelled,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Role {
    Owner,
    Contractor,
    Inspector,
    Arbiter,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum FundingPolicy {
    FullyFunded = 0,
    Rolling = 1,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProjectTerms {
    pub owner: Address,
    pub contractor: Address,
    pub inspector: Address,
    pub arbiter: Address,
    pub payment_token: Address,
    pub total_committed: i128,
    pub retainage_bps: u32,
    pub defect_period_secs: u64,
    pub terms_hash: BytesN<32>,
    pub funding_policy: FundingPolicy,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MilestoneInput {
    pub id: u32,
    pub amount: i128,
    pub due_at: u64,
    pub inspection_deadline_secs: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Milestone {
    pub id: u32,
    pub amount: i128,
    pub due_at: u64,
    pub submitted_at: Option<u64>,
    pub inspection_deadline_secs: u64,
    pub evidence_hash: Option<BytesN<32>>,
    pub status: MilestoneStatus,
    pub immediate_amount: i128,
    pub retainage_amount: i128,
    pub approved_at: Option<u64>,
    pub defect_deadline_at: Option<u64>,
    pub frozen_remaining_secs: Option<u64>,
    pub paid_amount: i128,
    pub retained_released: i128,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct Accounting {
    pub deposited: i128,
    pub committed: i128,
    pub allocated: i128,
    pub contractor_payable: i128,
    pub retainage_locked: i128,
    pub disputed: i128,
    pub owner_refundable: i128,
    pub withdrawn: i128,
}

impl Accounting {
    pub fn new(committed: i128) -> Self {
        Self {
            deposited: 0,
            committed,
            allocated: 0,
            contractor_payable: 0,
            retainage_locked: 0,
            disputed: 0,
            owner_refundable: 0,
            withdrawn: 0,
        }
    }
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AcceptanceView {
    pub role: Role,
    pub actor: Address,
    pub accepted: bool,
    pub declined: bool,
    pub timestamp: u64,
    pub terms_hash: Option<BytesN<32>>,
    pub reason_hash: Option<BytesN<32>>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProjectView {
    pub terms: ProjectTerms,
    pub status: ProjectStatus,
    pub milestone_count: u32,
    pub accounting: Accounting,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CoverageView {
    pub total_committed: i128,
    pub deposited: i128,
    pub allocated: i128,
    pub unallocated: i128,
    pub covered_milestones: u32,
    pub total_milestones: u32,
    pub coverage_ratio_bps: u32,
    pub is_fully_covered: bool,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum InspectionDecision {
    Approve = 1,
    Reject = 2,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ClaimableView {
    pub contractor_payable: i128,
    pub retainage_claimable: i128,
    pub owner_refundable: i128,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum DisputeStatus {
    Open = 1,
    Resolved = 2,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DisputeRecord {
    pub milestone_id: u32,
    pub initiator: Address,
    pub reason_hash: BytesN<32>,
    pub opened_at: u64,
    pub amount_disputed: i128,
    pub status: DisputeStatus,
    pub previous_milestone_status: MilestoneStatus,
    pub frozen_remaining_secs: Option<u64>,
    pub report_hash: Option<BytesN<32>>,
    pub contractor_award: i128,
    pub owner_refund: i128,
    pub resolved_at: Option<u64>,
}
