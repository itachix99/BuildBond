#!/usr/bin/env tsx
/**
 * BuildBond Testnet Account Funding Automation Script
 *
 * Uses Stellar Friendbot to fund participant keypairs with testnet XLM.
 */

import { Keypair } from '@stellar/stellar-sdk';

const DEMO_ACCOUNTS = [
  { name: 'Owner (General Partner)', address: 'GAOWNER7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X777' },
  { name: 'Contractor (Prime Builder)', address: 'GACONTRACTOR7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X888' },
  { name: 'Inspector (Independent QA)', address: 'GAINSPECTOR7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X999' },
  { name: 'Arbiter (Neutral Arbiter)', address: 'GAARBITER7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X000' },
];

export async function fundAccount(publicKey: string, name: string = 'Account') {
  console.log(`[Friendbot] Requesting testnet XLM for ${name} (${publicKey.slice(0, 8)}...${publicKey.slice(-8)})...`);
  try {
    const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[Friendbot] Note: ${publicKey.slice(0, 8)}... may already be funded or rate-limited: ${text}`);
      return false;
    }
    const json = await res.json();
    console.log(`✓ [Friendbot] Successfully funded ${name}! Ledger: ${json.ledger || 'OK'}`);
    return true;
  } catch (err: any) {
    console.warn(`[Friendbot] Network notice: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('====================================================');
  console.log(' BuildBond Stellar Testnet Account Funding Utility');
  console.log('====================================================\n');

  // Check if a specific address was passed via CLI argument
  const targetAddress = process.argv[2];
  if (targetAddress && targetAddress.startsWith('G')) {
    await fundAccount(targetAddress, 'Target Address');
    return;
  }

  // Otherwise fund standard demo personas or generate a fresh keypair
  for (const acc of DEMO_ACCOUNTS) {
    await fundAccount(acc.address, acc.name);
  }

  console.log('\nGenerating fresh deployer keypair...');
  const newDeployer = Keypair.random();
  console.log(`Fresh Deployer Public Key: ${newDeployer.publicKey()}`);
  console.log(`Fresh Deployer Secret Key: ${newDeployer.secret()}`);
  await fundAccount(newDeployer.publicKey(), 'New Deployer Keypair');

  console.log('\n🎉 Account funding routine completed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Funding failed:', err);
    process.exit(1);
  });
}
