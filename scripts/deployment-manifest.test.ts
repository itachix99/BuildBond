import {
  isVerifiedDeploymentManifest,
  validateDeploymentManifest,
  type DeploymentManifest,
} from '@buildbond/shared';

const validManifest: DeploymentManifest = {
  manifestVersion: 1,
  status: 'verified',
  network: 'testnet',
  networkPassphrase: 'Test SDF Network ; September 2015',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  factoryContractId: `C${'A'.repeat(55)}`,
  referenceEscrowContractId: `C${'B'.repeat(55)}`,
  escrowWasmHash: 'a'.repeat(64),
  factoryWasmHash: 'b'.repeat(64),
  paymentTokenAddress: `C${'C'.repeat(55)}`,
  adminAddress: `G${'D'.repeat(55)}`,
  deployedAt: '2026-08-14T00:00:00.000Z',
  verifiedAt: '2026-08-14T00:01:00.000Z',
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const valid = validateDeploymentManifest(validManifest, 'testnet', { requireVerified: true });
assert(valid.valid, `expected valid manifest: ${valid.errors.join(', ')}`);
assert(isVerifiedDeploymentManifest(validManifest, 'testnet'), 'verified manifest type guard should pass');

const candidate = { ...validManifest, status: 'candidate', verifiedAt: undefined };
assert(validateDeploymentManifest(candidate, 'testnet').valid, 'candidate should be valid before RPC promotion');
assert(!validateDeploymentManifest(candidate, 'testnet', { requireVerified: true }).valid, 'candidate must be rejected by consumers');

const wrongNetwork = { ...validManifest, network: 'mainnet' as const };
assert(!validateDeploymentManifest(wrongNetwork, 'testnet').valid, 'wrong network must fail closed');

const invalidHash = { ...validManifest, factoryWasmHash: 'not-a-hash' };
assert(!validateDeploymentManifest(invalidHash, 'testnet').valid, 'invalid WASM hash must fail closed');

console.log('✓ Deployment manifest validation tests passed.');
