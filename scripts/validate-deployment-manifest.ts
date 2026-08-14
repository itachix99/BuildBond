#!/usr/bin/env tsx

import { validateDeploymentManifest, type NetworkEnvironment } from '@buildbond/shared';
import { readDeploymentManifest } from './deployment-manifest.js';

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find(value => value.startsWith(prefix))?.slice(prefix.length);
}

async function main(): Promise<void> {
  const file = argument('file') || argument('manifest') || process.env.BUILDBOND_DEPLOYMENT_MANIFEST;
  const network = (argument('network') || process.argv[2] || 'testnet') as NetworkEnvironment;
  if (!file) throw new Error('Provide --file=/path/to/deployment.manifest.json (or BUILDBOND_DEPLOYMENT_MANIFEST).');

  const manifest = readDeploymentManifest(file);
  const result = validateDeploymentManifest(manifest, network, { requireVerified: true });
  if (!result.valid) {
    console.error('Deployment manifest validation failed:');
    for (const error of result.errors) console.error(`✗ ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`✓ Verified ${network} deployment manifest is valid: ${file}`);
}

main().catch(error => {
  console.error(`Manifest validation failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
