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

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProjectFundedEvent {
    pub funder: Address,
    pub amount: i128,
    pub new_deposited: i128,
    pub coverage_ratio_bps: u32,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MilestoneFundedEvent {
    pub milestone_id: u32,
    pub amount: i128,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RefundWithdrawnEvent {
    pub owner: Address,
    pub amount: i128,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MilestoneSubmittedEvent {
    pub milestone_id: u32,
    pub contractor: Address,
    pub evidence_hash: BytesN<32>,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InspectionRecordedEvent {
    pub milestone_id: u32,
    pub inspector: Address,
    pub decision: u32, // 1 = Approve, 2 = Reject
    pub report_hash: BytesN<32>,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MilestoneApprovedEvent {
    pub milestone_id: u32,
    pub immediate_amount: i128,
    pub retainage_amount: i128,
    pub defect_deadline_at: u64,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentWithdrawnEvent {
    pub beneficiary: Address,
    pub amount: i128,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RetainageClaimedEvent {
    pub milestone_id: u32,
    pub contractor: Address,
    pub amount: i128,
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

pub fn emit_project_funded(
    env: &Env,
    funder: &Address,
    amount: i128,
    new_deposited: i128,
    coverage_ratio_bps: u32,
    timestamp: u64,
) {
    ProjectFundedEvent {
        funder: funder.clone(),
        amount,
        new_deposited,
        coverage_ratio_bps,
        timestamp,
    }
    .publish(env);
}

pub fn emit_milestone_funded(env: &Env, milestone_id: u32, amount: i128, timestamp: u64) {
    MilestoneFundedEvent {
        milestone_id,
        amount,
        timestamp,
    }
    .publish(env);
}

pub fn emit_refund_withdrawn(env: &Env, owner: &Address, amount: i128, timestamp: u64) {
    RefundWithdrawnEvent {
        owner: owner.clone(),
        amount,
        timestamp,
    }
    .publish(env);
}

pub fn emit_milestone_submitted(
    env: &Env,
    milestone_id: u32,
    contractor: &Address,
    evidence_hash: &BytesN<32>,
    timestamp: u64,
) {
    MilestoneSubmittedEvent {
        milestone_id,
        contractor: contractor.clone(),
        evidence_hash: evidence_hash.clone(),
        timestamp,
    }
    .publish(env);
}

pub fn emit_inspection_recorded(
    env: &Env,
    milestone_id: u32,
    inspector: &Address,
    decision: u32,
    report_hash: &BytesN<32>,
    timestamp: u64,
) {
    InspectionRecordedEvent {
        milestone_id,
        inspector: inspector.clone(),
        decision,
        report_hash: report_hash.clone(),
        timestamp,
    }
    .publish(env);
}

pub fn emit_milestone_approved(
    env: &Env,
    milestone_id: u32,
    immediate_amount: i128,
    retainage_amount: i128,
    defect_deadline_at: u64,
    timestamp: u64,
) {
    MilestoneApprovedEvent {
        milestone_id,
        immediate_amount,
        retainage_amount,
        defect_deadline_at,
        timestamp,
    }
    .publish(env);
}

pub fn emit_payment_withdrawn(env: &Env, beneficiary: &Address, amount: i128, timestamp: u64) {
    PaymentWithdrawnEvent {
        beneficiary: beneficiary.clone(),
        amount,
        timestamp,
    }
    .publish(env);
}

pub fn emit_retainage_claimed(
    env: &Env,
    milestone_id: u32,
    contractor: &Address,
    amount: i128,
    timestamp: u64,
) {
    RetainageClaimedEvent {
        milestone_id,
        contractor: contractor.clone(),
        amount,
        timestamp,
    }
    .publish(env);
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DisputeOpenedEvent {
    pub milestone_id: u32,
    pub initiator: Address,
    pub amount_disputed: i128,
    pub reason_hash: BytesN<32>,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DisputeResolvedEvent {
    pub milestone_id: u32,
    pub arbiter: Address,
    pub contractor_award: i128,
    pub owner_refund: i128,
    pub report_hash: BytesN<32>,
    pub timestamp: u64,
}

pub fn emit_dispute_opened(
    env: &Env,
    milestone_id: u32,
    initiator: &Address,
    amount_disputed: i128,
    reason_hash: &BytesN<32>,
    timestamp: u64,
) {
    DisputeOpenedEvent {
        milestone_id,
        initiator: initiator.clone(),
        amount_disputed,
        reason_hash: reason_hash.clone(),
        timestamp,
    }
    .publish(env);
}

pub fn emit_dispute_resolved(
    env: &Env,
    milestone_id: u32,
    arbiter: &Address,
    contractor_award: i128,
    owner_refund: i128,
    report_hash: &BytesN<32>,
    timestamp: u64,
) {
    DisputeResolvedEvent {
        milestone_id,
        arbiter: arbiter.clone(),
        contractor_award,
        owner_refund,
        report_hash: report_hash.clone(),
        timestamp,
    }
    .publish(env);
}
