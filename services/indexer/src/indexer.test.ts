import { decodeSorobanEvent } from './eventDecoder.js';
import { FileEventStore, MemoryEventStore } from './storage.js';
import { buildMilestoneTimeline, buildProjectAuditTrail, getParticipantEscrowActivity } from './query.js';
import { IndexedEvent } from './types.js';
import { SorobanRpcPoller } from './rpcClient.js';
import { BuildBondIndexerService } from './service.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

  const rawProjectDeployedEvent = {
    id: 'evt-000-project-deployed',
    type: 'contract',
    ledger: 999,
    ledgerClosedAt: '2026-08-14T09:00:00Z',
    contractId: 'CCBUILDBONDFACTORY7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X111',
    txHash: '0xabc122',
    topic: ['project_deployed'],
    value: {
      project_id: 7,
      escrow_address: contractAddress,
      owner: ownerAddress,
      contractor: contractorAddress,
      total_committed: '60000',
      timestamp: '1700000000',
      salt: 'ab'.repeat(32),
      escrow_wasm_hash: 'cd'.repeat(32),
    },
  };
  const decodedProject = decodeSorobanEvent(rawProjectDeployedEvent);
  if (
    decodedProject.eventType !== 'project_deployed' ||
    decodedProject.payload.projectId !== 7 ||
    decodedProject.payload.salt !== 'ab'.repeat(32)
  ) {
    throw new Error('Failed to decode project discovery metadata');
  }
  console.log('✓ Decoded factory project discovery metadata.');

  // 2. Storage & Deduplication Tests
  const store = new MemoryEventStore();
  const savedCount = await store.saveEvents([
    decodedProject,
    decodedDeposit,
    decodedSubmit,
    decodedApprove,
    decodedDispute,
  ]);
  if (savedCount !== 5) {
    throw new Error(`Expected 5 saved events, got ${savedCount}`);
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

  const projects = await store.getProjects({ participant: ownerAddress });
  if (projects.length !== 1 || projects[0].projectId !== 7) {
    throw new Error('Project discovery read model failed');
  }
  console.log('✓ Project discovery read model returns participant-scoped factory projects.');

  // Reopen the durable store to prove events, project discovery, and cursor survive restart.
  const directory = await mkdtemp(join(tmpdir(), 'buildbond-indexer-'));
  const filePath = join(directory, 'events.json');
  const durable = new FileEventStore({ filePath });
  await durable.saveEvents([decodedProject, decodedDeposit]);
  await durable.saveCursor({ lastLedger: 1001, lastEventId: decodedDeposit.id, updatedAt: Date.now() });
  const reopened = new FileEventStore({ filePath });
  if ((await reopened.count()) !== 2) {
    throw new Error('Durable event store did not restore events');
  }
  if ((await reopened.getCursor()).lastLedger !== 1001) {
    throw new Error('Durable event store did not restore cursor');
  }
  if ((await reopened.getProjects())[0]?.escrowAddress !== contractAddress) {
    throw new Error('Durable event store did not restore project directory');
  }
  await rm(directory, { recursive: true, force: true });
  console.log('✓ Durable event store restores events, project directory, and cursor after restart.');

  const pagedPoller = new SorobanRpcPoller({ rpcUrl: 'https://example.com', batchSize: 2 });
  const pageRequests: any[] = [];
  (pagedPoller as any).server = {
    getEvents: async (request: any) => {
      pageRequests.push(request);
      if (!request.cursor) {
        return {
          events: [rawDepositEvent, rawSubmitEvent],
          cursor: 'cursor-1',
        };
      }
      return { events: [rawApproveEvent], cursor: 'cursor-2' };
    },
  };
  const pagedEvents = await pagedPoller.fetchEvents(1000, 1010);
  if (pagedEvents.length !== 3 || !pageRequests[1].cursor || pageRequests[1].startLedger) {
    throw new Error('RPC event pagination failed to follow the returned cursor');
  }
  console.log('✓ RPC event pagination follows cursors without skipping full pages.');

  const serviceStore = new MemoryEventStore();
  const service = new BuildBondIndexerService({
    rpcUrl: 'https://example.com',
    store: serviceStore,
    confirmationLedgers: 2,
  });
  (service as any).poller = {
    getLatestLedger: async () => 100,
    fetchEvents: async () => [
      { ...rawDepositEvent, id: 'successful', inSuccessfulContractCall: true, ledger: 90 },
      { ...rawSubmitEvent, id: 'failed', inSuccessfulContractCall: false, ledger: 91 },
    ],
  };
  await service.pollOnce();
  if ((await serviceStore.count()) !== 1 || (await serviceStore.getCursor()).lastLedger !== 98) {
    throw new Error('Indexer confirmation or failed-call filtering failed');
  }
  console.log('✓ Indexer filters failed contract calls and advances only through confirmed ledgers.');

  console.log('🎉 All @buildbond/indexer Unit & Integration Tests Passed!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
