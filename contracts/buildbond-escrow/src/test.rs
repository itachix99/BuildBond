#![cfg(test)]

use super::*;
use crate::types::{
    FundingPolicy, InspectionDecision, MilestoneInput, MilestoneStatus, ProjectTerms, Role,
};
use soroban_sdk::{
    testutils::{Address as _, BytesN as _, Ledger},
    token, Address, BytesN, Env, Vec,
};

fn create_test_token<'a>(
    env: &'a Env,
    admin: &Address,
) -> (Address, token::StellarAssetClient<'a>) {
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let client = token::StellarAssetClient::new(env, &sac.address());
    (sac.address(), client)
}

fn create_test_terms<'a>(
    env: &'a Env,
    policy: FundingPolicy,
) -> (
    ProjectTerms,
    Address,
    Address,
    Address,
    Address,
    Address,
    token::StellarAssetClient<'a>,
) {
    let owner = Address::generate(env);
    let contractor = Address::generate(env);
    let inspector = Address::generate(env);
    let arbiter = Address::generate(env);
    let token_admin = Address::generate(env);

    let (payment_token, token_client) = create_test_token(env, &token_admin);
    let terms_hash = BytesN::random(env);

    let terms = ProjectTerms {
        owner: owner.clone(),
        contractor: contractor.clone(),
        inspector: inspector.clone(),
        arbiter: arbiter.clone(),
        payment_token: payment_token.clone(),
        total_committed: 60_000,
        retainage_bps: 1_000, // 10%
        defect_period_secs: 90 * 86400,
        terms_hash,
        funding_policy: policy,
    };

    (
        terms,
        owner,
        contractor,
        inspector,
        arbiter,
        payment_token,
        token_client,
    )
}

fn create_test_milestones(env: &Env) -> Vec<MilestoneInput> {
    let mut milestones = Vec::new(env);
    milestones.push_back(MilestoneInput {
        id: 1,
        amount: 25_000,
        due_at: 1_700_000_000,
        inspection_deadline_secs: 7 * 86400,
    });
    milestones.push_back(MilestoneInput {
        id: 2,
        amount: 35_000,
        due_at: 1_710_000_000,
        inspection_deadline_secs: 7 * 86400,
    });
    milestones
}

#[test]
fn test_initialize_happy_path() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (terms, owner, _contractor, _inspector, _arbiter, _, _) =
        create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);

    client.initialize(&terms, &milestones);

    let project = client.project();
    assert_eq!(project.status, ProjectStatus::AwaitingAcceptance);
    assert_eq!(project.milestone_count, 2);
    assert_eq!(project.accounting.committed, 60_000);
    assert_eq!(project.terms.owner, owner);

    // Verify Owner auto-acceptance
    let owner_acc = client.role_acceptance(&Role::Owner).unwrap();
    assert!(owner_acc.accepted);
    assert_eq!(owner_acc.actor, owner);

    // Verify unaccepted roles
    assert!(client.role_acceptance(&Role::Contractor).is_none());
    assert!(client.role_acceptance(&Role::Inspector).is_none());
    assert!(client.role_acceptance(&Role::Arbiter).is_none());

    // Verify milestone 1 and 2
    let m1 = client.milestone(&1);
    assert_eq!(m1.id, 1);
    assert_eq!(m1.amount, 25_000);
    assert_eq!(m1.status, MilestoneStatus::Planned);

    let m2 = client.milestone(&2);
    assert_eq!(m2.id, 2);
    assert_eq!(m2.amount, 35_000);
    assert_eq!(m2.status, MilestoneStatus::Planned);
}

#[test]
fn test_duplicate_initialization_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (terms, _, _, _, _, _, _) = create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);

    client.initialize(&terms, &milestones);

    let res = client.try_initialize(&terms, &milestones);
    assert_eq!(res.err(), Some(Ok(BuildBondError::AlreadyInitialized)));
}

