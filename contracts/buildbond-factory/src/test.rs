#![cfg(test)]

use crate::escrow_contract::{FundingPolicy, MilestoneInput, ProjectTerms};
use crate::types::FactoryError;
use crate::{BuildBondFactoryContract, BuildBondFactoryContractClient};
use soroban_sdk::{
    testutils::{Address as _, BytesN as _, Ledger},
    Address, BytesN, Env, Vec,
};

fn create_test_terms(env: &Env) -> (ProjectTerms, Address, Address, Address, Address) {
    let owner = Address::generate(env);
    let contractor = Address::generate(env);
    let inspector = Address::generate(env);
    let arbiter = Address::generate(env);
    let payment_token = Address::generate(env);

    let terms = ProjectTerms {
        owner: owner.clone(),
        contractor: contractor.clone(),
        inspector: inspector.clone(),
        arbiter: arbiter.clone(),
        payment_token,
        total_committed: 60_000,
        retainage_bps: 1_000,
        defect_period_secs: 90 * 86400,
        funding_policy: FundingPolicy::FullyFunded,
        terms_hash: BytesN::random(env),
    };

    (terms, owner, contractor, inspector, arbiter)
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
fn test_factory_initialization_and_admin_update() {
    let env = Env::default();
    env.mock_all_auths();

    let factory_id = env.register(BuildBondFactoryContract, ());
    let client = BuildBondFactoryContractClient::new(&env, &factory_id);

    let admin = Address::generate(&env);
    let initial_wasm_hash = BytesN::random(&env);

    // Initialize factory
    client.initialize(&admin, &initial_wasm_hash);

    assert_eq!(client.admin(), admin);
    assert_eq!(client.wasm_hash(), initial_wasm_hash);
    assert_eq!(client.project_count(), 0);

    // Duplicate initialization fails
    let res = client.try_initialize(&admin, &initial_wasm_hash);
    assert_eq!(res.err(), Some(Ok(FactoryError::AlreadyInitialized)));

    // Unauthorized admin update fails
    let stranger = Address::generate(&env);
    let new_wasm_hash = BytesN::random(&env);
    let res = client.try_update_wasm_hash(&stranger, &new_wasm_hash);
    assert_eq!(res.err(), Some(Ok(FactoryError::Unauthorized)));

    // Authorized admin update succeeds
    client.update_wasm_hash(&admin, &new_wasm_hash);
    assert_eq!(client.wasm_hash(), new_wasm_hash);
}

#[test]
fn test_factory_deploy_project_and_participant_registry() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);

    // Upload escrow WASM bytecode to test ledger
    let escrow_wasm_hash = env
        .deployer()
        .upload_contract_wasm(crate::escrow_contract::WASM);

    let factory_id = env.register(BuildBondFactoryContract, ());
    let client = BuildBondFactoryContractClient::new(&env, &factory_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &escrow_wasm_hash);

    let (terms, owner, contractor, inspector, arbiter) = create_test_terms(&env);
    let milestones = create_test_milestones(&env);

    let salt = BytesN::random(&env);
    let title_hash = BytesN::random(&env);

    // 1. Unauthorized deployer (not owner) fails
    let stranger = Address::generate(&env);
    let res = client.try_deploy_project(&stranger, &salt, &title_hash, &terms, &milestones);
    assert_eq!(res.err(), Some(Ok(FactoryError::Unauthorized)));

    // 2. Owner deploys dedicated project instance
    let deployed_escrow_addr =
        client.deploy_project(&owner, &salt, &title_hash, &terms, &milestones);

    // Check project count and metadata indexing
    assert_eq!(client.project_count(), 1);

    let metadata_by_id = client.project_by_id(&1).unwrap();
    assert_eq!(metadata_by_id.project_id, 1);
    assert_eq!(metadata_by_id.escrow_address, deployed_escrow_addr);
    assert_eq!(metadata_by_id.owner, owner);
    assert_eq!(metadata_by_id.contractor, contractor);
    assert_eq!(metadata_by_id.inspector, inspector);
    assert_eq!(metadata_by_id.arbiter, arbiter);
    assert_eq!(metadata_by_id.total_committed, 60_000);
    assert_eq!(metadata_by_id.created_at, 1_000);

    let metadata_by_addr = client.project_by_address(&deployed_escrow_addr).unwrap();
    assert_eq!(metadata_by_addr.project_id, 1);

    // Check participant-to-project reverse queries
    let owner_projects = client.projects_by_participant(&owner);
    assert_eq!(owner_projects.len(), 1);
    assert_eq!(owner_projects.get(0).unwrap(), deployed_escrow_addr);

    let contractor_projects = client.projects_by_participant(&contractor);
    assert_eq!(contractor_projects.len(), 1);
    assert_eq!(contractor_projects.get(0).unwrap(), deployed_escrow_addr);

    let inspector_projects = client.projects_by_participant(&inspector);
    assert_eq!(inspector_projects.len(), 1);

    let arbiter_projects = client.projects_by_participant(&arbiter);
    assert_eq!(arbiter_projects.len(), 1);

    let stranger_projects = client.projects_by_participant(&stranger);
    assert_eq!(stranger_projects.len(), 0);

    // Verify deployed escrow instance is initialized and operational
    let escrow_client = crate::escrow_contract::Client::new(&env, &deployed_escrow_addr);
    let project_view = escrow_client.project();
    assert_eq!(project_view.terms.total_committed, 60_000);
    assert_eq!(project_view.milestone_count, 2);
}
