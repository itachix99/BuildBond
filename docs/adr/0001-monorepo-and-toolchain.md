# ADR 0001: Monorepo Architecture, Toolchain Pinning, and Dispute Resolution Placement

## Status
Accepted

## Context
BuildBond is a milestone escrow, retainage, and dispute resolution protocol on Stellar utilizing Soroban smart contracts. The system requires a cohesive developer experience, strong invariant guarantees, verifiable builds across contract and web client tiers, and reproducible local execution.

## Decisions

### 1. Workspace Layout
We establish a polyglot monorepo:
- `contracts/`: Rust crates managed via root `Cargo.toml` workspace.
- `apps/`: User-facing web applications (`apps/web` Vite + React 19 + TypeScript).
- `services/`: Backend/off-chain services (`services/indexer` for event ingestion).
- `packages/`: Shared presentation types (`packages/shared`) and generated contract clients (`packages/contract-bindings`).
- `docs/`: Architecture decision records and security documentation.
- `scripts/`: Deployment, smoke-testing, and fixture scripts.

### 2. Toolchain Pinning
- **Rust Toolchain:** 1.97+ with `wasm32v1-none` target.
- **Soroban SDK:** `soroban-sdk = "27.0.6"` aligned with Protocol 27.
- **Stellar CLI:** `27.0.0` for compilation, WASM optimization, and bindings generation.
- **Node.js:** Node LTS (`v22.x`) with npm workspaces.
- **Stellar JS SDK:** `@stellar/stellar-sdk` `^15.1.0` and `@stellar/freighter-api` `^6.0.1`.

### 3. Dispute Resolution Placement
For the hackathon demo, dispute settlement logic is housed within the escrow contract behind a strict modular interface (`DisputeResolver` shape). This eliminates cross-contract reentrancy complexity while maintaining a clean boundary that can be factored into a standalone contract for multi-jurisdiction production deployments.

### 4. Financial Accounting Invariant
All amounts are represented as `i128` smallest token units. Floating-point arithmetic is strictly prohibited. The contract enforces:
$$\text{Accounted Assets} = \text{Unallocated} + \text{Allocated} + \text{Payable} + \text{Retained} + \text{Disputed} + \text{Refundable}$$

## Consequences
- Single-command build and test verification across Rust and TypeScript.
- Clean isolation between custody logic and display models.
