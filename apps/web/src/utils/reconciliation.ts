import { StrKey } from '@stellar/stellar-sdk';
import { DEFAULT_TESTNET_RPC_URL, NETWORK_PASSPHRASE_TESTNET } from '@buildbond/shared';

interface RustResult<T> {
  isOk(): boolean;
  unwrap(): T;
  unwrapErr(): { message: string };
}

export interface ReconciledEscrowState {
  contractAddress: string;
  fetchedAt: string;
  status: string;
  milestoneCount: number;
  terms: {
    owner: string;
    contractor: string;
    inspector: string;
    arbiter: string;
    paymentToken: string;
    totalCommitted: string;
    retainageBps: number;
    defectPeriodSecs: string;
    termsHash: string;
    fundingPolicy: string;
  };
  accounting: {
    deposited: string;
    committed: string;
    allocated: string;
    contractorPayable: string;
    retainageLocked: string;
    disputed: string;
    ownerRefundable: string;
    withdrawn: string;
  };
  coverage: {
    deposited: string;
    allocated: string;
    unallocated: string;
    totalCommitted: string;
    coverageRatioBps: number;
    coveredMilestones: number;
    totalMilestones: number;
    isFullyCovered: boolean;
  };
}

function configuredRpcUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return env?.VITE_STELLAR_RPC_URL?.trim() || DEFAULT_TESTNET_RPC_URL;
}

function bytesToHex(value: unknown): string {
  if (value && typeof (value as { toString?: unknown }).toString === 'function') {
    return (value as { toString(encoding?: string): string }).toString('hex');
  }
  return '';
}

function unwrap<T>(value: RustResult<T>, method: string): T {
  if (!value.isOk()) throw new Error(`${method} read returned ${value.unwrapErr().message}`);
  return value.unwrap();
}

export async function readEscrowState(contractAddress: string): Promise<ReconciledEscrowState> {
  if (!StrKey.isValidContract(contractAddress)) {
    throw new Error('Selected project does not have a valid Soroban contract address');
  }

  // Keep the generated bindings out of the initial dashboard bundle. They are
  // loaded only when a real indexed escrow is selected for reconciliation.
  const { Client: EscrowClient, BuildBondError } = await import('@buildbond/contract-bindings');
  const client = new EscrowClient({
    contractId: contractAddress,
    rpcUrl: configuredRpcUrl(),
    networkPassphrase: NETWORK_PASSPHRASE_TESTNET,
    errorTypes: BuildBondError,
  });

  const [projectTx, accountingTx, coverageTx] = await Promise.all([
    client.project({ simulate: true }),
    client.accounting({ simulate: true }),
    client.coverage({ simulate: true }),
  ]);
  const project = unwrap(projectTx.result, 'project');
  const accounting = unwrap(accountingTx.result, 'accounting');
  const coverage = unwrap(coverageTx.result, 'coverage');

  return {
    contractAddress,
    fetchedAt: new Date().toISOString(),
    status: project.status.tag,
    milestoneCount: Number(project.milestone_count),
    terms: {
      owner: project.terms.owner,
      contractor: project.terms.contractor,
      inspector: project.terms.inspector,
      arbiter: project.terms.arbiter,
      paymentToken: project.terms.payment_token,
      totalCommitted: String(project.terms.total_committed),
      retainageBps: Number(project.terms.retainage_bps),
      defectPeriodSecs: String(project.terms.defect_period_secs),
      termsHash: bytesToHex(project.terms.terms_hash),
      fundingPolicy: project.terms.funding_policy === 0 ? 'FullyFunded' : 'Rolling',
    },
    accounting: {
      deposited: String(accounting.deposited),
      committed: String(accounting.committed),
      allocated: String(accounting.allocated),
      contractorPayable: String(accounting.contractor_payable),
      retainageLocked: String(accounting.retainage_locked),
      disputed: String(accounting.disputed),
      ownerRefundable: String(accounting.owner_refundable),
      withdrawn: String(accounting.withdrawn),
    },
    coverage: {
      deposited: String(coverage.deposited),
      allocated: String(coverage.allocated),
      unallocated: String(coverage.unallocated),
      totalCommitted: String(coverage.total_committed),
      coverageRatioBps: Number(coverage.coverage_ratio_bps),
      coveredMilestones: Number(coverage.covered_milestones),
      totalMilestones: Number(coverage.total_milestones),
      isFullyCovered: coverage.is_fully_covered,
    },
  };
}
