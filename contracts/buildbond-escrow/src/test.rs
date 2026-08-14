#![cfg(test)]

use super::*;
use crate::types::{FundingPolicy, MilestoneInput, MilestoneStatus, ProjectTerms, Role};
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

    let (terms, owner, contractor, inspector, arbiter, _, _) =
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

    // 4. Arbiter accepts -> Activation succeeds
    client.accept_role(&arbiter, &Role::Arbiter, &terms.terms_hash);
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

    let (terms, owner, contractor, inspector, arbiter, _payment_token, token_client) =
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