#[test]
fn test_initialization_validations() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (mut terms, _, _, _, _, _, _) = create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);

    // 1. Invalid total amount <= 0
    terms.total_committed = 0;
    let res = client.try_initialize(&terms, &milestones);
    assert_eq!(res.err(), Some(Ok(BuildBondError::InvalidAmount)));

    // 2. Invalid retainage bps > 10,000
    terms.total_committed = 60_000;
    terms.retainage_bps = 10_001;
    let res = client.try_initialize(&terms, &milestones);
    assert_eq!(res.err(), Some(Ok(BuildBondError::InvalidBasisPoints)));

    // 3. Milestone sum mismatch
    terms.retainage_bps = 1_000;
    terms.total_committed = 70_000; // but milestones sum to 60_000
    let res = client.try_initialize(&terms, &milestones);
    assert_eq!(res.err(), Some(Ok(BuildBondError::MilestoneSumMismatch)));
}

#[test]
fn test_role_acceptance_happy_path() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(2_000);

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (terms, _, contractor, inspector, arbiter, _, _) =
        create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);

    client.initialize(&terms, &milestones);

    // Contractor accepts
    client.accept_role(&contractor, &Role::Contractor, &terms.terms_hash);
    let cont_acc = client.role_acceptance(&Role::Contractor).unwrap();
    assert!(cont_acc.accepted);
    assert_eq!(cont_acc.actor, contractor);
    assert_eq!(cont_acc.terms_hash, Some(terms.terms_hash.clone()));

    // Inspector accepts
    client.accept_role(&inspector, &Role::Inspector, &terms.terms_hash);
    let insp_acc = client.role_acceptance(&Role::Inspector).unwrap();
    assert!(insp_acc.accepted);
    assert_eq!(insp_acc.actor, inspector);

    // Arbiter accepts
    client.accept_role(&arbiter, &Role::Arbiter, &terms.terms_hash);
    let arb_acc = client.role_acceptance(&Role::Arbiter).unwrap();
    assert!(arb_acc.accepted);
    assert_eq!(arb_acc.actor, arbiter);
}

#[test]
fn test_role_acceptance_unauthorized_actor() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (terms, _, _, _, _, _, _) = create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);
    client.initialize(&terms, &milestones);

    let impostor = Address::generate(&env);
    let res = client.try_accept_role(&impostor, &Role::Contractor, &terms.terms_hash);
    assert_eq!(res.err(), Some(Ok(BuildBondError::Unauthorized)));
}

#[test]
fn test_role_acceptance_invalid_terms_hash() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (terms, _, contractor, _, _, _, _) = create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);
    client.initialize(&terms, &milestones);

    let wrong_hash = BytesN::random(&env);
    let res = client.try_accept_role(&contractor, &Role::Contractor, &wrong_hash);
    assert_eq!(res.err(), Some(Ok(BuildBondError::InvalidTermsHash)));
}

#[test]
fn test_role_acceptance_duplicate_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (terms, _, contractor, _, _, _, _) = create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);
    client.initialize(&terms, &milestones);

    client.accept_role(&contractor, &Role::Contractor, &terms.terms_hash);
    let res = client.try_accept_role(&contractor, &Role::Contractor, &terms.terms_hash);
    assert_eq!(res.err(), Some(Ok(BuildBondError::RoleAlreadyAccepted)));
}

#[test]
fn test_role_decline() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (terms, _, _, inspector, _, _, _) = create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);
    client.initialize(&terms, &milestones);

    let reason_hash = BytesN::random(&env);
    client.decline_role(&inspector, &Role::Inspector, &reason_hash);

    let acc = client.role_acceptance(&Role::Inspector).unwrap();
    assert!(!acc.accepted);
    assert!(acc.declined);
    assert_eq!(acc.reason_hash, Some(reason_hash));

    let project = client.project();
    assert_eq!(project.status, ProjectStatus::Suspended);
}

