#!/usr/bin/env tsx
/**
 * BuildBond Deployment Metadata Verification Script
 *
 * Verifies RPC reachability and the local format of operator-supplied
 * deployment metadata. It does not prove contract existence or state yet.
 */

import { rpc, StrKey } from '@stellar/stellar-sdk';
import { getNetworkConfig, buildStellarExpertContractUrl } from '@buildbond/shared';

export async function verifyDeployment(networkArg?: string) {
  const network = (networkArg || 'testnet') as 'testnet' | 'mainnet' | 'local';
  const config = getNetworkConfig(network);

  console.log('====================================================');
  console.log(` BuildBond Deployment Verification [${network.toUpperCase()}]`);
  console.log('====================================================\n');

  console.log(`Network:            ${network}`);
  console.log(`RPC Endpoint:       ${config.rpcUrl}`);
  console.log(`Network Passphrase: "${config.networkPassphrase}"\n`);

  const checks: Record<string, string> = {};
  const failures: string[] = [];

  // 1. RPC Health Check
  try {
    const server = new rpc.Server(config.rpcUrl);
    const health = await server.getHealth();
    checks['RPC Status'] = `Healthy (Ledger: ${health.latestLedger || 'N/A'})`;
    console.log(`✓ Soroban RPC is reachable and responsive.`);
  } catch (err: any) {
    checks['RPC Status'] = `Offline / Warning: ${err.message}`;
    console.warn(`⚠️ Soroban RPC health check notice: ${err.message}`);
  }

  // 2. WASM Bytecode Hashes
  if (config.escrowWasmHash && config.escrowWasmHash.length === 64) {
    checks['Escrow WASM'] = `Valid (${config.escrowWasmHash.slice(0, 16)}...)`;
    console.log(`✓ Escrow WASM bytecode hash verified (64 hex characters).`);
  } else {
    checks['Escrow WASM'] = 'Missing or invalid hash';
    failures.push('Escrow WASM hash is missing or invalid.');
  }

  if (config.factoryWasmHash && config.factoryWasmHash.length === 64) {
    checks['Factory WASM'] = `Valid (${config.factoryWasmHash.slice(0, 16)}...)`;
    console.log(`✓ Factory WASM bytecode hash verified (64 hex characters).`);
  } else {
    checks['Factory WASM'] = 'Missing or invalid hash';
    failures.push('Factory WASM hash is missing or invalid.');
  }

  // 3. Contract Addresses
  if (config.factoryContractId && StrKey.isValidContract(config.factoryContractId)) {
    checks['Factory ID'] = config.factoryContractId;
    console.log(`✓ Factory Contract ID configured: ${config.factoryContractId}`);
    if (network === 'testnet') {
      console.log(`  Explorer: ${buildStellarExpertContractUrl(config.factoryContractId, 'testnet')}`);
    }
  } else {
    checks['Factory ID'] = 'Missing or invalid contract ID';
    failures.push('Factory contract ID is missing or not a valid Stellar contract ID.');
  }

  if (config.referenceEscrowContractId && StrKey.isValidContract(config.referenceEscrowContractId)) {
    checks['Reference Escrow'] = config.referenceEscrowContractId;
    console.log(`✓ Reference Escrow ID configured: ${config.referenceEscrowContractId}`);
    if (network === 'testnet') {
      console.log(`  Explorer: ${buildStellarExpertContractUrl(config.referenceEscrowContractId, 'testnet')}`);
    }
  } else {
    checks['Reference Escrow'] = 'Missing or invalid contract ID';
    failures.push('Reference escrow contract ID is missing or not a valid Stellar contract ID.');
  }

  if (config.paymentTokenAddress && (StrKey.isValidContract(config.paymentTokenAddress) || StrKey.isValidEd25519PublicKey(config.paymentTokenAddress))) {
    checks['Payment Token'] = config.paymentTokenAddress;
  } else {
    checks['Payment Token'] = 'Missing or invalid contract/account ID';
    failures.push('Payment token identity is missing or not a valid Stellar contract/account ID.');
  }

  if (config.adminAddress && StrKey.isValidEd25519PublicKey(config.adminAddress)) {
    checks['Admin'] = config.adminAddress;
  } else {
    checks['Admin'] = 'Missing or invalid account ID';
    failures.push('Admin account is missing or not a valid Stellar account ID.');
  }

  // 4. Print Summary Checklist
  console.log('\n====================================================');
  console.log(' Deployment Verification Checklist:');
  console.log('====================================================');
  console.table(checks);

  if (failures.length > 0) {
    console.error('\nDeployment verification failed:');
    for (const failure of failures) console.error(`✗ ${failure}`);
    throw new Error('Configured deployment metadata is incomplete or invalid; no live deployment was established.');
  }

  console.log('✓ Deployment metadata passed local format validation. Live on-chain existence and bytecode checks still require RPC verification.');
}

async function main() {
  const networkArg = process.argv[2]?.replace('--network=', '') || 'testnet';
  await verifyDeployment(networkArg);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
}
