/**
 * Error decoding and human-friendly diagnostics for Soroban BuildBondError codes (1..37)
 */

export interface ErrorDiagnostic {
  code: number;
  name: string;
  summary: string;
  remedy: string;
}

export const ERROR_DIAGNOSTICS: Record<number, ErrorDiagnostic> = {
  1: {
    code: 1,
    name: 'AlreadyInitialized',
    summary: 'This escrow contract instance has already been initialized.',
    remedy: 'Deploy a new escrow instance via the factory for new projects.',
  },
  2: {
    code: 2,
    name: 'NotInitialized',
    summary: 'The contract has not been initialized yet.',
    remedy: 'Call initialize() with agreed project terms and milestone schedule first.',
  },
  3: {
    code: 3,
    name: 'Unauthorized',
    summary: 'The caller is not authorized to perform this action for the specified role.',
    remedy: 'Switch to the correct role account (Owner, Contractor, Inspector, or Arbiter) in your wallet.',
  },
  4: {
    code: 4,
    name: 'InvalidAddress',
    summary: 'An invalid Stellar address was supplied.',
    remedy: 'Check the 56-character public key format starting with G or contract address starting with C.',
  },
  5: {
    code: 5,
    name: 'InvalidAmount',
    summary: 'Amount must be greater than zero and within valid ranges.',
    remedy: 'Specify a positive numeric token amount.',
  },
  6: {
    code: 6,
    name: 'InvalidBasisPoints',
    summary: 'Retainage basis points exceed the 10,000 (100%) limit.',
    remedy: 'Provide a retainage value between 0 and 10,000 bps (e.g. 1,000 for 10%).',
  },
  7: {
    code: 7,
    name: 'InvalidTimestamp',
    summary: 'A supplied timestamp or duration is invalid.',
    remedy: 'Ensure inspection deadline and defect liability duration are positive integers.',
  },
  8: {
    code: 8,
    name: 'InvalidTermsHash',
    summary: 'The terms hash passed during role acceptance does not match on-chain project terms.',
    remedy: 'Re-sync project terms from the contract and accept the exact canonical hash.',
  },
  9: {
    code: 9,
    name: 'InvalidState',
    summary: 'The contract or milestone is in an incompatible state for this operation.',
    remedy: 'Check the project status and milestone lifecycle stage before retrying.',
  },
  10: {
    code: 10,
    name: 'ProjectNotActive',
    summary: 'Operation requires the project to be in Active status.',
    remedy: 'Ensure all 3 mandatory roles have accepted and project is activated.',
  },
  11: {
    code: 11,
    name: 'RoleNotAccepted',
    summary: 'Cannot activate project until Contractor, Inspector, and Arbiter have explicitly accepted.',
    remedy: 'Have all participant roles review terms and submit accept_role() transactions.',
  },
  12: {
    code: 12,
    name: 'RoleAlreadyAccepted',
    summary: 'This role has already been accepted for this project.',
    remedy: 'No action needed; the role is already confirmed.',
  },
  17: {
    code: 17,
    name: 'MilestoneNotFunded',
    summary: 'Contractor cannot submit work evidence for an unfunded milestone.',
    remedy: 'Owner must deposit funds and allocate them to this milestone first.',
  },
  18: {
    code: 18,
    name: 'InspectionDeadlinePassed',
    summary: 'The inspection review period has expired.',
    remedy: 'Request dispute opening or milestone review extension.',
  },
  19: {
    code: 19,
    name: 'InsufficientCoverage',
    summary: 'Available unallocated escrow balance is lower than the requested milestone allocation.',
    remedy: 'Deposit additional payment tokens into escrow before allocating.',
  },
  20: {
    code: 20,
    name: 'InsufficientEscrowBalance',
    summary: 'Requested withdrawal amount exceeds available unallocated or refundable balance.',
    remedy: 'Check available balance in the accounting breakdown and adjust withdrawal amount.',
  },
  21: {
    code: 21,
    name: 'NothingToWithdraw',
    summary: 'No immediate contractor payable earnings are available to withdraw.',
    remedy: 'Wait for milestones to be inspected and approved by the independent inspector.',
  },
  22: {
    code: 22,
    name: 'RetainageNotMature',
    summary: 'The defect liability clock is still running; retainage cannot be claimed yet.',
    remedy: 'Wait until the defect liability period expires or fast-forward simulated ledger time in demo.',
  },
  23: {
    code: 23,
    name: 'RetainageAlreadyReleased',
    summary: 'Retainage for this milestone has already been claimed and paid out.',
    remedy: 'Check completed milestone settlements.',
  },
  36: {
    code: 36,
    name: 'InvalidMilestoneCount',
    summary: 'Project must contain at least 1 milestone.',
    remedy: 'Add at least one milestone schedule entry.',
  },
  37: {
    code: 37,
    name: 'MilestoneSumMismatch',
    summary: 'The sum of milestone amounts does not equal total committed amount.',
    remedy: 'Adjust milestone amounts or total committed so their values match exactly.',
  },
};

export function decodeBuildBondError(error: unknown): ErrorDiagnostic {
  if (typeof error === 'number' && ERROR_DIAGNOSTICS[error]) {
    return ERROR_DIAGNOSTICS[error];
  }

  const message = error instanceof Error ? error.message : String(error);

  for (const [codeStr, diag] of Object.entries(ERROR_DIAGNOSTICS)) {
    if (message.includes(diag.name) || message.includes(`Error(${codeStr})`)) {
      return diag;
    }
  }

  return {
    code: 0,
    name: 'UnknownError',
    summary: message || 'An unexpected transaction error occurred.',
    remedy: 'Inspect the transaction simulation logs on Stellar Expert or console.',
  };
}
