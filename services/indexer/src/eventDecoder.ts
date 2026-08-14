import { scValToNative, xdr } from '@stellar/stellar-sdk';
import { BuildBondEventType, IndexedEvent } from './types.js';

export interface RawSorobanEvent {
  id: string;
  type: string;
  ledger: number;
  ledgerClosedAt: string;
  contractId: string;
  txHash: string;
  topic: Array<xdr.ScVal | string | any>;
  value: any;
  inSuccessfulContractCall?: boolean;
}

/**
 * Helper to convert SCVal or base64 SCVal to native JS object
 */
export function decodeScVal(val: any): any {
  if (!val) return null;
  if (typeof val === 'string') {
    try {
      const parsed = xdr.ScVal.fromXDR(val, 'base64');
      return scValToNative(parsed);
    } catch {
      return val;
    }
  }
  if (val instanceof xdr.ScVal) {
    return scValToNative(val);
  }
  if (typeof val === 'object' && val.xdr) {
    const parsed = xdr.ScVal.fromXDR(val.xdr, 'base64');
    return scValToNative(parsed);
  }
  return val;
}

/**
 * Normalizes hex string from Buffer, Uint8Array or hex representation
 */
export function toHex(data: any): string {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (Buffer.isBuffer(data)) return data.toString('hex');
  if (data instanceof Uint8Array) {
    return Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return String(data);
}

/**
 * Decodes a raw Soroban event into a typed BuildBond IndexedEvent
 */
export function decodeSorobanEvent(raw: RawSorobanEvent): IndexedEvent {
  const topics = Array.isArray(raw.topic) ? raw.topic.map(decodeScVal) : [];
  const eventName = (topics[0] || '').toString();
  const rawValue = decodeScVal(raw.value);

  const eventType: BuildBondEventType = mapEventNameToType(eventName);
  const payload = parseEventPayload(eventType, rawValue, topics);

  return {
    id: raw.id,
    contractAddress: raw.contractId,
    eventType,
    ledger: raw.ledger,
    ledgerClosedAt: raw.ledgerClosedAt,
    txHash: raw.txHash,
    payload,
    indexedAt: Date.now(),
  };
}

function mapEventNameToType(eventName: string): BuildBondEventType {
  switch (eventName) {
    case 'project_created':
      return 'project_created';
    case 'role_accepted':
      return 'role_accepted';
    case 'role_declined':
      return 'role_declined';
    case 'project_activated':
      return 'project_activated';
    case 'project_funded':
      return 'project_funded';
    case 'milestone_funded':
      return 'milestone_funded';
    case 'milestone_submitted':
      return 'milestone_submitted';
    case 'inspection_recorded':
      return 'inspection_recorded';
    case 'milestone_approved':
      return 'milestone_approved';
    case 'payment_withdrawn':
      return 'payment_withdrawn';
    case 'retainage_claimed':
      return 'retainage_claimed';
    case 'refund_withdrawn':
      return 'refund_withdrawn';
    case 'dispute_opened':
      return 'dispute_opened';
    case 'dispute_resolved':
      return 'dispute_resolved';
    case 'project_deployed':
      return 'project_deployed';
    case 'wasm_hash_updated':
      return 'wasm_hash_updated';
    default:
      return 'unknown';
  }
}

function parseEventPayload(type: BuildBondEventType, val: any, topics: any[]): any {
  if (!val || typeof val !== 'object') {
    return { raw: val, topics };
  }

  // Handle typed event payloads
  switch (type) {
    case 'project_created':
      return {
        owner: val.owner || '',
        contractor: val.contractor || '',
        inspector: val.inspector || '',
        arbiter: val.arbiter || '',
        paymentToken: val.payment_token || '',
        totalCommitted: BigInt(val.total_committed || 0),
        retainageBps: Number(val.retainage_bps || 0),
        defectPeriodSecs: BigInt(val.defect_period_secs || 0),
        fundingPolicy: Number(val.funding_policy || 0),
        termsHash: toHex(val.terms_hash),
        timestamp: BigInt(val.timestamp || 0),
      };

    case 'role_accepted':
      return {
        role: Number(val.role || 0),
        actor: val.actor || '',
        termsHash: toHex(val.terms_hash),
        timestamp: BigInt(val.timestamp || 0),
      };

    case 'role_declined':
      return {
        role: Number(val.role || 0),
        actor: val.actor || '',
        reasonHash: toHex(val.reason_hash),
        timestamp: BigInt(val.timestamp || 0),
      };

    case 'project_activated':
      return {
        caller: val.caller || '',
        timestamp: BigInt(val.timestamp || 0),
      };

    case 'project_funded':
      return {
        funder: val.funder || '',
        amount: BigInt(val.amount || 0),
        newDeposited: BigInt(val.new_deposited || 0),
        coverageRatioBps: Number(val.coverage_ratio_bps || 0),
        timestamp: BigInt(val.timestamp || 0),
      };

    case 'milestone_funded':
      return {
        milestoneId: Number(val.milestone_id || 0),
        amount: BigInt(val.amount || 0),
        timestamp: BigInt(val.timestamp || 0),
      };

    case 'milestone_submitted':
      return {
        milestoneId: Number(val.milestone_id || 0),
        contractor: val.contractor || '',
        evidenceHash: toHex(val.evidence_hash),
        timestamp: BigInt(val.timestamp || 0),
      };

    case 'inspection_recorded':
      return {
        milestoneId: Number(val.milestone_id || 0),
        inspector: val.inspector || '',
        decision: Number(val.decision || 0),
        reportHash: toHex(val.report_hash),
        timestamp: BigInt(val.timestamp || 0),
      };

    case 'milestone_approved':
      return {
        milestoneId: Number(val.milestone_id || 0),
        immediateAmount: BigInt(val.immediate_amount || 0),
        retainageAmount: BigInt(val.retainage_amount || 0),
        defectDeadlineAt: BigInt(val.defect_deadline_at || 0),
        timestamp: BigInt(val.timestamp || 0),
      };

    case 'payment_withdrawn':
      return {
        beneficiary: val.beneficiary || '',
        amount: BigInt(val.amount || 0),
        timestamp: BigInt(val.timestamp || 0),
      };

    case 'retainage_claimed':
      return {
        milestoneId: Number(val.milestone_id || 0),
        contractor: val.contractor || '',
        amount: BigInt(val.amount || 0),
        timestamp: BigInt(val.timestamp || 0),
      };

    case 'refund_withdrawn':
      return {
        owner: val.owner || '',
        amount: BigInt(val.amount || 0),
        timestamp: BigInt(val.timestamp || 0),
      };

    case 'dispute_opened':
      return {
        milestoneId: Number(val.milestone_id || 0),
        initiator: val.initiator || '',
        amountDisputed: BigInt(val.amount_disputed || 0),
        reasonHash: toHex(val.reason_hash),
        timestamp: BigInt(val.timestamp || 0),
      };

    case 'dispute_resolved':
      return {
        milestoneId: Number(val.milestone_id || 0),
        arbiter: val.arbiter || '',
        contractorAward: BigInt(val.contractor_award || 0),
        ownerRefund: BigInt(val.owner_refund || 0),
        reportHash: toHex(val.report_hash),
        timestamp: BigInt(val.timestamp || 0),
      };

    case 'project_deployed':
      return {
        projectId: Number(val.project_id || 0),
        escrowAddress: val.escrow_address || '',
        owner: val.owner || '',
        contractor: val.contractor || '',
        totalCommitted: BigInt(val.total_committed || 0),
        timestamp: BigInt(val.timestamp || 0),
      };

    case 'wasm_hash_updated':
      return {
        oldWasmHash: toHex(val.old_wasm_hash),
        newWasmHash: toHex(val.new_wasm_hash),
        admin: val.admin || '',
        timestamp: BigInt(val.timestamp || 0),
      };

    default:
      return val;
  }
}