#[test]
fn test_activation_gate_enforcement() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (terms, owner, contractor, inspector, arbiter, _, token_client) =
        create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);
    client.initialize(&terms, &milestones);

    // 1. Activation fails when no roles have accepted
    let res = client.try_activate(&owner);
    assert_eq!(res.err(), Some(Ok(BuildBondError::RoleNotAccepted)));

    // 2. Contractor accepts -> Activation still fails
    client.accept_role(&contractor, &Role::Contractor, &terms.terms_hash);
    let res = client.try_activate(&owner);
    assert_eq!(res.err(), Some(Ok(BuildBondError::RoleNotAccepted)));

    // 3. Inspector accepts -> Activation still fails
    client.accept_role(&inspector, &Role::Inspector, &terms.terms_hash);
    let res = client.try_activate(&owner);
    assert_eq!(res.err(), Some(Ok(BuildBondError::RoleNotAccepted)));

    // 4. All roles accepted is not enough for a FullyFunded project.
    client.accept_role(&arbiter, &Role::Arbiter, &terms.terms_hash);
    let res = client.try_activate(&owner);
    assert_eq!(res.err(), Some(Ok(BuildBondError::InsufficientCoverage)));

    // Full milestone coverage is required before activation.
    token_client.mint(&owner, &60_000);
    client.deposit(&owner, &60_000);
    client.activate(&owner);

    let project = client.project();
    assert_eq!(project.status, ProjectStatus::Active);

    // 5. Duplicate activation fails
    let res = client.try_activate(&owner);
    assert_eq!(res.err(), Some(Ok(BuildBondError::InvalidState)));
}

// ==========================================
// Phase 4 Funding, Coverage & Accounting Tests
// ==========================================

#[test]
fn test_deposit_and_auto_allocation_fully_funded() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (terms, owner, contractor, inspector, arbiter, _, token_client) =
        create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);

    client.initialize(&terms, &milestones);

    // Mint tokens to owner
    token_client.mint(&owner, &100_000);
    assert_eq!(token_client.balance(&owner), 100_000);

    // Owner deposits full commitment (60,000)
    client.deposit(&owner, &60_000);

    // Check token custody
    assert_eq!(token_client.balance(&contract_id), 60_000);
    assert_eq!(token_client.balance(&owner), 40_000);

    // Check accounting
    let acct = client.accounting();
    assert_eq!(acct.deposited, 60_000);
    assert_eq!(acct.allocated, 60_000);

    // Check both milestones are auto-funded
    let m1 = client.milestone(&1);
    assert_eq!(m1.status, MilestoneStatus::Funded);
    let m2 = client.milestone(&2);
    assert_eq!(m2.status, MilestoneStatus::Funded);

    // Check coverage
    let cov = client.coverage();
    assert_eq!(cov.total_committed, 60_000);
    assert_eq!(cov.deposited, 60_000);
    assert_eq!(cov.allocated, 60_000);
    assert_eq!(cov.unallocated, 0);
    assert_eq!(cov.covered_milestones, 2);
    assert_eq!(cov.coverage_ratio_bps, 10_000);
    assert!(cov.is_fully_covered);

    // All roles accept and activate
    client.accept_role(&contractor, &Role::Contractor, &terms.terms_hash);
    client.accept_role(&inspector, &Role::Inspector, &terms.terms_hash);
    client.accept_role(&arbiter, &Role::Arbiter, &terms.terms_hash);
    client.activate(&owner);

    assert_eq!(client.project().status, ProjectStatus::Active);
}

