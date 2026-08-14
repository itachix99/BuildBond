# BuildBond Threat Model & Trust Boundaries

## 1. System Overview
BuildBond provides programmable escrow, retainage withholding, and bounded dispute settlement for construction payments on Stellar via Soroban smart contracts.

## 2. Roles & Separation of Powers

| Role | Authorizations | Security Invariants / Forbidden Actions |
| :--- | :--- | :--- |
| **Owner** | Initialize project, deposit funds, approve change orders | Cannot inspect/approve own work; cannot seize earned funds; cannot unilaterally replace inspector |
| **Contractor** | Submit milestone evidence, withdraw payable balances, claim mature retainage | Cannot self-approve milestones; cannot withdraw unfunded amounts; cannot claim retainage prematurely |
| **Inspector** | Approve or reject milestone evidence | Cannot alter milestone amounts, payment recipients, retainage percentage, or dispute awards |
| **Arbiter** | Adjudicate open disputes within bounded amounts | Cannot access undisputed funds; cannot award more than the disputed tranche; cannot create new liabilities |
| **Factory Admin**| Register new WASM versions | Cannot control individual escrow funds, withdraw balances, or alter active project terms |

## 3. Threat Vectors & Mitigations

### 3.1 Unauthorized State Mutation
- **Threat:** Actor attempts an action belonging to another role.
- **Mitigation:** Every mutating contract entrypoint requires `actor.require_auth()` and checks `actor` against the active role recorded on-chain.

### 3.2 Double-Approval and Double-Withdrawal
- **Threat:** Malicious contractor or inspector attempts to re-execute an approval or withdrawal.
- **Mitigation:** State transitions mutate milestone status to terminal / in-progress states atomically before token interactions. Accounted balances decrease immediately upon withdrawal authorization.

### 3.3 Rounding & Precision Attacks
- **Threat:** Exploit basis-point retainage rounding to drain funds.
- **Mitigation:** Integer-only math (`i128`). Immediate amount computed via subtraction: `immediate = total - retainage`.

### 3.4 Unsolicited Token Inflow
- **Threat:** Direct token transfers to escrow contract address cause internal accounting drift.
- **Mitigation:** The contract relies on explicit internal accounting buckets, not raw token balance, for payment obligations. Raw balance $\ge$ internal liabilities.
