import fs from 'node:fs';
import path from 'node:path';
import type { DeploymentManifest, NetworkEnvironment } from '@buildbond/shared';

export function manifestPathForNetwork(network: NetworkEnvironment): string {
  return path.resolve('deployments', `${network}.manifest.json`);
}

export function readDeploymentManifest(filePath: string): unknown {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) throw new Error(`Deployment manifest not found: ${resolvedPath}`);
  try {
    return JSON.parse(fs.readFileSync(resolvedPath, 'utf8')) as unknown;
  } catch (error: any) {
    throw new Error(`Deployment manifest is not valid JSON: ${error?.message || error}`);
  }
}

export function writeDeploymentManifest(filePath: string, manifest: DeploymentManifest): string {
  const resolvedPath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  return resolvedPath;
}