#[test]
fn test_rolling_funding_and_manual_allocation() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (terms, owner, _, _, _, _, token_client) = create_test_terms(&env, FundingPolicy::Rolling);
    let milestones = create_test_milestones(&env);

    client.initialize(&terms, &milestones);

    // Mint tokens to owner
    token_client.mint(&owner, &50_000);

    // Deposit only Milestone 1 amount (25,000)
    client.deposit(&owner, &25_000);

    let mut cov = client.coverage();
    assert_eq!(cov.deposited, 25_000);
    assert_eq!(cov.allocated, 0); // Not auto-allocated under Rolling policy
    assert_eq!(cov.unallocated, 25_000);

    // Manual allocate to Milestone 1
    client.allocate_to_milestone(&owner, &1, &25_000);

    let m1 = client.milestone(&1);
    assert_eq!(m1.status, MilestoneStatus::Funded);

    let m2 = client.milestone(&2);
    assert_eq!(m2.status, MilestoneStatus::Planned);

    cov = client.coverage();
    assert_eq!(cov.allocated, 25_000);
    assert_eq!(cov.unallocated, 0);
    assert_eq!(cov.covered_milestones, 1);
    assert_eq!(cov.coverage_ratio_bps, 4_166); // 25000 / 60000 * 10000 = 4166 bps
    assert!(!cov.is_fully_covered);
}

#[test]
fn test_withdraw_refund() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (terms, owner, _, _, _, _, token_client) = create_test_terms(&env, FundingPolicy::Rolling);
    let milestones = create_test_milestones(&env);

    client.initialize(&terms, &milestones);

    token_client.mint(&owner, &50_000);
    client.deposit(&owner, &30_000);

    assert_eq!(token_client.balance(&contract_id), 30_000);
    assert_eq!(token_client.balance(&owner), 20_000);

    // Withdraw 10,000 unallocated refund
    client.withdraw_refund(&owner, &10_000);

    assert_eq!(token_client.balance(&contract_id), 20_000);
    assert_eq!(token_client.balance(&owner), 30_000);

    let cov = client.coverage();
    assert_eq!(cov.unallocated, 20_000);

    // Attempting to withdraw more than unallocated fails
    let res = client.try_withdraw_refund(&owner, &25_000);
    assert_eq!(
        res.err(),
        Some(Ok(BuildBondError::InsufficientEscrowBalance))
    );
}

#[test]
fn test_unsolicited_token_transfer_does_not_inflate_liabilities() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (terms, owner, _, _, _, payment_token, token_client) =
        create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);

    client.initialize(&terms, &milestones);

    token_client.mint(&owner, &60_000);
    client.deposit(&owner, &60_000);

    // Third party sends unsolicited 15,000 tokens directly to contract address
    let stranger = Address::generate(&env);
    token_client.mint(&stranger, &15_000);
    token::Client::new(&env, &payment_token).transfer(&stranger, &contract_id, &15_000);

    // Raw token balance is now 75,000
    assert_eq!(token_client.balance(&contract_id), 75_000);

    // Contract's accounted deposited/allocated remains exactly 60,000
    let acct = client.accounting();
    assert_eq!(acct.deposited, 60_000);
    assert_eq!(acct.allocated, 60_000);

    let cov = client.coverage();
    assert_eq!(cov.deposited, 60_000);
    assert_eq!(cov.allocated, 60_000);
    assert_eq!(cov.unallocated, 0);
}

// ==========================================
// Phase 5 Milestone Lifecycle & Retainage Tests
// ==========================================

