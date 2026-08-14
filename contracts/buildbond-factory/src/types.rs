use soroban_sdk::{contracterror, contracttype, Address, BytesN};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum FactoryError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    InvalidWasmHash = 4,
    ProjectAlreadyExists = 5,
    ProjectNotFound = 6,
    InvalidAmount = 7,
    ArithmeticOverflow = 8,
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
pub struct ProjectMetadata {
    pub project_id: u32,
    pub escrow_address: Address,
    pub salt: BytesN<32>,
    pub escrow_wasm_hash: BytesN<32>,
    pub title_hash: BytesN<32>,
    pub terms_hash: BytesN<32>,
    pub owner: Address,
    pub contractor: Address,
    pub inspector: Address,
    pub arbiter: Address,
    pub payment_token: Address,
    pub total_committed: i128,
    pub created_at: u64,
}
