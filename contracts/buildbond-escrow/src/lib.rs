#![no_std]

pub mod events;
pub mod storage;
pub mod types;

#[cfg(test)]
pub mod test;

use events::{
    emit_project_activated, emit_project_created, emit_role_accepted, emit_role_declined,
};
use storage::{
    get_accounting, get_milestone, get_milestone_count, get_role_acceptance, get_role_address,
    get_status, get_terms, is_initialized, set_accounting, set_initialized, set_milestone,
    set_milestone_count, set_role_acceptance, set_status, set_terms,
};
use types::{
    AcceptanceView, Accounting, BuildBondError, Milestone, MilestoneInput, MilestoneStatus,
    ProjectStatus, ProjectTerms, ProjectView, Role,
};

use soroban_sdk::{contract, contractimpl, symbol_short, Address, BytesN, Env, Symbol, Vec};

#[contract]
pub struct BuildBondEscrowContract;

#[contractimpl]
impl BuildBondEscrowContract {
    /// Returns the contract version symbol
    pub fn version(_env: Env) -> Symbol {
        symbol_short!("v0_1_0")
    }

    /// Initializes a dedicated project escrow with agreed terms and milestone schedule
    pub fn initialize(
        env: Env,
        terms: ProjectTerms,
        milestones: Vec<MilestoneInput>,
    ) -> Result<(), BuildBondError> {
        if is_initialized(&env) {
            return Err(BuildBondError::AlreadyInitialized);
        }

        // 1. Authorize owner
        terms.owner.require_auth();

        // 2. Validate terms
        if terms.total_committed <= 0 {
            return Err(BuildBondError::InvalidAmount);
        }
        if terms.retainage_bps > 10_000 {
            return Err(BuildBondError::InvalidBasisPoints);
        }
        if terms.defect_period_secs == 0 {
            return Err(BuildBondError::InvalidTimestamp);
        }
        if milestones.is_empty() {
            return Err(BuildBondError::InvalidMilestoneCount);
        }

        // 3. Validate milestones and sum
        let mut milestone_sum: i128 = 0;
        let mut expected_id: u32 = 1;

        for m in milestones.iter() {
            if m.id != expected_id {
                return Err(BuildBondError::InvalidState);
            }
            if m.amount <= 0 {
                return Err(BuildBondError::InvalidAmount);
            }
            if m.inspection_deadline_secs == 0 {
                return Err(BuildBondError::InvalidTimestamp);
            }

            milestone_sum = milestone_sum
                .checked_add(m.amount)
                .ok_or(BuildBondError::ArithmeticOverflow)?;

            let milestone_record = Milestone {
                id: m.id,
                amount: m.amount,
                due_at: m.due_at,
                inspection_deadline_secs: m.inspection_deadline_secs,
                evidence_hash: None,
                status: MilestoneStatus::Planned,
                immediate_amount: 0,
                retainage_amount: 0,
                approved_at: None,
                defect_deadline_at: None,
                frozen_remaining_secs: None,
                paid_amount: 0,
                retained_released: 0,
            };

            set_milestone(&env, m.id, &milestone_record);
            expected_id = expected_id
                .checked_add(1)
                .ok_or(BuildBondError::ArithmeticOverflow)?;
        }

        if milestone_sum != terms.total_committed {
            return Err(BuildBondError::MilestoneSumMismatch);
        }

        // 4. Store initial state
        set_terms(&env, &terms);
        set_status(&env, &ProjectStatus::AwaitingAcceptance);
        set_accounting(&env, &Accounting::new(terms.total_committed));
        set_milestone_count(&env, milestones.len());

        // Record Owner auto-acceptance
        let owner_acceptance = AcceptanceView {
            role: Role::Owner,
            actor: terms.owner.clone(),
            accepted: true,
            declined: false,
            timestamp: env.ledger().timestamp(),
            terms_hash: Some(terms.terms_hash.clone()),
            reason_hash: None,
        };
        set_role_acceptance(&env, Role::Owner, &owner_acceptance);

        set_initialized(&env);
        emit_project_created(&env, &terms);

        Ok(())
    }