#[test]
fn test_milestone_submission_and_rejection_resubmission() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (terms, owner, contractor, inspector, arbiter, _, token_client) =
        create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);

    client.initialize(&terms, &milestones);
    token_client.mint(&owner, &60_000);
    client.deposit(&owner, &60_000);

    // Accept roles and activate
    client.accept_role(&contractor, &Role::Contractor, &terms.terms_hash);
    client.accept_role(&inspector, &Role::Inspector, &terms.terms_hash);
    client.accept_role(&arbiter, &Role::Arbiter, &terms.terms_hash);
    client.activate(&owner);

    // 1. Unauthorized contractor submission fails
    let impostor = Address::generate(&env);
    let evidence_1 = BytesN::random(&env);
    let res = client.try_submit_milestone(&impostor, &1, &evidence_1);
    assert_eq!(res.err(), Some(Ok(BuildBondError::Unauthorized)));

    // 2. Contractor submits Milestone 1
    client.submit_milestone(&contractor, &1, &evidence_1);
    let m1 = client.milestone(&1);
    assert_eq!(m1.status, MilestoneStatus::Submitted);
    assert_eq!(m1.evidence_hash, Some(evidence_1));

    // 3. Inspector rejects with report hash
    let report_1 = BytesN::random(&env);
    client.inspect_milestone(&inspector, &1, &InspectionDecision::Reject, &report_1);
    let m1_rejected = client.milestone(&1);
    assert_eq!(m1_rejected.status, MilestoneStatus::Rejected);

    // 4. Contractor resubmits with updated evidence
    let evidence_2 = BytesN::random(&env);
    client.submit_milestone(&contractor, &1, &evidence_2);
    let m1_resubmitted = client.milestone(&1);
    assert_eq!(m1_resubmitted.status, MilestoneStatus::Submitted);
    assert_eq!(m1_resubmitted.evidence_hash, Some(evidence_2));
}

#[test]
fn test_submission_after_due_date_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);
    let (terms, owner, contractor, inspector, arbiter, _, token_client) =
        create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);

    client.initialize(&terms, &milestones);
    token_client.mint(&owner, &60_000);
    client.deposit(&owner, &60_000);
    client.accept_role(&contractor, &Role::Contractor, &terms.terms_hash);
    client.accept_role(&inspector, &Role::Inspector, &terms.terms_hash);
    client.accept_role(&arbiter, &Role::Arbiter, &terms.terms_hash);
    client.activate(&owner);

    env.ledger().set_timestamp(1_700_000_001);
    let result = client.try_submit_milestone(&contractor, &1, &BytesN::random(&env));
    assert_eq!(
        result.err(),
        Some(Ok(BuildBondError::InspectionDeadlinePassed))
    );
}

#[test]
fn test_inspection_after_submission_deadline_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);
    let (terms, owner, contractor, inspector, arbiter, _, token_client) =
        create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);

    client.initialize(&terms, &milestones);
    token_client.mint(&owner, &60_000);
    client.deposit(&owner, &60_000);
    client.accept_role(&contractor, &Role::Contractor, &terms.terms_hash);
    client.accept_role(&inspector, &Role::Inspector, &terms.terms_hash);
    client.accept_role(&arbiter, &Role::Arbiter, &terms.terms_hash);
    client.activate(&owner);

    let evidence = BytesN::random(&env);
    client.submit_milestone(&contractor, &1, &evidence);
    env.ledger().set_timestamp(1_000 + 7 * 86400);
    let result = client.try_inspect_milestone(
        &inspector,
        &1,
        &InspectionDecision::Approve,
        &BytesN::random(&env),
    );
    assert_eq!(
        result.err(),
        Some(Ok(BuildBondError::InspectionDeadlinePassed))
    );
}

#[test]
fn test_milestone_approval_and_retainage_split() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(10_000);

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (terms, owner, contractor, inspector, arbiter, _, token_client) =
        create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);

    client.initialize(&terms, &milestones);
    token_client.mint(&owner, &60_000);
    client.deposit(&owner, &60_000);

    client.accept_role(&contractor, &Role::Contractor, &terms.terms_hash);
    client.accept_role(&inspector, &Role::Inspector, &terms.terms_hash);
    client.accept_role(&arbiter, &Role::Arbiter, &terms.terms_hash);
    client.activate(&owner);

    // Submit Milestone 1 ($25,000)
    let evidence = BytesN::random(&env);
    client.submit_milestone(&contractor, &1, &evidence);

    // Inspector approves ($25,000 at 10% retainage = $22,500 immediate + $2,500 retainage)
    let report = BytesN::random(&env);
    client.inspect_milestone(&inspector, &1, &InspectionDecision::Approve, &report);

    let m1 = client.milestone(&1);
    assert_eq!(m1.status, MilestoneStatus::InDefectPeriod);
    assert_eq!(m1.immediate_amount, 22_500);
    assert_eq!(m1.retainage_amount, 2_500);
    assert_eq!(m1.approved_at, Some(10_000));
    assert_eq!(m1.defect_deadline_at, Some(10_000 + 90 * 86400));

    // Check accounting
    let acct = client.accounting();
    assert_eq!(acct.allocated, 35_000); // Only Milestone 2 remains in allocated
    assert_eq!(acct.contractor_payable, 22_500);
    assert_eq!(acct.retainage_locked, 2_500);

    // Invariant: allocated (35k) + payable (22.5k) + retainage (2.5k) == deposited (60k)
    assert_eq!(
        acct.allocated + acct.contractor_payable + acct.retainage_locked,
        acct.deposited
    );
}

