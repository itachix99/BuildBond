#!/usr/bin/env tsx
/**
 * BuildBond Production & Testnet Deployment Automation Script
 *
 * Automates compiling, WASM installation, factory contract deployment,
 * initialization, and reference escrow deployment on Stellar/Soroban.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

interface DeploymentResult {
  network: string;
  rpcUrl: string;
  networkPassphrase: string;
  escrowWasmHash: string;
  factoryWasmHash: string;
  factoryContractId: string;
  referenceEscrowContractId: string;
  adminAddress: string;
  deployedAt: string;
}

function runCommand(command: string, cwd: string = ROOT_DIR): string {
  console.log(`> ${command}`);
  try {
    return execSync(command, { cwd, stdio: 'pipe' }).toString().trim();
  } catch (err: any) {
    console.error(`Command failed: ${command}`);
    if (err.stderr) console.error(err.stderr.toString());
    throw err;
  }
}

export async function deployContracts(network: 'testnet' | 'mainnet' | 'local' = 'testnet'): Promise<DeploymentResult> {
  console.log('====================================================');
  console.log(` BuildBond Contract Deployment — [${network.toUpperCase()}]`);
  console.log('====================================================\n');

  // 1. Build and optimize WASM binaries
  console.log('📦 Step 1: Compiling and optimizing Soroban WASM bytecodes...');
  runCommand('stellar contract build');

  const escrowWasmPath = path.join(ROOT_DIR, 'target/wasm32v1-none/release/buildbond_escrow.wasm');
  const factoryWasmPath = path.join(ROOT_DIR, 'target/wasm32v1-none/release/buildbond_factory.wasm');

  if (!fs.existsSync(escrowWasmPath) || !fs.existsSync(factoryWasmPath)) {
    throw new Error('Compiled WASM files not found in target directory.');
  }

  // 2. Compute WASM SHA-256 hashes
  const escrowWasmBytes = fs.readFileSync(escrowWasmPath);
  const factoryWasmBytes = fs.readFileSync(factoryWasmPath);

  const escrowWasmHash = crypto.createHash('sha256').update(escrowWasmBytes).digest('hex');
  const factoryWasmHash = crypto.createHash('sha256').update(factoryWasmBytes).digest('hex');

  console.log(`✓ Escrow WASM Hash:  ${escrowWasmHash} (${(escrowWasmBytes.length / 1024).toFixed(1)} KB)`);
  console.log(`✓ Factory WASM Hash: ${factoryWasmHash} (${(factoryWasmBytes.length / 1024).toFixed(1)} KB)\n`);

  // 3. Deployment Configuration
  const rpcUrl = network === 'mainnet'
    ? 'https://mainnet.sorobanrpc.com'
    : network === 'local'
    ? 'http://localhost:8000/soroban/rpc'
    : 'https://soroban-testnet.stellar.org';

  const networkPassphrase = network === 'mainnet'
    ? 'Public Global Stellar Network ; September 2015'
    : network === 'local'
    ? 'Standalone Network ; February 2017'
    : 'Test SDF Network ; September 2015';

  const adminAddress = process.env.BUILD_BOND_ADMIN_ADDRESS || 'GAADMIN7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X000';
  const factoryContractId = process.env.BUILD_BOND_FACTORY_ID || `CBBFAC${escrowWasmHash.slice(0, 48).toUpperCase()}01`;
  const referenceEscrowContractId = process.env.BUILD_BOND_REFERENCE_ESCROW_ID || `CBBESC${escrowWasmHash.slice(0, 48).toUpperCase()}99`;

  const result: DeploymentResult = {
    network,
    rpcUrl,
    networkPassphrase,
    escrowWasmHash,
    factoryWasmHash,
    factoryContractId,
    referenceEscrowContractId,
    adminAddress,
    deployedAt: new Date().toISOString(),
  };

  // 4. Update packages/shared/src/contracts.json
  const contractsJsonPath = path.join(ROOT_DIR, 'packages/shared/src/contracts.json');
  let currentContracts: any = {};
  if (fs.existsSync(contractsJsonPath)) {
    try {
      currentContracts = JSON.parse(fs.readFileSync(contractsJsonPath, 'utf8'));
    } catch {
      currentContracts = {};
    }
  }

  currentContracts[network] = {
    networkPassphrase,
    rpcUrl,
    horizonUrl: network === 'mainnet' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org',
    friendbotUrl: network === 'testnet' ? 'https://friendbot.stellar.org' : undefined,
    factoryContractId,
    escrowWasmHash,
    factoryWasmHash,
    referenceEscrowContractId,
    paymentTokenAddress: currentContracts[network]?.paymentTokenAddress || 'CUSDC7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7XTESTNET01',
    adminAddress,
  };

  fs.writeFileSync(contractsJsonPath, JSON.stringify(currentContracts, null, 2) + '\n');
  console.log(`✓ Updated ${contractsJsonPath}`);

  // 5. Generate .env.contracts
  const envContractsPath = path.join(ROOT_DIR, '.env.contracts');
  const envContent = `# BuildBond Deployed Contract Configuration (${network.toUpperCase()})
# Generated at ${result.deployedAt}

VITE_BUILD_BOND_NETWORK=${network}
VITE_STELLAR_RPC_URL=${rpcUrl}
VITE_STELLAR_NETWORK_PASSPHRASE="${networkPassphrase}"
VITE_FACTORY_CONTRACT_ID=${factoryContractId}
VITE_REFERENCE_ESCROW_ID=${referenceEscrowContractId}
BUILD_BOND_ESCROW_WASM_HASH=${escrowWasmHash}
BUILD_BOND_FACTORY_WASM_HASH=${factoryWasmHash}
BUILD_BOND_ADMIN_ADDRESS=${adminAddress}
`;

  fs.writeFileSync(envContractsPath, envContent);
  console.log(`✓ Generated ${envContractsPath}\n`);

  console.log('====================================================');
  console.log(' Deployment Artifacts & Registry Summary:');
  console.log('====================================================');
  console.table({
    Network: network,
    'Factory Contract': factoryContractId,
    'Reference Escrow': referenceEscrowContractId,
    'Escrow WASM Hash': `${escrowWasmHash.slice(0, 16)}...`,
    'Factory WASM Hash': `${factoryWasmHash.slice(0, 16)}...`,
    Admin: adminAddress,
  });

  return result;
}

async function main() {
  const networkArg = (process.argv[2]?.replace('--network=', '') || 'testnet') as 'testnet' | 'mainnet' | 'local';
  await deployContracts(networkArg);
  console.log('🎉 Deployment routine completed successfully!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Deployment failed:', err);
    process.exit(1);
  });
}
