import contractsData from './contracts.json' with { type: 'json' };
import { manifestToNetworkConfig, validateDeploymentManifest } from './deploymentManifest.js';

export type NetworkEnvironment = 'testnet' | 'mainnet' | 'local';

export interface NetworkConfig {
  networkPassphrase: string;
  rpcUrl: string;
  horizonUrl: string;
  friendbotUrl?: string;
  factoryContractId: string;
  escrowWasmHash: string;
  factoryWasmHash: string;
  referenceEscrowContractId: string;
  paymentTokenAddress: string;
  adminAddress: string;
}

export function getNetworkConfig(network: NetworkEnvironment = 'testnet'): NetworkConfig {
  const env = (process.env.BUILD_BOND_NETWORK || process.env.VITE_BUILD_BOND_NETWORK || network) as NetworkEnvironment;
  const inlineManifest = process.env.BUILD_BOND_DEPLOYMENT_MANIFEST_JSON || process.env.VITE_BUILD_BOND_DEPLOYMENT_MANIFEST_JSON;
  if (inlineManifest) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(inlineManifest);
    } catch (error: any) {
      throw new Error(`Configured deployment manifest JSON is invalid: ${error?.message || error}`);
    }
    const validation = validateDeploymentManifest(parsed, env, { requireVerified: true });
    if (!validation.valid) {
      throw new Error(`Configured deployment manifest is not verified:\n${validation.errors.map(error => `- ${error}`).join('\n')}`);
    }
    return manifestToNetworkConfig(parsed as Parameters<typeof manifestToNetworkConfig>[0]);
  }
  const config = contractsData[env] || contractsData.testnet;

  return {
    networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE || config.networkPassphrase,
    rpcUrl: process.env.STELLAR_RPC_URL || process.env.VITE_STELLAR_RPC_URL || config.rpcUrl,
    horizonUrl: process.env.STELLAR_HORIZON_URL || process.env.VITE_STELLAR_HORIZON_URL || config.horizonUrl,
    friendbotUrl: 'friendbotUrl' in config ? (config as any).friendbotUrl : undefined,
    factoryContractId: process.env.BUILD_BOND_FACTORY_ID || process.env.VITE_FACTORY_CONTRACT_ID || config.factoryContractId,
    escrowWasmHash: process.env.BUILD_BOND_ESCROW_WASM_HASH || config.escrowWasmHash,
    factoryWasmHash: process.env.BUILD_BOND_FACTORY_WASM_HASH || config.factoryWasmHash,
    referenceEscrowContractId: process.env.BUILD_BOND_REFERENCE_ESCROW_ID || config.referenceEscrowContractId,
    paymentTokenAddress: process.env.BUILD_BOND_PAYMENT_TOKEN || config.paymentTokenAddress,
    adminAddress: process.env.BUILD_BOND_ADMIN_ADDRESS || config.adminAddress,
  };
}

export function buildStellarExpertContractUrl(contractId: string, network: 'testnet' | 'public' = 'testnet'): string {
  return `https://stellar.expert/explorer/${network}/contract/${contractId}`;
}

export function buildStellarExpertTxUrl(txHash: string, network: 'testnet' | 'public' = 'testnet'): string {
  return `https://stellar.expert/explorer/${network}/tx/${txHash}`;
}

export function buildStellarExpertAccountUrl(address: string, network: 'testnet' | 'public' = 'testnet'): string {
  return `https://stellar.expert/explorer/${network}/account/${address}`;
}