#[test]
fn test_contractor_earned_withdrawal_and_retainage_claim_end_to_end() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(10_000);

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (terms, owner, contractor, inspector, arbiter, _, token_client) =
        create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);

    client.initialize(&terms, &milestones);
    token_client.mint(&owner, &60_000);
    client.deposit(&owner, &60_000);

    client.accept_role(&contractor, &Role::Contractor, &terms.terms_hash);
    client.accept_role(&inspector, &Role::Inspector, &terms.terms_hash);
    client.accept_role(&arbiter, &Role::Arbiter, &terms.terms_hash);
    client.activate(&owner);

    // Milestone 1 ($25,000) submit & approve
    let evidence = BytesN::random(&env);
    client.submit_milestone(&contractor, &1, &evidence);
    let report = BytesN::random(&env);
    client.inspect_milestone(&inspector, &1, &InspectionDecision::Approve, &report);

    // 1. Contractor withdraws partial immediate earnings (12,500)
    client.withdraw_earned(&contractor, &12_500);
    assert_eq!(token_client.balance(&contractor), 12_500);
    assert_eq!(client.accounting().contractor_payable, 10_000);
    assert_eq!(client.accounting().withdrawn, 12_500);

    // 2. Contractor withdraws remaining immediate earnings (10,000)
    client.withdraw_earned(&contractor, &10_000);
    assert_eq!(token_client.balance(&contractor), 22_500);
    assert_eq!(client.accounting().contractor_payable, 0);
    assert_eq!(client.accounting().withdrawn, 22_500);

    // 3. Attempting to withdraw when nothing is payable fails
    let res = client.try_withdraw_earned(&contractor, &1_000);
    assert_eq!(res.err(), Some(Ok(BuildBondError::NothingToWithdraw)));

    // 4. Retainage claim BEFORE defect deadline fails (ledger at 10_000, deadline at 10_000 + 7,776,000)
    let res = client.try_claim_retainage(&contractor, &1);
    assert_eq!(res.err(), Some(Ok(BuildBondError::RetainageNotMature)));

    // 5. Advance ledger time past defect period
    let deadline = 10_000 + 90 * 86400;
    env.ledger().set_timestamp(deadline + 1);

    // Check claimable view
    let claim_view = client.claimable(&contractor);
    assert_eq!(claim_view.contractor_payable, 0);
    assert_eq!(claim_view.retainage_claimable, 2_500);

    // 6. Claim mature retainage
    client.claim_retainage(&contractor, &1);

    assert_eq!(token_client.balance(&contractor), 25_000); // 22,500 immediate + 2,500 retainage = 25,000 total!
    assert_eq!(client.accounting().retainage_locked, 0);
    assert_eq!(client.accounting().withdrawn, 25_000);

    let m1_settled = client.milestone(&1);
    assert_eq!(m1_settled.status, MilestoneStatus::Settled);
    assert_eq!(m1_settled.retained_released, 2_500);

    // 7. Duplicate retainage claim fails
    let res = client.try_claim_retainage(&contractor, &1);
    assert_eq!(res.err(), Some(Ok(BuildBondError::InvalidState)));
}

