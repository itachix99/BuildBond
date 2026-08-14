import { decodeSorobanEvent } from './eventDecoder.js';
import { MemoryEventStore } from './storage.js';
import { buildMilestoneTimeline, buildProjectAuditTrail, getParticipantEscrowActivity } from './query.js';
import { IndexedEvent } from './types.js';

async function runTests() {
  console.log('Running @buildbond/indexer Service & Event Processing Unit Tests...');

  const contractAddress = 'CCBUILDBONDESCROW7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X99';
  const ownerAddress = 'GAOWNER7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X777';
  const contractorAddress = 'GACONTRACTOR7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X888';
  const inspectorAddress = 'GAINSPECTOR7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X999';
  const arbiterAddress = 'GAARBITER7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X000';

  // 1. Event Decoding Tests
  const rawDepositEvent = {
    id: 'evt-001-deposit',
    type: 'contract',
    ledger: 1001,
    ledgerClosedAt: '2026-08-14T10:00:00Z',
    contractId: contractAddress,
    txHash: '0xabc123',
    topic: ['project_funded'],
    value: {
      funder: ownerAddress,
      amount: '60000',
      new_deposited: '60000',
      coverage_ratio_bps: 10000,
      timestamp: '1700000000',
    },
  };

  const decodedDeposit = decodeSorobanEvent(rawDepositEvent);
  if (decodedDeposit.eventType !== 'project_funded' || decodedDeposit.payload.amount !== 60000n) {
    throw new Error('Failed to decode project_funded event');
  }
  console.log('✓ Decoded project_funded event correctly from raw Soroban payload.');

  const rawSubmitEvent = {
    id: 'evt-002-submit',
    type: 'contract',
    ledger: 1005,
    ledgerClosedAt: '2026-08-14T11:00:00Z',
    contractId: contractAddress,
    txHash: '0xabc124',
    topic: ['milestone_submitted'],
    value: {
      milestone_id: 1,
      contractor: contractorAddress,
      evidence_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      timestamp: '1700003600',
    },
  };

  const decodedSubmit = decodeSorobanEvent(rawSubmitEvent);
  if (decodedSubmit.eventType !== 'milestone_submitted' || decodedSubmit.payload.milestoneId !== 1) {
    throw new Error('Failed to decode milestone_submitted event');
  }
  console.log('✓ Decoded milestone_submitted event with milestoneId #1.');

  const rawApproveEvent = {
    id: 'evt-003-approve',
    type: 'contract',
    ledger: 1010,
    ledgerClosedAt: '2026-08-14T12:00:00Z',
    contractId: contractAddress,
    txHash: '0xabc125',
    topic: ['milestone_approved'],
    value: {
      milestone_id: 1,
      immediate_amount: '22500',
      retainage_amount: '2500',
      defect_deadline_at: '1707776000',
      timestamp: '1700007200',
    },
  };

  const decodedApprove = decodeSorobanEvent(rawApproveEvent);
  if (decodedApprove.payload.immediateAmount !== 22500n || decodedApprove.payload.retainageAmount !== 2500n) {
    throw new Error('Failed to decode milestone_approved event');
  }
  console.log('✓ Decoded milestone_approved event with exact $22.5k immediate / $2.5k retainage split.');

  const rawDisputeEvent = {
    id: 'evt-004-dispute-resolved',
    type: 'contract',
    ledger: 1020,
    ledgerClosedAt: '2026-08-14T14:00:00Z',
    contractId: contractAddress,
    txHash: '0xabc126',
    topic: ['dispute_resolved'],
    value: {
      milestone_id: 2,
      arbiter: arbiterAddress,
      contractor_award: '24500',
      owner_refund: '10500',
      report_hash: 'f4b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b899',
      timestamp: '1700014400',
    },
  };

  const decodedDispute = decodeSorobanEvent(rawDisputeEvent);
  if (decodedDispute.payload.contractorAward !== 24500n || decodedDispute.payload.ownerRefund !== 10500n) {
    throw new Error('Failed to decode dispute_resolved event');
  }
  console.log('✓ Decoded dispute_resolved event with binding arbiter award split.');

  // 2. Storage & Deduplication Tests
  const store = new MemoryEventStore();
  const savedCount = await store.saveEvents([decodedDeposit, decodedSubmit, decodedApprove, decodedDispute]);
  if (savedCount !== 4) {
    throw new Error(`Expected 4 saved events, got ${savedCount}`);
  }

  // Duplicate insert check
  const duplicateSaved = await store.saveEvents([decodedDeposit, decodedSubmit]);
  if (duplicateSaved !== 0) {
    throw new Error('Deduplication failed: duplicate events were saved');
  }
  console.log('✓ EventStore correctly deduplicates existing event IDs.');

  // 3. Participant Query Tests
  const contractorActivity = await getParticipantEscrowActivity(store, contractorAddress);
  if (contractorActivity.length < 1) {
    throw new Error('Failed to query events for contractor');
  }
  console.log(`✓ Queried participant events: ${contractorActivity.length} events for contractor.`);

  // 4. Milestone Timeline Aggregation Test
  const timeline = await buildMilestoneTimeline(store, contractAddress, 1);
  if (timeline.currentStatus !== 'InDefectPeriod' || timeline.events.length !== 2) {
    throw new Error('Milestone timeline aggregation failed');
  }
  console.log(`✓ Milestone #1 timeline constructed with status "${timeline.currentStatus}".`);

  // 5. Project Financial Audit Trail Test
  const audit = await buildProjectAuditTrail(store, contractAddress);
  if (audit.totalDeposited !== 60000n || audit.totalPaid !== 24500n || audit.totalRefunded !== 10500n) {
    throw new Error('Project audit trail financial aggregation failed');
  }
  console.log(`✓ Financial audit trail verified: $60k deposited, $24.5k paid, $10.5k refunded.`);

  // 6. Cursor Persistence Test
  await store.saveCursor({ lastLedger: 1020, lastEventId: 'evt-004-dispute-resolved', updatedAt: Date.now() });
  const cursor = await store.getCursor();
  if (cursor.lastLedger !== 1020 || cursor.lastEventId !== 'evt-004-dispute-resolved') {
    throw new Error('Cursor persistence failed');
  }
  console.log('✓ Indexer cursor saved and retrieved accurately at ledger 1020.');

  console.log('🎉 All @buildbond/indexer Unit & Integration Tests Passed!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
