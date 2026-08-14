# BuildBond

**Institutional-Grade Construction Milestone Escrow, Retainage & Defect Liability Settlement on Stellar / Soroban**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Soroban SDK: 27.0.6](https://img.shields.io/badge/Soroban_SDK-27.0.6-orange.svg)](https://stellar.org/soroban)
[![Stellar Protocol: 27](https://img.shields.io/badge/Stellar_Protocol-27-purple.svg)](https://stellar.org)
[![TypeScript: 5.7+](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org)
[![Vite: 6.2](https://img.shields.io/badge/Vite-6.2-646CFF.svg)](https://vitejs.dev)
[![React: 19](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)

---

## 🏗️ Overview

**BuildBond** replaces opaque, slow-moving construction payment processes and retainage disputes with an institutional-grade, non-custodial smart contract escrow protocol.

Built on **Stellar / Soroban (Protocol 27)**, BuildBond guarantees:
1. **Multi-Party Cryptographic Sign-Off**: Explicit on-chain role acceptance by Owner, General Contractor, Independent Inspector, and Neutral Arbiter bound to exact terms hashes.
2. **Strict 6-Bucket Accounting Conservation**: Asset and liability tracking with zero token loss across deposits, milestone allocations, immediate earnings, retainage buffers, and refunds.
3. **Automated Defect Liability Retainage**: Exact integer retainage split ($0$ rounding loss) with immutable defect warranty countdown clocks.
4. **Binding Multi-Outcome Arbitration**: Neutral arbiter dispute resolution with automatic defect timer freezing and conserved split award distributions.
5. **Deterministic Factory Architecture**: Isolated, sandboxed escrow instances deployed via `deploy_v2` with reverse participant indexing.
6. **Persistent RPC Event Indexer**: Automated ledger polling daemon and query API constructing real-time deliverable timelines and financial audit trails.

---

## 📁 Repository Structure

```text
BuildBond/
├── apps/
│   └── web/                         # Level 1 & Level 2 Web Dashboard (React 19 + Vite 6)
├── contracts/
│   ├── buildbond-escrow/            # Milestone Escrow, Retainage & Dispute Contract (Rust / Soroban)
│   └── buildbond-factory/           # Escrow Factory & Multi-Project Registry (Rust / Soroban)
├── packages/
│   ├── contract-bindings/           # TypeScript client bindings generated from contract WASMs
│   └── shared/                      # Network constants, config loaders, contracts.json
├── services/
│   └── indexer/                     # Real-time Soroban RPC event indexer daemon & query API
├── scripts/                         # Deployment, friendbot funding, and verification scripts
├── docs/                            # Deployment runbooks, architecture, and security guides
├── Cargo.toml                       # Monorepo Rust workspace configuration
└── package.json                     # Monorepo npm workspace configuration
```

---

## ⚡ Quickstart Guide

### 1. Prerequisites

- **Rust**: `1.84.0+` with target `wasm32v1-none` (`rustup target add wasm32v1-none`)
- **Stellar CLI**: `27.0.0+` (`cargo install --locked stellar-cli`)
- **Node.js**: `v20.0.0+` (or v22 LTS)

### 2. Installation

Clone repository and install dependencies:

```bash
git clone https://github.com/itachix99/BuildBond.git
cd BuildBond
npm install
```

### 3. Run Full Verification Suite

Execute the unified verification pipeline (runs TypeScript type-checks, unit tests, Cargo linter, Cargo tests, and builds production bundles):

```bash
npm run check
```

---

## 🧪 Testing & Verification

| Suite | Scope | Command |
| :--- | :--- | :--- |
| **Smart Contract Tests** | 20 unit & property tests covering initialization, role acceptance, retainage splits, defect liability, dispute freezing, arbitration awards, and factory registry | `cargo test --all` |
| **Contract Formatting & Lint** | Strict clippy check with zero warnings | `cargo fmt --all --check && cargo clippy --all-targets -- -D warnings` |
| **Web Frontend Tests** | Canonical SHA-256 terms hashing, evidence digests, retainage math, and error diagnostic decoders (1..37) | `npm run test --workspace=@buildbond/web` |
| **Event Indexer Tests** | SCVal XDR event decoding, deduplication, participant queries, timeline aggregations, and cursor persistence | `npm run test --workspace=@buildbond/indexer` |
| **On-Chain Verification** | Live Testnet RPC health and bytecode hash validation | `npm run verify:deployment` |

---

## 🚀 Running the Web Dashboard Locally

Launch the local development server:

```bash
npm run dev --workspace=@buildbond/web
```

The web dashboard provides:
- **Role Switcher & Personas**: Instant switching between Owner, Contractor, Inspector, Arbiter, or connected Freighter wallet.
- **Simulated Ledger Clock**: Fast-forward time (+30d, +90d) to test defect liability warranty maturity and retainage claims.
- **Multi-Project Factory Selector**: Switch between construction projects or deploy new isolated escrow instances.
- **Funding Workspace**: Live coverage progress meter, milestone auto-allocations, and deposit actions.
- **Milestone Pipeline**: Contractor deliverable evidence submittals and independent engineer certifications.
- **Dispute & Arbitration Center**: Formal dispute initiation, defect clock freezing, and arbiter split awards.
- **Withdrawal Hub**: Contractor immediate earnings pull-disbursements and mature retainage settlements.
- **Transaction Audit Drawer**: Live on-chain transaction logs with direct Stellar Expert explorer links.

---

## 🌐 Deployed Testnet Contracts

| Contract | Address / Hash | Explorer Link |
| :--- | :--- | :--- |
| **BuildBond Factory** | `CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM) |
| **Escrow WASM Hash** | `14a15e864d6f64eb7238fd81ef59b34dc8c046e54d2470484e3e0f39e81d5ef4` | Verified Protocol 27 Bytecode |
| **Factory WASM Hash** | `19d34e58f76992e0dc8b765fafd487ba38cb6bf68c194c24c86662ada95a56d3` | Verified Protocol 27 Bytecode |
| **Reference Escrow** | `CBONDFAC7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X99` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBONDFAC7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7X99) |
| **Testnet Payment Token** | `CUSDC7Y3VDFG574TNDV62B6IQP7Y6YJ6B3EBRT4E3X74P4X5P7XTESTNET01` | SEP-41 Compatible Stablecoin |

---

## 📖 Documentation

- [Architecture & Technical Specification](ARCHITECTURE.md)
- [Security Model & Audit Checklist](SECURITY.md)
- [Deployment & Operations Runbook](docs/DEPLOYMENT_RUNBOOK.md)

---

## 📄 License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