// ==========================================
// Phase 7 Dispute & Arbitration Tests
// ==========================================

#[test]
fn test_open_dispute_and_arbitration_resolution() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (terms, owner, contractor, inspector, arbiter, _, token_client) =
        create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);

    client.initialize(&terms, &milestones);
    token_client.mint(&owner, &60_000);
    client.deposit(&owner, &60_000);

    client.accept_role(&contractor, &Role::Contractor, &terms.terms_hash);
    client.accept_role(&inspector, &Role::Inspector, &terms.terms_hash);
    client.accept_role(&arbiter, &Role::Arbiter, &terms.terms_hash);
    client.activate(&owner);

    // Contractor submits Milestone 1 ($25,000)
    let evidence = BytesN::random(&env);
    client.submit_milestone(&contractor, &1, &evidence);

    // 1. Unauthorized party cannot open dispute
    let stranger = Address::generate(&env);
    let reason_1 = BytesN::random(&env);
    let res = client.try_open_dispute(&stranger, &1, &25_000, &reason_1);
    assert_eq!(res.err(), Some(Ok(BuildBondError::Unauthorized)));

    // 2. Owner opens dispute on Milestone 1
    client.open_dispute(&owner, &1, &25_000, &reason_1);

    let m1 = client.milestone(&1);
    assert_eq!(m1.status, MilestoneStatus::Disputed);

    let acct = client.accounting();
    assert_eq!(acct.allocated, 35_000); // M2 remains allocated
    assert_eq!(acct.disputed, 25_000); // M1 moved to disputed

    let dispute_rec = client.dispute(&1).unwrap();
    assert_eq!(dispute_rec.status, DisputeStatus::Open);
    assert_eq!(dispute_rec.initiator, owner);
    assert_eq!(dispute_rec.amount_disputed, 25_000);

    // 3. Non-arbiter cannot resolve dispute
    let report_hash = BytesN::random(&env);
    let res = client.try_resolve_dispute(&owner, &1, &17_500, &7_500, &report_hash);
    assert_eq!(res.err(), Some(Ok(BuildBondError::Unauthorized)));

    // 4. Award sum mismatch fails ($17,500 + $8,000 != $25,000)
    let res = client.try_resolve_dispute(&arbiter, &1, &17_500, &8_000, &report_hash);
    assert_eq!(res.err(), Some(Ok(BuildBondError::InvalidAwardAllocation)));

    // 5. Arbiter resolves dispute: 70% ($17,500) to contractor, 30% ($7,500) refund to owner
    client.resolve_dispute(&arbiter, &1, &17_500, &7_500, &report_hash);

    let acct_after = client.accounting();
    assert_eq!(acct_after.disputed, 0);
    assert_eq!(acct_after.contractor_payable, 17_500);
    assert_eq!(acct_after.owner_refundable, 7_500);

    let m1_settled = client.milestone(&1);
    assert_eq!(m1_settled.status, MilestoneStatus::Settled);
    assert_eq!(m1_settled.paid_amount, 17_500);

    let dispute_resolved = client.dispute(&1).unwrap();
    assert_eq!(dispute_resolved.status, DisputeStatus::Resolved);
    assert_eq!(dispute_resolved.contractor_award, 17_500);
    assert_eq!(dispute_resolved.owner_refund, 7_500);

    // 6. Invariant check
    assert_eq!(
        acct_after.allocated + acct_after.contractor_payable + acct_after.owner_refundable,
        acct_after.deposited
    );

    // Owner refunds awarded by arbitration are withdrawable and consumed once.
    client.withdraw_refund(&owner, &7_500);
    assert_eq!(token_client.balance(&owner), 7_500);
    assert_eq!(client.accounting().owner_refundable, 0);
    assert_eq!(client.accounting().withdrawn, 7_500);
    assert_eq!(client.claimable(&owner).owner_refundable, 0);

    let res = client.try_withdraw_refund(&owner, &1);
    assert_eq!(
        res.err(),
        Some(Ok(BuildBondError::InsufficientEscrowBalance))
    );
}

