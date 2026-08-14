import {
  isVerifiedDeploymentManifest,
  type DeploymentManifest,
  type NetworkEnvironment,
} from '@buildbond/shared';

type ViteEnv = Record<string, string | undefined>;

function viteEnv(): ViteEnv {
  return (import.meta as ImportMeta & { env?: ViteEnv }).env || {};
}

/** Read only a verified manifest embedded at build time by Vite. */
export function getBrowserDeploymentManifest(): DeploymentManifest | null {
  const raw = viteEnv().VITE_BUILD_BOND_DEPLOYMENT_MANIFEST_JSON?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const network = (viteEnv().VITE_BUILD_BOND_NETWORK || 'testnet') as NetworkEnvironment;
    return isVerifiedDeploymentManifest(parsed, network) ? parsed : null;
  } catch {
    return null;
  }
}

export function getBrowserRpcUrl(): string {
  const raw = viteEnv().VITE_BUILD_BOND_DEPLOYMENT_MANIFEST_JSON?.trim();
  if (raw) return getBrowserDeploymentManifest()?.rpcUrl || '';
  return viteEnv().VITE_STELLAR_RPC_URL?.trim() || 'https://soroban-testnet.stellar.org';
}

export function getBrowserIndexerUrl(): string | null {
  const raw = viteEnv().VITE_BUILD_BOND_DEPLOYMENT_MANIFEST_JSON?.trim();
  const value = raw ? getBrowserDeploymentManifest()?.indexerUrl : viteEnv().VITE_INDEXER_API_URL?.trim();
  return value ? value.replace(/\/$/, '') : null;
}
