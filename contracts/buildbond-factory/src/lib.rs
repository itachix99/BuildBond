#![no_std]

pub mod events;
pub mod storage;
pub mod types;

#[cfg(test)]
pub mod test;

pub mod escrow_contract {
    soroban_sdk::contractimport!(file = "../../target/wasm32v1-none/release/buildbond_escrow.wasm");
}

use events::{emit_project_deployed, emit_wasm_hash_updated};
use storage::{
    add_project_to_participant, get_admin, get_project, get_project_by_address,
    get_project_by_salt, get_project_count, get_projects_by_participant, get_wasm_hash,
    is_initialized, set_admin, set_initialized, set_project, set_project_by_address,
    set_project_by_salt, set_project_count, set_wasm_hash,
};
use types::{FactoryError, FundingPolicy, MilestoneInput, ProjectMetadata, ProjectTerms};

use soroban_sdk::{contract, contractimpl, symbol_short, Address, BytesN, Env, Symbol, Vec};

#[contract]
pub struct BuildBondFactoryContract;

#[contractimpl]
impl BuildBondFactoryContract {
    /// Returns the factory contract version symbol
    pub fn version(_env: Env) -> Symbol {
        symbol_short!("v0_1_1")
    }

    /// Initializes the factory contract with admin address and escrow WASM bytecode hash
    pub fn initialize(
        env: Env,
        admin: Address,
        escrow_wasm_hash: BytesN<32>,
    ) -> Result<(), FactoryError> {
        if is_initialized(&env) {
            return Err(FactoryError::AlreadyInitialized);
        }

        admin.require_auth();

        if escrow_wasm_hash.to_array() == [0; 32] {
            return Err(FactoryError::InvalidWasmHash);
        }

        set_admin(&env, &admin);
        set_wasm_hash(&env, &escrow_wasm_hash);
        set_project_count(&env, 0);
        set_initialized(&env);

        Ok(())
    }

    /// Allows the factory admin to update the template escrow WASM bytecode hash for future deployments
    pub fn update_wasm_hash(
        env: Env,
        admin: Address,
        new_wasm_hash: BytesN<32>,
    ) -> Result<(), FactoryError> {
        if !is_initialized(&env) {
            return Err(FactoryError::NotInitialized);
        }

        admin.require_auth();

        let current_admin = get_admin(&env)?;
        if admin != current_admin {
            return Err(FactoryError::Unauthorized);
        }

        if new_wasm_hash.to_array() == [0; 32] {
            return Err(FactoryError::InvalidWasmHash);
        }

        let old_wasm_hash = get_wasm_hash(&env)?;
        set_wasm_hash(&env, &new_wasm_hash);

        emit_wasm_hash_updated(
            &env,
            &old_wasm_hash,
            &new_wasm_hash,
            &admin,
            env.ledger().timestamp(),
        );

        Ok(())
    }

