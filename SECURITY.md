# BuildBond Security Model & Smart Contract Audit Checklist

This document details the security architecture, threat models, invariant specifications, and formal audit checklist for the **BuildBond** smart contract protocol on **Stellar / Soroban**.

---

## 1. Core Security Principles

1. **Pull-Over-Push Disbursements**: Funds are never pushed directly into participant accounts during milestone approvals or dispute resolutions. Instead, disbursements are credited to internal payable balances (`contractor_payable`, `owner_refundable`) and withdrawn via authenticated, explicit pull transactions (`withdraw_earned`, `claim_retainage`, `withdraw_refund`).
2. **Strict Accounting Conservation Invariant**: At any ledger sequence $t$, the contract enforces absolute conservation of funds:
   $$\text{Deposited Assets} = \text{Allocated} + \text{Contractor Payable} + \text{Retainage Locked} + \text{Disputed} + \text{Owner Refundable} + \text{Withdrawn}$$
   No token transfer, retainage split, refund, or arbitration award can mint, burn, or leak funds.
3. **Cryptographic Multi-Party Binding**: Contract terms, milestone evidence submittals, inspection certifications, dispute statements, and arbitration awards are strictly bound to SHA-256 cryptographic digests verified on-chain.
4. **Isolated Contract Sandboxes**: Every construction project deployed through `buildbond-factory` receives its own isolated contract instance with dedicated ledger storage and asset custody, preventing any cross-project state corruption or financial contamination.

---

## 2. Threat Model & Mitigations

| Threat Vector | Potential Impact | Built-in Mitigation Mechanism |
| :--- | :--- | :--- |
| **Unauthorized State Mutation** | Malicious actor attempts to submit deliverables, approve milestones, or withdraw funds | Every state-mutating entrypoint begins with explicit `actor.require_auth()` and validates `actor == terms.role_address`. |
| **Integer Arithmetic Overflow / Underflow** | Balance corruption or unauthorized token generation | All numeric operations use Rust checked arithmetic (`checked_add`, `checked_sub`, `checked_mul`) and return `BuildBondError::ArithmeticOverflow` on any boundary breach. |
| **Retainage Rounding Leakage** | Fractional token loss during retainage calculations | Immediate disbursement is calculated as `amount - retainage`, guaranteeing $\text{immediate} + \text{retainage} == \text{amount}$ with exactly $0$ rounding loss. |
| **Premature Retainage Theft** | Contractor attempts to withdraw defect retainage before the warranty period expires | On-chain ledger timestamp check: `if ledger.timestamp() < defect_deadline_at { return Err(RetainageNotMature); }`. |
| **Arbitration Award Imbalance** | Arbiter accidentally or maliciously allocates more or less funds than the disputed balance | Strict equality validation: `if contractor_award + owner_refund != dispute.amount_disputed { return Err(InvalidAwardAllocation); }`. |
| **Defect Timer Manipulation during Disputes** | Defect warranty expires while an active dispute hearing is ongoing | Defect clock countdown is paused upon dispute opening (`frozen_remaining_secs = deadline - now`), freezing the exact remaining liability window. |
| **Unsolicited Token Injection Attack** | Attacker transfers tokens directly to contract address to inflate liability accounting | Liability tracking strictly depends on explicit `deposit()` calls; raw token balances never dictate internal accounting states. |
| **Double Initialization Attack** | Attacker attempts to re-initialize an active escrow with altered participants or terms | Storage guards: `is_initialized(&env)` checks instance storage and immediately reverts with `BuildBondError::AlreadyInitialized`. |
| **Reentrancy Attacks** | Malicious token contract attempts to re-enter escrow before state updates | Checks-Effects-Interactions pattern: internal accounting state mutations occur *before* external token client `transfer()` invocations. |

---

## 3. Formal Audit Verification Checklist

### 3.1 Authorization & Access Controls
- [x] `initialize`: Requires `terms.owner.require_auth()`. Rejects duplicate initialization.
- [x] `accept_role`: Requires `actor.require_auth()`. Enforces `actor == terms.role` and `terms_hash == terms.terms_hash`. Rejects duplicate acceptances.
- [x] `decline_role`: Requires `actor.require_auth()`. Enforces `actor == terms.role`. Suspends project status.
- [x] `activate`: Requires `caller.require_auth()`. Enforces all mandatory role acceptances (`Contractor`, `Inspector`, `Arbiter`).
- [x] `deposit`: Requires `funder.require_auth()`. Transfers tokens via SEP-41 token client.
- [x] `allocate_to_milestone`: Requires `owner.require_auth()`. Enforces `owner == terms.owner`.
- [x] `withdraw_refund`: Requires `owner.require_auth()`. Limits withdrawal strictly to unallocated funds.
- [x] `submit_milestone`: Requires `contractor.require_auth()`. Enforces `contractor == terms.contractor`.
- [x] `inspect_milestone`: Requires `inspector.require_auth()`. Enforces `inspector == terms.inspector`.
- [x] `withdraw_earned`: Requires `contractor.require_auth()`. Limits withdrawal strictly to `accounting.contractor_payable`.
- [x] `claim_retainage`: Requires `contractor.require_auth()`. Enforces `ledger.timestamp() >= defect_deadline_at`.
- [x] `open_dispute`: Requires `initiator.require_auth()`. Enforces `initiator == terms.owner || initiator == terms.contractor`.
- [x] `resolve_dispute`: Requires `arbiter.require_auth()`. Enforces `arbiter == terms.arbiter` and award sum conservation.
- [x] `factory.deploy_project`: Requires `owner.require_auth()`. Enforces `owner == terms.owner`.
- [x] `factory.update_wasm_hash`: Requires `admin.require_auth()`. Enforces `admin == factory.admin`.

---

### 3.2 Automated Test Coverage Matrix

The entire protocol is verified across **20 Soroban smart contract tests**, **web cryptographic and error decoder tests**, and **persistent indexer tests**:

```text
running 20 tests across contracts/
test test::test_initialization_validations ................................. ok
test test::test_duplicate_initialization_rejected .......................... ok
test test::test_initialize_happy_path ...................................... ok
test test::test_role_acceptance_happy_path ................................. ok
test test::test_role_acceptance_duplicate_rejected ......................... ok
test test::test_role_acceptance_invalid_terms_hash ......................... ok
test test::test_role_acceptance_unauthorized_actor ......................... ok
test test::test_role_decline ............................................... ok
test test::test_activation_gate_enforcement ................................ ok
test test::test_deposit_and_auto_allocation_fully_funded ................... ok
test test::test_rolling_funding_and_manual_allocation ...................... ok
test test::test_withdraw_refund ............................................ ok
test test::test_unsolicited_token_transfer_does_not_inflate_liabilities .... ok
test test::test_milestone_submission_and_rejection_resubmission ............ ok
test test::test_milestone_approval_and_retainage_split ..................... ok
test test::test_contractor_earned_withdrawal_and_retainage_claim_end_to_end  ok
test test::test_open_dispute_and_arbitration_resolution .................... ok
test test::test_dispute_during_defect_period_freezes_timer ................. ok
test test::test_factory_initialization_and_admin_update .................... ok
test test::test_factory_deploy_project_and_participant_registry ............ ok

test result: ok. 20 passed; 0 failed; 0 ignored; finished in 0.33s
```

---

## 4. Responsible Disclosure

If you discover a potential vulnerability in BuildBond, please report it privately to `security@buildbond.network` or open an encrypted security advisory on GitHub. Do not publish vulnerabilities publicly until a patch and migration runbook have been deployed.
