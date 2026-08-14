#![cfg(test)]

use super::*;
use crate::types::{FundingPolicy, MilestoneInput, ProjectTerms, Role};
use soroban_sdk::{
    testutils::{Address as _, BytesN as _, Ledger},
    Address, BytesN, Env, Vec,
};

fn create_test_terms(env: &Env) -> (ProjectTerms, Address, Address, Address, Address, Address) {
    let owner = Address::generate(env);
    let contractor = Address::generate(env);
    let inspector = Address::generate(env);
    let arbiter = Address::generate(env);
    let payment_token = Address::generate(env);
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
        funding_policy: FundingPolicy::FullyFunded,
    };

    (terms, owner, contractor, inspector, arbiter, payment_token)
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

    let (terms, owner, _contractor, _inspector, _arbiter, _) = create_test_terms(&env);
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

    let (terms, _, _, _, _, _) = create_test_terms(&env);
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

    let (mut terms, _, _, _, _, _) = create_test_terms(&env);
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

    let (terms, _, contractor, inspector, arbiter, _) = create_test_terms(&env);
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

    let (terms, _, _, _, _, _) = create_test_terms(&env);
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

    let (terms, _, contractor, _, _, _) = create_test_terms(&env);
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

    let (terms, _, contractor, _, _, _) = create_test_terms(&env);
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

    let (terms, _, _, inspector, _, _) = create_test_terms(&env);
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

    let (terms, owner, contractor, inspector, arbiter, _) = create_test_terms(&env);
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