#[test]
fn test_dispute_during_defect_period_freezes_timer() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);

    let (terms, owner, contractor, inspector, arbiter, _, token_client) =
        create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);

    client.initialize(&terms, &milestones);
    token_client.mint(&owner, &60_000);
    client.deposit(&owner, &60_000);

    client.accept_role(&contractor, &Role::Contractor, &terms.terms_hash);
    client.accept_role(&inspector, &Role::Inspector, &terms.terms_hash);
    client.accept_role(&arbiter, &Role::Arbiter, &terms.terms_hash);
    client.activate(&owner);

    // Milestone 1 approved at t=1,000 (defect deadline = 1,000 + 90*86400 = 7,777,000)
    let evidence = BytesN::random(&env);
    client.submit_milestone(&contractor, &1, &evidence);
    let report = BytesN::random(&env);
    client.inspect_milestone(&inspector, &1, &InspectionDecision::Approve, &report);

    // At t=2,000, Owner opens dispute on retainage
    env.ledger().set_timestamp(2_000);
    let reason = BytesN::random(&env);
    client.open_dispute(&owner, &1, &2_500, &reason);

    let m1 = client.milestone(&1);
    assert_eq!(m1.status, MilestoneStatus::Disputed);
    // Frozen remaining seconds = 7,777,000 - 2,000 = 7,775,000
    assert_eq!(m1.frozen_remaining_secs, Some(7_775_000));

    // Retainage locked (2,500) moved to disputed
    let acct = client.accounting();
    assert_eq!(acct.retainage_locked, 0);
    assert_eq!(acct.disputed, 2_500);

    // Arbiter awards $2,000 to contractor and $500 refund to owner
    let arbiter_report = BytesN::random(&env);
    client.resolve_dispute(&arbiter, &1, &2_000, &500, &arbiter_report);

    let acct_after = client.accounting();
    assert_eq!(acct_after.disputed, 0);
    assert_eq!(acct_after.contractor_payable, 22_500 + 2_000); // 22.5k immediate + 2k award = 24.5k
    assert_eq!(acct_after.owner_refundable, 500);
}

#[test]
fn test_dispute_amount_and_defect_deadline_are_enforced() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);

    let contract_id = env.register(BuildBondEscrowContract, ());
    let client = BuildBondEscrowContractClient::new(&env, &contract_id);
    let (terms, owner, contractor, inspector, arbiter, _, token_client) =
        create_test_terms(&env, FundingPolicy::FullyFunded);
    let milestones = create_test_milestones(&env);

    client.initialize(&terms, &milestones);
    token_client.mint(&owner, &60_000);
    client.deposit(&owner, &60_000);
    client.accept_role(&contractor, &Role::Contractor, &terms.terms_hash);
    client.accept_role(&inspector, &Role::Inspector, &terms.terms_hash);
    client.accept_role(&arbiter, &Role::Arbiter, &terms.terms_hash);
    client.activate(&owner);

    client.submit_milestone(&contractor, &1, &BytesN::random(&env));

    let reason = BytesN::random(&env);
    let result = client.try_open_dispute(&owner, &1, &1, &reason);
    assert_eq!(result.err(), Some(Ok(BuildBondError::InvalidDisputeAmount)));
    let result = client.try_open_dispute(&owner, &1, &25_001, &reason);
    assert_eq!(result.err(), Some(Ok(BuildBondError::InvalidDisputeAmount)));

    client.inspect_milestone(
        &inspector,
        &1,
        &InspectionDecision::Approve,
        &BytesN::random(&env),
    );
    env.ledger().set_timestamp(1_000 + 90 * 86400);
    let result = client.try_open_dispute(&owner, &1, &2_500, &reason);
    assert_eq!(
        result.err(),
        Some(Ok(BuildBondError::ArbitrationDeadlinePassed))
    );
}
