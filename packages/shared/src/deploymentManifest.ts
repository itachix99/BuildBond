import type { NetworkConfig, NetworkEnvironment } from './config.js';

/**
 * A deployment manifest is the auditable boundary between built artifacts and
 * a live network. A candidate may be produced before RPC verification; only a
 * verified manifest is safe for the web application and indexer to consume.
 */
export interface DeploymentManifest {
  manifestVersion: 1;
  status: 'candidate' | 'verified';
  network: NetworkEnvironment;
  networkPassphrase: string;
  rpcUrl: string;
  horizonUrl: string;
  factoryContractId: string;
  referenceEscrowContractId: string;
  escrowWasmHash: string;
  factoryWasmHash: string;
  paymentTokenAddress: string;
  adminAddress: string;
  deployedAt: string;
  verifiedAt?: string;
  indexerUrl?: string;
}

export interface ManifestValidationOptions {
  requireVerified?: boolean;
}

export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
}

const NETWORK_PASSPHRASES: Record<NetworkEnvironment, string> = {
  testnet: 'Test SDF Network ; September 2015',
  mainnet: 'Public Global Stellar Network ; September 2015',
  local: 'Standalone Network ; February 2017',
};

const STELLAR_ADDRESS = /^[CG][A-Z2-7]{55}$/;
const STELLAR_ACCOUNT = /^G[A-Z2-7]{55}$/;
const SHA256_HEX = /^[a-f0-9]{64}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value));
}

function requireString(manifest: Record<string, unknown>, key: string, errors: string[]): string {
  const value = manifest[key];
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${key} must be a non-empty string`);
    return '';
  }
  return value.trim();
}

/** Validate manifest shape and invariants without making network calls. */
export function validateDeploymentManifest(
  value: unknown,
  expectedNetwork?: NetworkEnvironment,
  options: ManifestValidationOptions = {},
): ManifestValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ['manifest must be a JSON object'] };

  if (value.manifestVersion !== 1) errors.push('manifestVersion must be 1');
  if (value.status !== 'candidate' && value.status !== 'verified') {
    errors.push("status must be either 'candidate' or 'verified'");
  }

  const network = value.network;
  if (network !== 'testnet' && network !== 'mainnet' && network !== 'local') {
    errors.push('network must be testnet, mainnet, or local');
  } else {
    if (expectedNetwork && network !== expectedNetwork) {
      errors.push(`network must match the requested ${expectedNetwork} network`);
    }
    const passphrase = requireString(value, 'networkPassphrase', errors);
    if (passphrase && passphrase !== NETWORK_PASSPHRASES[network]) {
      errors.push(`networkPassphrase does not match the ${network} network`);
    }
  }

  const rpcUrl = requireString(value, 'rpcUrl', errors);
  const horizonUrl = requireString(value, 'horizonUrl', errors);
  if (rpcUrl && !isUrl(rpcUrl)) errors.push('rpcUrl must be an http(s) URL');
  if (horizonUrl && !isUrl(horizonUrl)) errors.push('horizonUrl must be an http(s) URL');

  const factoryContractId = requireString(value, 'factoryContractId', errors);
  const referenceEscrowContractId = requireString(value, 'referenceEscrowContractId', errors);
  const paymentTokenAddress = requireString(value, 'paymentTokenAddress', errors);
  const adminAddress = requireString(value, 'adminAddress', errors);
  if (factoryContractId && !STELLAR_ADDRESS.test(factoryContractId)) {
    errors.push('factoryContractId must be a valid-looking Stellar contract address');
  }
  if (referenceEscrowContractId && !STELLAR_ADDRESS.test(referenceEscrowContractId)) {
    errors.push('referenceEscrowContractId must be a valid-looking Stellar contract address');
  }
  if (paymentTokenAddress && !STELLAR_ADDRESS.test(paymentTokenAddress) && !STELLAR_ACCOUNT.test(paymentTokenAddress)) {
    errors.push('paymentTokenAddress must be a valid-looking Stellar contract or account address');
  }
  if (adminAddress && !STELLAR_ACCOUNT.test(adminAddress)) {
    errors.push('adminAddress must be a valid-looking Stellar account address');
  }

  const escrowWasmHash = requireString(value, 'escrowWasmHash', errors);
  const factoryWasmHash = requireString(value, 'factoryWasmHash', errors);
  if (escrowWasmHash && !SHA256_HEX.test(escrowWasmHash)) errors.push('escrowWasmHash must be 64 hexadecimal characters');
  if (factoryWasmHash && !SHA256_HEX.test(factoryWasmHash)) errors.push('factoryWasmHash must be 64 hexadecimal characters');

  const deployedAt = requireString(value, 'deployedAt', errors);
  if (deployedAt && !isIsoTimestamp(deployedAt)) errors.push('deployedAt must be an ISO timestamp');
  if (value.status === 'verified') {
    const verifiedAt = requireString(value, 'verifiedAt', errors);
    if (verifiedAt && !isIsoTimestamp(verifiedAt)) errors.push('verifiedAt must be an ISO timestamp');
  } else if (options.requireVerified) {
    errors.push("status must be 'verified' for this consumer");
  }

  if (value.indexerUrl !== undefined && value.indexerUrl !== '' && !isUrl(value.indexerUrl)) {
    errors.push('indexerUrl must be an http(s) URL when provided');
  }

  return { valid: errors.length === 0, errors };
}

export function isVerifiedDeploymentManifest(value: unknown, expectedNetwork?: NetworkEnvironment): value is DeploymentManifest {
  return validateDeploymentManifest(value, expectedNetwork, { requireVerified: true }).valid;
}

export function manifestToNetworkConfig(manifest: DeploymentManifest): NetworkConfig {
  return {
    networkPassphrase: manifest.networkPassphrase,
    rpcUrl: manifest.rpcUrl,
    horizonUrl: manifest.horizonUrl,
    factoryContractId: manifest.factoryContractId,
    escrowWasmHash: manifest.escrowWasmHash,
    factoryWasmHash: manifest.factoryWasmHash,
    referenceEscrowContractId: manifest.referenceEscrowContractId,
    paymentTokenAddress: manifest.paymentTokenAddress,
    adminAddress: manifest.adminAddress,
  };
}

export function networkPassphraseFor(network: NetworkEnvironment): string {
  return NETWORK_PASSPHRASES[network];
}
