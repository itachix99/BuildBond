#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, Env, Symbol};

#[contract]
pub struct BuildBondEscrowContract;

#[contractimpl]
impl BuildBondEscrowContract {
    /// Baseline ping/version query for contract validation in Phase 1
    pub fn version(_env: Env) -> Symbol {
        symbol_short!("v0_1_0")
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_version() {
        let env = Env::default();
        let contract_id = env.register(BuildBondEscrowContract, ());
        let client = BuildBondEscrowContractClient::new(&env, &contract_id);
        assert_eq!(client.version(), symbol_short!("v0_1_0"));
    }
}
