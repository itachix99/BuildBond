# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are construction parties on the job: project **Owners**, **General Contractors**, **Independent Inspectors**, and **Neutral Arbiters** who use the BuildBond dashboard as the operating console for milestone escrow, retainage, and defect liability settlement on real projects. Each party's identity and authority is defined on-chain by explicit role acceptance bound to an exact terms hash.

## Product Purpose

BuildBond replaces opaque, slow-moving construction payment processes and retainage disputes with an institutional-grade, non-custodial smart contract escrow protocol on Stellar / Soroban (Protocol 27). It guarantees multi-party cryptographic sign-off, strict 6-bucket accounting conservation with zero token loss, automated defect liability retainage, binding multi-outcome arbitration, deterministic factory deployment, and a persistent RPC event indexer that builds real-time deliverable timelines and financial audit trails.

Success means: funds are released only against verified milestone delivery; disputes resolve deterministically with conserved award splits; and every party can verify the full financial trail on-chain.

## Positioning

The mechanism a neighboring product could not truthfully copy: fully on-chain, non-custodial milestone escrow with exact integer retainage splits (zero rounding loss), immutable defect warranty countdown clocks, and conserved multi-outcome arbitration awards — every party bound to exact terms hashes accepted on-chain, with persistent ledger indexing for audit.

## Operating Context

- **Roles and acceptance:** Owner, General Contractor, Independent Inspector, and Neutral Arbiter each accept terms on-chain, bound to an exact SHA-256 terms hash; duplicate or unauthorized acceptance is rejected.
- **Milestone pipeline:** contractor submits deliverable evidence (digested on-chain) → independent inspector certifies → approval splits payment into immediate earnings and a retainage buffer.
- **Defect liability:** retainage is held under an immutable defect warranty countdown clock; claims settle against the retained buffer when the warranty matures.
- **Disputes and arbitration:** formal dispute initiation freezes the defect timer; the neutral arbiter issues conserved split awards; unsolicited token transfers cannot inflate liabilities.
- **Web dashboard:** React 19 + Vite 6 browser app; Freighter wallet extension; Stellar testnet; multi-project factory selector; simulated ledger clock (+30d, +90d fast-forward) and role personas for demo; transaction audit drawer with Stellar Expert explorer links.
- **Backend:** Rust / Soroban smart contracts (`buildbond-escrow`, `buildbond-factory`), generated TypeScript contract bindings, and a persistent RPC event indexer daemon with a query API.

## Capabilities and Constraints

- Live on Stellar **testnet** today (Protocol 27); production deployment is a future milestone, not a current fact.
- Non-custodial escrow with strict 6-bucket accounting conservation; integer math throughout, zero rounding loss.
- Deterministic factory architecture: isolated, sandboxed escrow instances via `deploy_v2` with reverse participant indexing.
- SEP-41 compatible payment tokens (testnet USDC); direct XLM payments supported.
- Web app constraints: browser-only; Freighter wallet required for on-chain actions; simulated personas and ledger clock for evaluation; tab structure: milestones, acceptance, funding, payouts, disputes.
- Verified deployment pipeline: TypeScript type-checks, unit tests, Cargo lint/tests, and on-chain bytecode hash verification.
- Monorepo: npm workspaces (`apps/web`, `packages/*`, `services/indexer`) + Cargo workspace (`contracts/*`).

## Brand Commitments

- Product name **BuildBond**; logo badge "BB"; tagline "Milestone Escrow, Retainage & Defect Liability Settlement on Stellar".
- Apache 2.0 license, open source.
- No external brand, regulatory, or design commitments beyond the repository; none were recorded during init.

## Evidence on Hand

- Deployed testnet contracts: factory, reference escrow, and testnet USDC addresses with Stellar Expert links (README.md).
- Verified WASM hashes for escrow and factory bytecode.
- 20+ smart contract unit/property tests with snapshots (`contracts/buildbond-escrow/test_snapshots/`, `contracts/buildbond-factory/test_snapshots/`).
- Web tests: terms hashing, evidence digests, retainage math, error diagnostic decoders 1..37 (`apps/web/src/utils/*.test.ts`).
- Architecture, security model, threat model, and deployment runbook (`ARCHITECTURE.md`, `SECURITY.md`, `docs/`).
- No real customer testimonials, case studies, pilot deployments, or production financial data exist; future work must not fabricate them.

## Product Principles

1. **Institutional-grade trust:** every claim is cryptographic, on-chain, and independently verifiable — nothing opaque.
2. **Determinism over discretion:** milestones, retainage, and disputes resolve by fixed rules, never by unverifiable judgment.
3. **Conservation:** zero token loss at every step; accounting must balance exactly at all times.
4. **The dashboard is the operating console:** it must serve real construction parties doing real jobs, with the demo simulator as a proof layer, not the product.
5. **Verifiability:** everything the app displays traces to on-chain state and explorer-verifiable records.