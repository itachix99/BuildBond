import { readEscrowState } from './reconciliation';

async function runTests() {
  console.log('Running direct contract reconciliation unit tests...');
  let rejected = false;
  try {
    await readEscrowState('not-a-soroban-contract');
  } catch (error) {
    rejected = error instanceof Error && error.message.includes('valid Soroban contract address');
  }
  if (!rejected) throw new Error('Reconciliation should reject invalid contract IDs before any RPC call');
  console.log('✓ Reconciliation validates contract IDs before attempting direct reads.');
  console.log('🎉 Direct contract reconciliation unit tests passed!');
}

runTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
