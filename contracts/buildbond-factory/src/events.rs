use soroban_sdk::{contractevent, Address, BytesN, Env};

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProjectDeployedEvent {
    pub project_id: u32,
    pub escrow_address: Address,
    pub owner: Address,
    pub contractor: Address,
    pub total_committed: i128,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WasmHashUpdatedEvent {
    pub old_wasm_hash: BytesN<32>,
    pub new_wasm_hash: BytesN<32>,
    pub admin: Address,
    pub timestamp: u64,
}

pub fn emit_project_deployed(
    env: &Env,
    project_id: u32,
    escrow_address: &Address,
    owner: &Address,
    contractor: &Address,
    total_committed: i128,
    timestamp: u64,
) {
    ProjectDeployedEvent {
        project_id,
        escrow_address: escrow_address.clone(),
        owner: owner.clone(),
        contractor: contractor.clone(),
        total_committed,
        timestamp,
    }
    .publish(env);
}

pub fn emit_wasm_hash_updated(
    env: &Env,
    old_wasm_hash: &BytesN<32>,
    new_wasm_hash: &BytesN<32>,
    admin: &Address,
    timestamp: u64,
) {
    WasmHashUpdatedEvent {
        old_wasm_hash: old_wasm_hash.clone(),
        new_wasm_hash: new_wasm_hash.clone(),
        admin: admin.clone(),
        timestamp,
    }
    .publish(env);
}