    /// Explicit on-chain cryptographic role acceptance bound to exact terms hash
    pub fn accept_role(
        env: Env,
        actor: Address,
        role: Role,
        terms_hash: BytesN<32>,
    ) -> Result<(), BuildBondError> {
        if !is_initialized(&env) {
            return Err(BuildBondError::NotInitialized);
        }

        let status = get_status(&env)?;
        if status != ProjectStatus::AwaitingAcceptance {
            return Err(BuildBondError::InvalidState);
        }

        actor.require_auth();

        let terms = get_terms(&env)?;
        let expected_address = get_role_address(&terms, role);
        if actor != expected_address {
            return Err(BuildBondError::Unauthorized);
        }

        if terms_hash != terms.terms_hash {
            return Err(BuildBondError::InvalidTermsHash);
        }

        if let Some(existing) = get_role_acceptance(&env, role) {
            if existing.accepted {
                return Err(BuildBondError::RoleAlreadyAccepted);
            }
        }

        let acceptance = AcceptanceView {
            role,
            actor: actor.clone(),
            accepted: true,
            declined: false,
            timestamp: env.ledger().timestamp(),
            terms_hash: Some(terms_hash.clone()),
            reason_hash: None,
        };

        set_role_acceptance(&env, role, &acceptance);
        emit_role_accepted(&env, role, &actor, &terms_hash, env.ledger().timestamp());

        Ok(())
    }

    /// Explicit on-chain role decline with documented reason hash
    pub fn decline_role(
        env: Env,
        actor: Address,
        role: Role,
        reason_hash: BytesN<32>,
    ) -> Result<(), BuildBondError> {
        if !is_initialized(&env) {
            return Err(BuildBondError::NotInitialized);
        }

        let status = get_status(&env)?;
        if status != ProjectStatus::AwaitingAcceptance {
            return Err(BuildBondError::InvalidState);
        }

        actor.require_auth();

        let terms = get_terms(&env)?;
        let expected_address = get_role_address(&terms, role);
        if actor != expected_address {
            return Err(BuildBondError::Unauthorized);
        }

        let acceptance = AcceptanceView {
            role,
            actor: actor.clone(),
            accepted: false,
            declined: true,
            timestamp: env.ledger().timestamp(),
            terms_hash: None,
            reason_hash: Some(reason_hash.clone()),
        };

        set_role_acceptance(&env, role, &acceptance);
        set_status(&env, &ProjectStatus::Suspended);
        emit_role_declined(&env, role, &actor, &reason_hash, env.ledger().timestamp());

        Ok(())
    }

    /// Activates the project escrow once all mandatory role acceptances exist
    pub fn activate(env: Env, caller: Address) -> Result<(), BuildBondError> {
        if !is_initialized(&env) {
            return Err(BuildBondError::NotInitialized);
        }

        let status = get_status(&env)?;
        if status != ProjectStatus::AwaitingAcceptance && status != ProjectStatus::AwaitingFunding {
            return Err(BuildBondError::InvalidState);
        }

        caller.require_auth();

        // Verify contractor, inspector, and arbiter have accepted
        let contractor_acc =
            get_role_acceptance(&env, Role::Contractor).ok_or(BuildBondError::RoleNotAccepted)?;
        if !contractor_acc.accepted {
            return Err(BuildBondError::RoleNotAccepted);
        }

        let inspector_acc =
            get_role_acceptance(&env, Role::Inspector).ok_or(BuildBondError::RoleNotAccepted)?;
        if !inspector_acc.accepted {
            return Err(BuildBondError::RoleNotAccepted);
        }

        let arbiter_acc =
            get_role_acceptance(&env, Role::Arbiter).ok_or(BuildBondError::RoleNotAccepted)?;
        if !arbiter_acc.accepted {
            return Err(BuildBondError::RoleNotAccepted);
        }

        set_status(&env, &ProjectStatus::Active);
        emit_project_activated(&env, &caller, env.ledger().timestamp());

        Ok(())
    }

    // --- Read Methods ---

    pub fn project(env: Env) -> Result<ProjectView, BuildBondError> {
        let terms = get_terms(&env)?;
        let status = get_status(&env)?;
        let accounting = get_accounting(&env)?;
        let milestone_count = get_milestone_count(&env);

        Ok(ProjectView {
            terms,
            status,
            milestone_count,
            accounting,
        })
    }

    pub fn milestone(env: Env, id: u32) -> Result<Milestone, BuildBondError> {
        get_milestone(&env, id)
    }

    pub fn accounting(env: Env) -> Result<Accounting, BuildBondError> {
        get_accounting(&env)
    }

    pub fn role_acceptance(env: Env, role: Role) -> Option<AcceptanceView> {
        get_role_acceptance(&env, role)
    }
}
