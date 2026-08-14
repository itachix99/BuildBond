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
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProjectMetadata {
    pub project_id: u32,
    pub escrow_address: Address,
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
