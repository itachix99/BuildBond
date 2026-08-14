# BuildBond

> Programmable milestone escrow, retainage custody, and bounded dispute resolution for construction payments on Stellar using Soroban smart contracts.

---

## 1. Overview

BuildBond is an on-chain construction payment protocol that:
1. **Guarantees Coverage:** Funds for active milestones are locked in transparent escrow before construction begins.
2. **Separates Powers:** Requires independent, accredited inspectors to certify completion before releasing milestone disbursements.
3. **Automates Retainage:** Retains a configurable percentage (e.g. 5–10%) across a defined defect-liability period, releasing funds deterministically upon clock expiration.
4. **Bounds Disputes:** Freezes only affected milestone tranches and timers during defect claims, leaving undisputed project balances and active milestones fully operational.

---

## 2. Monorepo Architecture

```text
buildbond/
  ├── apps/
  │   └── web/                   # React 19 + TypeScript + Vite frontend client
  ├── contracts/
  │   └── buildbond-escrow/      # Soroban Rust smart contract for escrow & retainage
  ├── services/
  │   └── indexer/               # Durable Soroban RPC event indexer
  ├── packages/
  │   ├── shared/                # Shared presentation constants and types
  │   └── contract-bindings/     # Generated TypeScript contract clients
  ├── docs/
  │   ├── adr/                   # Architecture Decision Records
  │   └── threat-model.md        # Security invariants and threat mitigations
  ├── .github/workflows/
  │   └── ci.yml                 # Automated testing, linting, and build verification
  ├── Cargo.toml                 # Rust workspace configuration
  └── package.json               # Monorepo npm workspaces configuration
```

---

## 3. Prerequisites & Toolchain

- **Node.js:** `v22.x` (LTS) & `npm` `10.x`
- **Rust:** `1.97+` with `wasm32v1-none` target (`rustup target add wasm32v1-none`)
- **Stellar CLI:** `27.0.0+` (`cargo install --locked stellar-cli`)

---

## 4. Quickstart & Verification

### Install Dependencies
```bash
npm install
```

### Build Smart Contracts
```bash
npm run build:contract
# Or directly via stellar CLI:
stellar contract build
```

### Run All Workspace Checks
```bash
npm run check
```

This runs:
- TypeScript type-checking across all packages
- Unit tests (`npm run test` & `cargo test --all`)
- Cargo formatting & Clippy lint checks
- Production builds for web and TypeScript libraries

### Start Web Development Server
```bash
npm run dev --workspace=@buildbond/web
```
Open `http://localhost:3000` in your browser.

---

## 5. Security Invariant

All financial calculations use token smallest-unit integers (`i128`).
$$\text{Accounted Escrow Assets} = \text{Unallocated} + \text{Allocated} + \text{Contractor Payable} + \text{Retainage Locked} + \text{Disputed} + \text{Refundable}$$

---

## 6. License
MIT (see [LICENSE](LICENSE))
