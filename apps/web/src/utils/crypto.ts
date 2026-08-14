/**
 * Cryptographic utility functions for BuildBond
 * Uses Web Crypto API for SHA-256 hashing and deterministic digest calculation.
 */

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Buffer(data: string | Uint8Array): Promise<Uint8Array> {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer as unknown as BufferSource);
  return new Uint8Array(hashBuffer);
}

export interface TermsHashInput {
  title: string;
  owner: string;
  contractor: string;
  inspector: string;
  arbiter: string;
  paymentToken: string;
  totalCommitted: number;
  retainageBps: number;
  defectPeriodDays: number;
  milestones: Array<{
    id: number;
    title: string;
    amount: number;
    inspectionDeadlineDays: number;
  }>;
}

/**
 * Computes a deterministic canonical JSON SHA-256 terms hash
 */
export async function computeTermsHash(input: TermsHashInput): Promise<string> {
  const canonicalData = JSON.stringify({
    title: input.title.trim(),
    owner: input.owner.trim(),
    contractor: input.contractor.trim(),
    inspector: input.inspector.trim(),
    arbiter: input.arbiter.trim(),
    paymentToken: input.paymentToken.trim(),
    totalCommitted: input.totalCommitted,
    retainageBps: input.retainageBps,
    defectPeriodDays: input.defectPeriodDays,
    milestones: input.milestones.map(m => ({
      id: m.id,
      title: m.title.trim(),
      amount: m.amount,
      inspectionDeadlineDays: m.inspectionDeadlineDays,
    })),
  });

  return sha256Hex(canonicalData);
}

/**
 * Computes evidence hash from file or description
 */
export async function computeEvidenceHash(milestoneId: number, description: string, fileName?: string): Promise<string> {
  const payload = JSON.stringify({
    milestoneId,
    description: description.trim(),
    fileName: fileName?.trim() || 'none',
    timestamp: Date.now(),
  });
  return sha256Hex(payload);
}

/**
 * Computes inspection report hash
 */
export async function computeReportHash(milestoneId: number, decision: 'Approve' | 'Reject', notes: string): Promise<string> {
  const payload = JSON.stringify({
    milestoneId,
    decision,
    notes: notes.trim(),
    timestamp: Date.now(),
  });
  return sha256Hex(payload);
}
