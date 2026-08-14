use crate::types::{FactoryError, ProjectMetadata};
use soroban_sdk::{contracttype, Address, BytesN, Env, Vec};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Initialized,
    Admin,
    WasmHash,
    ProjectCount,
    Project(u32),
    ProjectByAddress(Address),
    ProjectBySalt(BytesN<32>),
    ProjectsByParticipant(Address),
}

pub fn is_initialized(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Initialized)
}

pub fn set_initialized(env: &Env) {
    env.storage().instance().set(&DataKey::Initialized, &true);
}

pub fn get_admin(env: &Env) -> Result<Address, FactoryError> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(FactoryError::NotInitialized)
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn get_wasm_hash(env: &Env) -> Result<BytesN<32>, FactoryError> {
    env.storage()
        .instance()
        .get(&DataKey::WasmHash)
        .ok_or(FactoryError::NotInitialized)
}

pub fn set_wasm_hash(env: &Env, wasm_hash: &BytesN<32>) {
    env.storage().instance().set(&DataKey::WasmHash, wasm_hash);
}

pub fn get_project_count(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::ProjectCount)
        .unwrap_or(0)
}

pub fn set_project_count(env: &Env, count: u32) {
    env.storage().instance().set(&DataKey::ProjectCount, &count);
}

pub fn get_project(env: &Env, id: u32) -> Option<ProjectMetadata> {
    env.storage().persistent().get(&DataKey::Project(id))
}

pub fn set_project(env: &Env, id: u32, metadata: &ProjectMetadata) {
    env.storage()
        .persistent()
        .set(&DataKey::Project(id), metadata);
}

pub fn get_project_by_address(env: &Env, escrow_address: &Address) -> Option<ProjectMetadata> {
    env.storage()
        .persistent()
        .get(&DataKey::ProjectByAddress(escrow_address.clone()))
}

pub fn set_project_by_address(env: &Env, escrow_address: &Address, metadata: &ProjectMetadata) {
    env.storage()
        .persistent()
        .set(&DataKey::ProjectByAddress(escrow_address.clone()), metadata);
}

pub fn get_project_by_salt(env: &Env, salt: &BytesN<32>) -> Option<ProjectMetadata> {
    env.storage()
        .persistent()
        .get(&DataKey::ProjectBySalt(salt.clone()))
}

pub fn set_project_by_salt(env: &Env, salt: &BytesN<32>, metadata: &ProjectMetadata) {
    env.storage()
        .persistent()
        .set(&DataKey::ProjectBySalt(salt.clone()), metadata);
}

pub fn get_projects_by_participant(env: &Env, participant: &Address) -> Vec<Address> {
    env.storage()
        .persistent()
        .get(&DataKey::ProjectsByParticipant(participant.clone()))
        .unwrap_or_else(|| Vec::new(env))
}

pub fn add_project_to_participant(env: &Env, participant: &Address, escrow_address: &Address) {
    let mut list = get_projects_by_participant(env, participant);
    if !list.contains(escrow_address) {
        list.push_back(escrow_address.clone());
        env.storage()
            .persistent()
            .set(&DataKey::ProjectsByParticipant(participant.clone()), &list);
    }
}
