use crate::types::{
    AcceptanceView, Accounting, BuildBondError, Milestone, ProjectStatus, ProjectTerms, Role,
};
use soroban_sdk::{contracttype, Address, Env};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Initialized,
    Terms,
    Status,
    Accounting,
    MilestoneCount,
    Milestone(u32),
    RoleAcceptance(Role),
}

pub fn is_initialized(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Initialized)
}

pub fn set_initialized(env: &Env) {
    env.storage().instance().set(&DataKey::Initialized, &true);
}

pub fn get_terms(env: &Env) -> Result<ProjectTerms, BuildBondError> {
    env.storage()
        .instance()
        .get(&DataKey::Terms)
        .ok_or(BuildBondError::NotInitialized)
}

pub fn set_terms(env: &Env, terms: &ProjectTerms) {
    env.storage().instance().set(&DataKey::Terms, terms);
}

pub fn get_status(env: &Env) -> Result<ProjectStatus, BuildBondError> {
    env.storage()
        .instance()
        .get(&DataKey::Status)
        .ok_or(BuildBondError::NotInitialized)
}

pub fn set_status(env: &Env, status: &ProjectStatus) {
    env.storage().instance().set(&DataKey::Status, status);
}

pub fn get_accounting(env: &Env) -> Result<Accounting, BuildBondError> {
    env.storage()
        .instance()
        .get(&DataKey::Accounting)
        .ok_or(BuildBondError::NotInitialized)
}

pub fn set_accounting(env: &Env, accounting: &Accounting) {
    env.storage()
        .instance()
        .set(&DataKey::Accounting, accounting);
}

pub fn get_milestone_count(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::MilestoneCount)
        .unwrap_or(0)
}

pub fn set_milestone_count(env: &Env, count: u32) {
    env.storage()
        .instance()
        .set(&DataKey::MilestoneCount, &count);
}

pub fn get_milestone(env: &Env, id: u32) -> Result<Milestone, BuildBondError> {
    env.storage()
        .persistent()
        .get(&DataKey::Milestone(id))
        .ok_or(BuildBondError::MilestoneNotFound)
}

pub fn set_milestone(env: &Env, id: u32, milestone: &Milestone) {
    env.storage()
        .persistent()
        .set(&DataKey::Milestone(id), milestone);
}

pub fn get_role_acceptance(env: &Env, role: Role) -> Option<AcceptanceView> {
    env.storage().instance().get(&DataKey::RoleAcceptance(role))
}

pub fn set_role_acceptance(env: &Env, role: Role, acceptance: &AcceptanceView) {
    env.storage()
        .instance()
        .set(&DataKey::RoleAcceptance(role), acceptance);
}

pub fn get_role_address(terms: &ProjectTerms, role: Role) -> Address {
    match role {
        Role::Owner => terms.owner.clone(),
        Role::Contractor => terms.contractor.clone(),
        Role::Inspector => terms.inspector.clone(),
        Role::Arbiter => terms.arbiter.clone(),
    }
}
