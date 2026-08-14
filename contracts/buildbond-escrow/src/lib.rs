#![no_std]

pub mod events;
pub mod storage;
pub mod types;

#[cfg(test)]
pub mod test;

use events::{
    emit_dispute_opened, emit_dispute_resolved, emit_inspection_recorded, emit_milestone_approved,
    emit_milestone_funded, emit_milestone_submitted, emit_payment_withdrawn,
    emit_project_activated, emit_project_created, emit_project_funded, emit_refund_withdrawn,
    emit_retainage_claimed, emit_role_accepted, emit_role_declined,
};
use storage::{
    get_accounting, get_dispute, get_milestone, get_milestone_count, get_role_acceptance,
    get_role_address, get_status, get_terms, get_unallocated_funds, is_initialized, set_accounting,
    set_dispute, set_initialized, set_milestone, set_milestone_count, set_role_acceptance,
    set_status, set_terms,
};
use types::{
    AcceptanceView, Accounting, BuildBondError, ClaimableView, CoverageView, DisputeRecord,
    DisputeStatus, FundingPolicy, InspectionDecision, Milestone, MilestoneInput, MilestoneStatus,
    ProjectStatus, ProjectTerms, ProjectView, Role,
};

use soroban_sdk::{contract, contractimpl, symbol_short, token, Address, BytesN, Env, Symbol, Vec};

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
        if status != ProjectStatus::AwaitingAcceptance && status != ProjectStatus::AwaitingFunding {
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
        if status != ProjectStatus::AwaitingAcceptance && status != ProjectStatus::AwaitingFunding {
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

    /// Deposits payment token into escrow custody, updating accounted liabilities and auto-allocating
    pub fn deposit(env: Env, funder: Address, amount: i128) -> Result<(), BuildBondError> {
        if !is_initialized(&env) {
            return Err(BuildBondError::NotInitialized);
        }

        if amount <= 0 {
            return Err(BuildBondError::InvalidAmount);
        }

        let status = get_status(&env)?;
        if status == ProjectStatus::Completed
            || status == ProjectStatus::Terminated
            || status == ProjectStatus::Suspended
        {
            return Err(BuildBondError::InvalidState);
        }

        funder.require_auth();

        let terms = get_terms(&env)?;
        let mut accounting = get_accounting(&env)?;

        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &terms.payment_token);
        token_client.transfer(&funder, &contract_address, &amount);

        accounting.deposited = accounting
            .deposited
            .checked_add(amount)
            .ok_or(BuildBondError::ArithmeticOverflow)?;

        // Auto-allocation under FullyFunded policy
        let milestone_count = get_milestone_count(&env);
        if terms.funding_policy == FundingPolicy::FullyFunded {
            for i in 1..=milestone_count {
                let mut m = get_milestone(&env, i)?;
                if m.status == MilestoneStatus::Planned {
                    let unallocated = get_unallocated_funds(&accounting)?;
                    if unallocated >= m.amount {
                        m.status = MilestoneStatus::Funded;
                        set_milestone(&env, i, &m);
                        accounting.allocated = accounting
                            .allocated
                            .checked_add(m.amount)
                            .ok_or(BuildBondError::ArithmeticOverflow)?;
                        emit_milestone_funded(&env, i, m.amount, env.ledger().timestamp());
                    }
                }
            }
        }

        let coverage_bps = if terms.total_committed > 0 {
            let ratio = accounting
                .allocated
                .checked_mul(10_000)
                .ok_or(BuildBondError::ArithmeticOverflow)?
                / terms.total_committed;
            ratio as u32
        } else {
            10_000
        };

        set_accounting(&env, &accounting);
        emit_project_funded(
            &env,
            &funder,
            amount,
            accounting.deposited,
            coverage_bps,
            env.ledger().timestamp(),
        );

        Ok(())
    }

    /// Allocates unallocated deposited funds to a specific planned milestone
    pub fn allocate_to_milestone(
        env: Env,
        owner: Address,
        milestone_id: u32,
        amount: i128,
    ) -> Result<(), BuildBondError> {
        if !is_initialized(&env) {
            return Err(BuildBondError::NotInitialized);
        }

        if amount <= 0 {
            return Err(BuildBondError::InvalidAmount);
        }

        owner.require_auth();

        let terms = get_terms(&env)?;
        if owner != terms.owner {
            return Err(BuildBondError::Unauthorized);
        }

        let mut m = get_milestone(&env, milestone_id)?;
        if m.status != MilestoneStatus::Planned {
            return Err(BuildBondError::InvalidState);
        }

        if amount != m.amount {
            return Err(BuildBondError::InvalidAmount);
        }

        let mut accounting = get_accounting(&env)?;
        let unallocated = get_unallocated_funds(&accounting)?;
        if unallocated < amount {
            return Err(BuildBondError::InsufficientCoverage);
        }

        m.status = MilestoneStatus::Funded;
        accounting.allocated = accounting
            .allocated
            .checked_add(amount)
            .ok_or(BuildBondError::ArithmeticOverflow)?;

        set_milestone(&env, milestone_id, &m);
        set_accounting(&env, &accounting);
        emit_milestone_funded(&env, milestone_id, amount, env.ledger().timestamp());

        Ok(())
    }

    /// Withdraws unallocated funds back to the project owner
    pub fn withdraw_refund(env: Env, owner: Address, amount: i128) -> Result<(), BuildBondError> {
        if !is_initialized(&env) {
            return Err(BuildBondError::NotInitialized);
        }

        if amount <= 0 {
            return Err(BuildBondError::InvalidAmount);
        }

        owner.require_auth();

        let terms = get_terms(&env)?;
        if owner != terms.owner {
            return Err(BuildBondError::Unauthorized);
        }

        let mut accounting = get_accounting(&env)?;
        let unallocated = get_unallocated_funds(&accounting)?;
        if unallocated < amount {
            return Err(BuildBondError::InsufficientEscrowBalance);
        }

        accounting.withdrawn = accounting
            .withdrawn
            .checked_add(amount)
            .ok_or(BuildBondError::ArithmeticOverflow)?;

        set_accounting(&env, &accounting);

        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &terms.payment_token);
        token_client.transfer(&contract_address, &owner, &amount);

        emit_refund_withdrawn(&env, &owner, amount, env.ledger().timestamp());

        Ok(())
    }

    /// Submits completed milestone evidence by contractor
    pub fn submit_milestone(
        env: Env,
        contractor: Address,
        milestone_id: u32,
        evidence_hash: BytesN<32>,
    ) -> Result<(), BuildBondError> {
        if !is_initialized(&env) {
            return Err(BuildBondError::NotInitialized);
        }

        let status = get_status(&env)?;
        if status != ProjectStatus::Active {
            return Err(BuildBondError::ProjectNotActive);
        }

        contractor.require_auth();

        let terms = get_terms(&env)?;
        if contractor != terms.contractor {
            return Err(BuildBondError::Unauthorized);
        }

        let mut m = get_milestone(&env, milestone_id)?;
        if m.status != MilestoneStatus::Funded
            && m.status != MilestoneStatus::Rejected
            && m.status != MilestoneStatus::ReworkRequired
        {
            return Err(BuildBondError::InvalidState);
        }

        m.status = MilestoneStatus::Submitted;
        m.evidence_hash = Some(evidence_hash.clone());

        set_milestone(&env, milestone_id, &m);
        emit_milestone_submitted(
            &env,
            milestone_id,
            &contractor,
            &evidence_hash,
            env.ledger().timestamp(),
        );

        Ok(())
    }

    /// Inspects and approves or rejects a submitted milestone by accredited inspector
    pub fn inspect_milestone(
        env: Env,
        inspector: Address,
        milestone_id: u32,
        decision: InspectionDecision,
        report_hash: BytesN<32>,
    ) -> Result<(), BuildBondError> {
        if !is_initialized(&env) {
            return Err(BuildBondError::NotInitialized);
        }

        let status = get_status(&env)?;
        if status != ProjectStatus::Active {
            return Err(BuildBondError::ProjectNotActive);
        }

        inspector.require_auth();

        let terms = get_terms(&env)?;
        if inspector != terms.inspector {
            return Err(BuildBondError::Unauthorized);
        }

        let mut m = get_milestone(&env, milestone_id)?;
        if m.status != MilestoneStatus::Submitted {
            return Err(BuildBondError::InvalidState);
        }

        match decision {
            InspectionDecision::Reject => {
                m.status = MilestoneStatus::Rejected;
                set_milestone(&env, milestone_id, &m);
                emit_inspection_recorded(
                    &env,
                    milestone_id,
                    &inspector,
                    2, // Reject code
                    &report_hash,
                    env.ledger().timestamp(),
                );
            }
            InspectionDecision::Approve => {
                // Calculate retainage and immediate disbursement
                let retainage_calc = (m.amount as u128)
                    .checked_mul(terms.retainage_bps as u128)
                    .ok_or(BuildBondError::ArithmeticOverflow)?
                    / 10_000;
                let retainage_i128 = retainage_calc as i128;
                let immediate_i128 = m
                    .amount
                    .checked_sub(retainage_i128)
                    .ok_or(BuildBondError::ArithmeticOverflow)?;

                let mut accounting = get_accounting(&env)?;
                accounting.allocated = accounting
                    .allocated
                    .checked_sub(m.amount)
                    .ok_or(BuildBondError::ArithmeticOverflow)?;
                accounting.contractor_payable = accounting
                    .contractor_payable
                    .checked_add(immediate_i128)
                    .ok_or(BuildBondError::ArithmeticOverflow)?;
                accounting.retainage_locked = accounting
                    .retainage_locked
                    .checked_add(retainage_i128)
                    .ok_or(BuildBondError::ArithmeticOverflow)?;

                let approved_at = env.ledger().timestamp();
                let defect_deadline_at = approved_at
                    .checked_add(terms.defect_period_secs)
                    .ok_or(BuildBondError::ArithmeticOverflow)?;

                m.immediate_amount = immediate_i128;
                m.retainage_amount = retainage_i128;
                m.approved_at = Some(approved_at);
                m.defect_deadline_at = Some(defect_deadline_at);
                m.status = MilestoneStatus::InDefectPeriod;

                set_milestone(&env, milestone_id, &m);
                set_accounting(&env, &accounting);

                emit_inspection_recorded(
                    &env,
                    milestone_id,
                    &inspector,
                    1, // Approve code
                    &report_hash,
                    approved_at,
                );
                emit_milestone_approved(
                    &env,
                    milestone_id,
                    immediate_i128,
                    retainage_i128,
                    defect_deadline_at,
                    approved_at,
                );
            }
        }

        Ok(())
    }

    /// Withdraws earned payable balance to contractor
    pub fn withdraw_earned(
        env: Env,
        contractor: Address,
        amount: i128,
    ) -> Result<(), BuildBondError> {
        if !is_initialized(&env) {
            return Err(BuildBondError::NotInitialized);
        }

        if amount <= 0 {
            return Err(BuildBondError::InvalidAmount);
        }

        contractor.require_auth();

        let terms = get_terms(&env)?;
        if contractor != terms.contractor {
            return Err(BuildBondError::Unauthorized);
        }

        let mut accounting = get_accounting(&env)?;
        if accounting.contractor_payable < amount {
            return Err(BuildBondError::NothingToWithdraw);
        }

        accounting.contractor_payable = accounting
            .contractor_payable
            .checked_sub(amount)
            .ok_or(BuildBondError::ArithmeticOverflow)?;
        accounting.withdrawn = accounting
            .withdrawn
            .checked_add(amount)
            .ok_or(BuildBondError::ArithmeticOverflow)?;

        set_accounting(&env, &accounting);

        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &terms.payment_token);
        token_client.transfer(&contract_address, &contractor, &amount);

        emit_payment_withdrawn(&env, &contractor, amount, env.ledger().timestamp());

        Ok(())
    }

    /// Claims mature retainage after the defect liability period expires
    pub fn claim_retainage(
        env: Env,
        contractor: Address,
        milestone_id: u32,
    ) -> Result<(), BuildBondError> {
        if !is_initialized(&env) {
            return Err(BuildBondError::NotInitialized);
        }

        contractor.require_auth();

        let terms = get_terms(&env)?;
        if contractor != terms.contractor {
            return Err(BuildBondError::Unauthorized);
        }

        let mut m = get_milestone(&env, milestone_id)?;
        if m.status != MilestoneStatus::InDefectPeriod
            && m.status != MilestoneStatus::RetainageClaimable
        {
            return Err(BuildBondError::InvalidState);
        }

        let deadline = m.defect_deadline_at.ok_or(BuildBondError::InvalidState)?;

        if env.ledger().timestamp() < deadline {
            return Err(BuildBondError::RetainageNotMature);
        }

        let remaining = m
            .retainage_amount
            .checked_sub(m.retained_released)
            .ok_or(BuildBondError::ArithmeticOverflow)?;

        if remaining <= 0 {
            return Err(BuildBondError::RetainageAlreadyReleased);
        }

        let mut accounting = get_accounting(&env)?;
        if accounting.retainage_locked < remaining {
            return Err(BuildBondError::InsufficientEscrowBalance);
        }

        accounting.retainage_locked = accounting
            .retainage_locked
            .checked_sub(remaining)
            .ok_or(BuildBondError::ArithmeticOverflow)?;
        accounting.withdrawn = accounting
            .withdrawn
            .checked_add(remaining)
            .ok_or(BuildBondError::ArithmeticOverflow)?;

        m.retained_released = m.retainage_amount;
        m.status = MilestoneStatus::Settled;

        set_milestone(&env, milestone_id, &m);
        set_accounting(&env, &accounting);

        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &terms.payment_token);
        token_client.transfer(&contract_address, &contractor, &remaining);

        emit_retainage_claimed(
            &env,
            milestone_id,
            &contractor,
            remaining,
            env.ledger().timestamp(),
        );

        Ok(())
    }

    /// Opens a formal dispute on a milestone, freezing funds and defect timers
    pub fn open_dispute(
        env: Env,
        initiator: Address,
        milestone_id: u32,
        reason_hash: BytesN<32>,
    ) -> Result<(), BuildBondError> {
        if !is_initialized(&env) {
            return Err(BuildBondError::NotInitialized);
        }

        let status = get_status(&env)?;
        if status == ProjectStatus::Completed || status == ProjectStatus::Terminated {
            return Err(BuildBondError::InvalidState);
        }

        initiator.require_auth();

        let terms = get_terms(&env)?;
        if initiator != terms.owner && initiator != terms.contractor {
            return Err(BuildBondError::Unauthorized);
        }

        let mut m = get_milestone(&env, milestone_id)?;
        if m.status != MilestoneStatus::Submitted
            && m.status != MilestoneStatus::Rejected
            && m.status != MilestoneStatus::ReworkRequired
            && m.status != MilestoneStatus::InDefectPeriod
            && m.status != MilestoneStatus::Funded
        {
            return Err(BuildBondError::InvalidState);
        }

        if let Some(existing_dispute) = get_dispute(&env, milestone_id) {
            if existing_dispute.status == DisputeStatus::Open {
                return Err(BuildBondError::ActiveDispute);
            }
        }

        let mut accounting = get_accounting(&env)?;
        let prev_status = m.status;
        let amount_disputed: i128;

        if m.status == MilestoneStatus::InDefectPeriod {
            amount_disputed = m
                .retainage_amount
                .checked_sub(m.retained_released)
                .ok_or(BuildBondError::ArithmeticOverflow)?;

            if amount_disputed <= 0 {
                return Err(BuildBondError::NothingToWithdraw);
            }

            let deadline = m.defect_deadline_at.unwrap_or(0);
            let now = env.ledger().timestamp();
            let remaining_secs = deadline.saturating_sub(now);
            m.frozen_remaining_secs = Some(remaining_secs);

            accounting.retainage_locked = accounting
                .retainage_locked
                .checked_sub(amount_disputed)
                .ok_or(BuildBondError::ArithmeticOverflow)?;
            accounting.disputed = accounting
                .disputed
                .checked_add(amount_disputed)
                .ok_or(BuildBondError::ArithmeticOverflow)?;
        } else {
            amount_disputed = m.amount;
            accounting.allocated = accounting
                .allocated
                .checked_sub(amount_disputed)
                .ok_or(BuildBondError::ArithmeticOverflow)?;
            accounting.disputed = accounting
                .disputed
                .checked_add(amount_disputed)
                .ok_or(BuildBondError::ArithmeticOverflow)?;
        }

        m.status = MilestoneStatus::Disputed;

        let dispute_record = DisputeRecord {
            milestone_id,
            initiator: initiator.clone(),
            reason_hash: reason_hash.clone(),
            opened_at: env.ledger().timestamp(),
            amount_disputed,
            status: DisputeStatus::Open,
            previous_milestone_status: prev_status,
            frozen_remaining_secs: m.frozen_remaining_secs,
            report_hash: None,
            contractor_award: 0,
            owner_refund: 0,
            resolved_at: None,
        };

        set_milestone(&env, milestone_id, &m);
        set_accounting(&env, &accounting);
        set_dispute(&env, milestone_id, &dispute_record);

        emit_dispute_opened(
            &env,
            milestone_id,
            &initiator,
            amount_disputed,
            &reason_hash,
            env.ledger().timestamp(),
        );

        Ok(())
    }

    /// Resolves a formal dispute with binding arbiter award allocation
    pub fn resolve_dispute(
        env: Env,
        arbiter: Address,
        milestone_id: u32,
        contractor_award: i128,
        owner_refund: i128,
        report_hash: BytesN<32>,
    ) -> Result<(), BuildBondError> {
        if !is_initialized(&env) {
            return Err(BuildBondError::NotInitialized);
        }

        arbiter.require_auth();

        let terms = get_terms(&env)?;
        if arbiter != terms.arbiter {
            return Err(BuildBondError::Unauthorized);
        }

        let mut m = get_milestone(&env, milestone_id)?;
        if m.status != MilestoneStatus::Disputed {
            return Err(BuildBondError::InvalidState);
        }

        let mut dispute = get_dispute(&env, milestone_id).ok_or(BuildBondError::DisputeNotFound)?;
        if dispute.status != DisputeStatus::Open {
            return Err(BuildBondError::DisputeAlreadyResolved);
        }

        if contractor_award < 0 || owner_refund < 0 {
            return Err(BuildBondError::InvalidAmount);
        }

        let total_award = contractor_award
            .checked_add(owner_refund)
            .ok_or(BuildBondError::ArithmeticOverflow)?;
        if total_award != dispute.amount_disputed {
            return Err(BuildBondError::InvalidAwardAllocation);
        }

        let mut accounting = get_accounting(&env)?;
        accounting.disputed = accounting
            .disputed
            .checked_sub(dispute.amount_disputed)
            .ok_or(BuildBondError::ArithmeticOverflow)?;
        accounting.contractor_payable = accounting
            .contractor_payable
            .checked_add(contractor_award)
            .ok_or(BuildBondError::ArithmeticOverflow)?;
        accounting.owner_refundable = accounting
            .owner_refundable
            .checked_add(owner_refund)
            .ok_or(BuildBondError::ArithmeticOverflow)?;

        if dispute.previous_milestone_status == MilestoneStatus::InDefectPeriod {
            m.retained_released = m.retainage_amount;
            m.status = MilestoneStatus::Settled;
        } else {
            m.paid_amount = contractor_award;
            m.status = MilestoneStatus::Settled;
        }

        dispute.status = DisputeStatus::Resolved;
        dispute.report_hash = Some(report_hash.clone());
        dispute.contractor_award = contractor_award;
        dispute.owner_refund = owner_refund;
        dispute.resolved_at = Some(env.ledger().timestamp());

        set_milestone(&env, milestone_id, &m);
        set_accounting(&env, &accounting);
        set_dispute(&env, milestone_id, &dispute);

        emit_dispute_resolved(
            &env,
            milestone_id,
            &arbiter,
            contractor_award,
            owner_refund,
            &report_hash,
            env.ledger().timestamp(),
        );

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

    pub fn dispute(env: Env, milestone_id: u32) -> Option<DisputeRecord> {
        get_dispute(&env, milestone_id)
    }

    pub fn coverage(env: Env) -> Result<CoverageView, BuildBondError> {
        let terms = get_terms(&env)?;
        let accounting = get_accounting(&env)?;
        let milestone_count = get_milestone_count(&env);
        let unallocated = get_unallocated_funds(&accounting)?;

        let mut covered_count: u32 = 0;
        for i in 1..=milestone_count {
            let m = get_milestone(&env, i)?;
            if m.status != MilestoneStatus::Planned {
                covered_count += 1;
            }
        }

        let coverage_bps = if terms.total_committed > 0 {
            let ratio = accounting
                .allocated
                .checked_mul(10_000)
                .ok_or(BuildBondError::ArithmeticOverflow)?
                / terms.total_committed;
            ratio as u32
        } else {
            10_000
        };

        let is_fully_covered =
            accounting.allocated == terms.total_committed && covered_count == milestone_count;

        Ok(CoverageView {
            total_committed: terms.total_committed,
            deposited: accounting.deposited,
            allocated: accounting.allocated,
            unallocated,
            covered_milestones: covered_count,
            total_milestones: milestone_count,
            coverage_ratio_bps: coverage_bps,
            is_fully_covered,
        })
    }

    pub fn claimable(env: Env, address: Address) -> Result<ClaimableView, BuildBondError> {
        let terms = get_terms(&env)?;
        let accounting = get_accounting(&env)?;
        let milestone_count = get_milestone_count(&env);

        let mut mature_retainage: i128 = 0;
        if address == terms.contractor {
            for i in 1..=milestone_count {
                if let Ok(m) = get_milestone(&env, i) {
                    if m.status == MilestoneStatus::InDefectPeriod
                        || m.status == MilestoneStatus::RetainageClaimable
                    {
                        if let Some(deadline) = m.defect_deadline_at {
                            if env.ledger().timestamp() >= deadline {
                                let rem = m.retainage_amount.saturating_sub(m.retained_released);
                                mature_retainage = mature_retainage.saturating_add(rem);
                            }
                        }
                    }
                }
            }
        }

        let contractor_payable = if address == terms.contractor {
            accounting.contractor_payable
        } else {
            0
        };

        let owner_refundable = if address == terms.owner {
            accounting
                .owner_refundable
                .saturating_add(get_unallocated_funds(&accounting).unwrap_or(0))
        } else {
            0
        };

        Ok(ClaimableView {
            contractor_payable,
            retainage_claimable: mature_retainage,
            owner_refundable,
        })
    }
}