    /// Deploys an isolated, dedicated escrow contract instance for a construction project and initializes it
    pub fn deploy_project(
        env: Env,
        owner: Address,
        salt: BytesN<32>,
        title_hash: BytesN<32>,
        terms: ProjectTerms,
        milestones: Vec<MilestoneInput>,
    ) -> Result<Address, FactoryError> {
        if !is_initialized(&env) {
            return Err(FactoryError::NotInitialized);
        }

        owner.require_auth();

        if owner != terms.owner {
            return Err(FactoryError::Unauthorized);
        }

        let wasm_hash = get_wasm_hash(&env)?;
        if wasm_hash.to_array() == [0; 32] {
            return Err(FactoryError::InvalidWasmHash);
        }
        if get_project_by_salt(&env, &salt).is_some() {
            return Err(FactoryError::ProjectAlreadyExists);
        }

        // Deploy isolated contract instance via deployer deploy_v2
        let deployer = env.deployer().with_current_contract(salt.clone());
        let predicted_address = deployer.deployed_address();
        if get_project_by_address(&env, &predicted_address).is_some() {
            return Err(FactoryError::ProjectAlreadyExists);
        }
        let deployed_address = deployer.deploy_v2(wasm_hash.clone(), ());

        // Initialize deployed escrow contract instance with terms and milestones
        let escrow_terms = escrow_contract::ProjectTerms {
            owner: terms.owner.clone(),
            contractor: terms.contractor.clone(),
            inspector: terms.inspector.clone(),
            arbiter: terms.arbiter.clone(),
            payment_token: terms.payment_token.clone(),
            total_committed: terms.total_committed,
            retainage_bps: terms.retainage_bps,
            defect_period_secs: terms.defect_period_secs,
            terms_hash: terms.terms_hash.clone(),
            funding_policy: match terms.funding_policy {
                FundingPolicy::FullyFunded => escrow_contract::FundingPolicy::FullyFunded,
                FundingPolicy::Rolling => escrow_contract::FundingPolicy::Rolling,
            },
        };
        let mut escrow_milestones = Vec::new(&env);
        for milestone in milestones.iter() {
            escrow_milestones.push_back(escrow_contract::MilestoneInput {
                id: milestone.id,
                amount: milestone.amount,
                due_at: milestone.due_at,
                inspection_deadline_secs: milestone.inspection_deadline_secs,
            });
        }
        let escrow_client = escrow_contract::Client::new(&env, &deployed_address);
        escrow_client.initialize(&escrow_terms, &escrow_milestones);

        // Record in factory registry
        let current_count = get_project_count(&env);
        let project_id = current_count
            .checked_add(1)
            .ok_or(FactoryError::ArithmeticOverflow)?;

        let metadata = ProjectMetadata {
            project_id,
            escrow_address: deployed_address.clone(),
            salt: salt.clone(),
            escrow_wasm_hash: wasm_hash,
            title_hash,
            terms_hash: terms.terms_hash.clone(),
            owner: terms.owner.clone(),
            contractor: terms.contractor.clone(),
            inspector: terms.inspector.clone(),
            arbiter: terms.arbiter.clone(),
            payment_token: terms.payment_token.clone(),
            total_committed: terms.total_committed,
            created_at: env.ledger().timestamp(),
        };

        set_project(&env, project_id, &metadata);
        set_project_by_address(&env, &deployed_address, &metadata);
        set_project_by_salt(&env, &salt, &metadata);
        set_project_count(&env, project_id);

        // Index for all enrolled participants
        add_project_to_participant(&env, &terms.owner, &deployed_address);
        add_project_to_participant(&env, &terms.contractor, &deployed_address);
        add_project_to_participant(&env, &terms.inspector, &deployed_address);
        add_project_to_participant(&env, &terms.arbiter, &deployed_address);

        emit_project_deployed(
            &env,
            project_id,
            &deployed_address,
            &terms.owner,
            &terms.contractor,
            terms.total_committed,
            env.ledger().timestamp(),
        );

        Ok(deployed_address)
    }

    // --- Read Methods ---

    pub fn admin(env: Env) -> Result<Address, FactoryError> {
        get_admin(&env)
    }

    pub fn wasm_hash(env: Env) -> Result<BytesN<32>, FactoryError> {
        get_wasm_hash(&env)
    }

    pub fn project_count(env: Env) -> u32 {
        get_project_count(&env)
    }

    pub fn project_by_id(env: Env, id: u32) -> Option<ProjectMetadata> {
        get_project(&env, id)
    }

    pub fn project_by_address(env: Env, escrow_address: Address) -> Option<ProjectMetadata> {
        get_project_by_address(&env, &escrow_address)
    }

    pub fn project_by_salt(env: Env, salt: BytesN<32>) -> Option<ProjectMetadata> {
        get_project_by_salt(&env, &salt)
    }

    pub fn projects_by_participant(env: Env, participant: Address) -> Vec<Address> {
        get_projects_by_participant(&env, &participant)
    }
}
