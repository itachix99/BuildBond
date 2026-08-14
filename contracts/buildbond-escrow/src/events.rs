use crate::types::{ProjectTerms, Role};
use soroban_sdk::{contractevent, Address, BytesN, Env};

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProjectCreatedEvent {
    pub owner: Address,
    pub contractor: Address,
    pub payment_token: Address,
    pub terms_hash: BytesN<32>,
    pub total_committed: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoleAcceptedEvent {
    pub role: Role,
    pub actor: Address,
    pub terms_hash: BytesN<32>,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoleDeclinedEvent {
    pub role: Role,
    pub actor: Address,
    pub reason_hash: BytesN<32>,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProjectActivatedEvent {
    pub caller: Address,
    pub timestamp: u64,
}

pub fn emit_project_created(env: &Env, terms: &ProjectTerms) {
    ProjectCreatedEvent {
        owner: terms.owner.clone(),
        contractor: terms.contractor.clone(),
        payment_token: terms.payment_token.clone(),
        terms_hash: terms.terms_hash.clone(),
        total_committed: terms.total_committed,
    }
    .publish(env);
}

pub fn emit_role_accepted(
    env: &Env,
    role: Role,
    actor: &Address,
    terms_hash: &BytesN<32>,
    timestamp: u64,
) {
    RoleAcceptedEvent {
        role,
        actor: actor.clone(),
        terms_hash: terms_hash.clone(),
        timestamp,
    }
    .publish(env);
}

pub fn emit_role_declined(
    env: &Env,
    role: Role,
    actor: &Address,
    reason_hash: &BytesN<32>,
    timestamp: u64,
) {
    RoleDeclinedEvent {
        role,
        actor: actor.clone(),
        reason_hash: reason_hash.clone(),
        timestamp,
    }
    .publish(env);
}

pub fn emit_project_activated(env: &Env, caller: &Address, timestamp: u64) {
    ProjectActivatedEvent {
        caller: caller.clone(),
        timestamp,
    }
    .publish(env);
}
