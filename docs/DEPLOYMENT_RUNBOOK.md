# BuildBond Deployment & Operations Runbook

This runbook describes the end-to-end procedures for compiling, deploying, initializing, verifying, and operating the **BuildBond** construction milestone escrow and defect liability settlement protocol on **Stellar / Soroban**.

---

## 1. Prerequisites & Toolchain Requirements

Ensure the following tools are installed on your deployment workstation:

| Tool | Required Version | Verification Command |
| :--- | :--- | :--- |
| **Rust Toolchain** | `1.84.0+` (Edition 2021) | `rustc --version` |
| **WASM Target** | `wasm32v1-none` / `wasm32-unknown-unknown` | `rustup target list \| grep installed` |
| **Stellar CLI** | `27.0.0+` (Soroban SDK 27 / Protocol 27) | `stellar --version` |
| **Node.js** | `v20.0.0+` (or v22 LTS) | `node --version` |
| **npm / tsx** | `npm v10+`, `tsx` | `npx tsx --version` |

---

## 2. Network Environments

| Parameter | Stellar Testnet | Stellar Mainnet (Public) | Local Standalone Sandbox |
| :--- | :--- | :--- | :--- |
| **Network Passphrase** | `Test SDF Network ; September 2015` | `Public Global Stellar Network ; September 2015` | `Standalone Network ; February 2017` |
| **Soroban RPC URL** | `https://soroban-testnet.stellar.org` | `https://mainnet.sorobanrpc.com` | `http://localhost:8000/soroban/rpc` |
| **Horizon REST URL** | `https://horizon-testnet.stellar.org` | `https://horizon.stellar.org` | `http://localhost:8000` |
| **Explorer** | `https://stellar.expert/explorer/testnet` | `https://stellar.expert/explorer/public` | N/A |
| **Payment Token** | Testnet USDC / Native XLM | Mainnet USDC (`CCW67...`) / Native XLM | Mock SEP-41 Token |

---

## 3. Step-by-Step Deployment Routine

### Step 3.1: Account Preparation & Funding

For **Testnet**, fund your deployer keypair and test personas using Friendbot:

```bash
# Run automated testnet funding script
npm run fund:testnet
```

For **Mainnet**, create a secure hardware keypair or Stellar CLI identity:

```bash
stellar keys generate deployer --network mainnet
# Send minimum 50 XLM to the generated public key for gas and storage reserves
```

---

### Step 3.2: WASM Compilation & Optimization

Build optimized WASM bytecodes for `buildbond-escrow` and `buildbond-factory`:

```bash
# Clean compilation across all workspace contracts
cargo clean
stellar contract build
```

Verify binary sizes and hashes:
- `target/wasm32v1-none/release/buildbond_escrow.wasm` (~37.9 KB)
- `target/wasm32v1-none/release/buildbond_factory.wasm` (~8.2 KB)

---

### Step 3.3: Deployment metadata (no on-chain deployment yet)

The current script only builds WASM and records verified IDs from environment
variables. It does not upload, deploy, initialize, or create a reference
escrow. Mainnet is intentionally disabled.

```bash
# Record an already verified Testnet deployment (all values are required)
export BUILD_BOND_FACTORY_ID=C...
export BUILD_BOND_REFERENCE_ESCROW_ID=C...
export BUILD_BOND_PAYMENT_TOKEN=C...   # or a verified G... issuer
export BUILD_BOND_ADMIN_ADDRESS=G...
npm run deploy:testnet
```

The script validates Stellar StrKey formats before writing public metadata to
`packages/shared/src/contracts.json` and `.env.contracts`. A successful local
format check is not proof that a contract exists on-chain. It also writes a
candidate manifest to `deployments/testnet.manifest.json`; candidate manifests
are intentionally rejected by the web app and indexer until RPC verification
promotes one to `status: "verified"`.

---

### Step 3.4: Verification & Health Check

Verify on-chain deployment status and RPC reachability:

```bash
# Verify the candidate and persist a verified manifest only after all RPC checks pass.
npm run verify:deployment -- testnet \
  --manifest=deployments/testnet.manifest.json \
  --write-verified=deployments/testnet.manifest.verified.json

# Offline validation (no RPC calls or transactions)
npm run validate:manifest -- \
  --file=deployments/testnet.manifest.verified.json --network=testnet
```

The verifier fails closed unless all required values are present and valid. When
valid IDs and WASM hashes are configured, it also reads each contract's WASM
from Soroban RPC and compares the on-chain SHA-256 hash:
- `RPC Status`: Healthy (Ledger sequence verified)
- `Escrow WASM`: Valid SHA-256 hash (64 hex characters)
- `Factory WASM`: Valid SHA-256 hash (64 hex characters)
- `Factory ID`: Valid Stellar contract ID with on-chain WASM verification

If no manifest is supplied, `npm run verify:deployment` retains the legacy
environment-variable path and fails closed when metadata is absent. Never mark
a manifest verified by hand: the verifier is the step that records the
`verifiedAt` timestamp after matching both on-chain WASM hashes.

---

## 4. Starting the Background Indexer Daemon

To run the real-time Soroban RPC event indexer daemon in the background:

```bash
cd services/indexer
npm run build
INDEXER_POLL_INTERVAL_MS=5000 \
INDEXER_CONFIRMATION_LEDGERS=2 \
INDEXER_STORAGE_PATH=/var/lib/buildbond/indexer/events.json \
INDEXER_API_HOST=127.0.0.1 \
INDEXER_API_PORT=8787 \
BUILDBOND_DEPLOYMENT_MANIFEST=/etc/buildbond/testnet.manifest.verified.json \
npm start
```

When `BUILDBOND_DEPLOYMENT_MANIFEST` is set, the indexer refuses to start
unless the file is a verified manifest and derives its RPC endpoint and factory
contract IDs from that file. This prevents an indexer from silently following
a different network than the dashboard.

The indexer will continuously:
1. Poll new ledgers from Soroban RPC.
2. Follow RPC event cursors so pages larger than the request limit are not skipped.
3. Ignore events from failed contract calls and wait for the configured confirmation depth.
4. Decode milestone submissions, inspection approvals, retainage claims, arbitration awards, and factory project deployments.
5. Atomically persist the event log, project discovery directory, and cursor to `INDEXER_STORAGE_PATH`.

The read-only API exposes:

- `GET /health` for cursor and event-store health;
- `GET /projects?participant=<address>` for participant-scoped project discovery;
- `GET /projects/<factory>/<projectId>/audit` for a financial audit trail;
- `GET /projects/<factory>/<projectId>/milestones/<milestoneId>` for a milestone timeline;
- `GET /events?contractAddress=<address>` for filtered activity.

All token amounts are returned as decimal strings. The API has no write or transaction-authorizing
routes. To connect the web dashboard to it, set `VITE_INDEXER_API_URL=http://127.0.0.1:8787` before
starting `@buildbond/web`; without that variable the local simulator remains the only project source.

When an indexed project is selected, the dashboard lazy-loads the generated escrow bindings and
reads `project`, `accounting`, and `coverage` directly from Soroban RPC. For a verified deployment,
embed the manifest JSON at build time with `VITE_BUILD_BOND_DEPLOYMENT_MANIFEST_JSON` (and set
`VITE_BUILD_BOND_NETWORK`); the dashboard then takes its RPC and indexer endpoints from that
manifest. `VITE_STELLAR_RPC_URL` and `VITE_INDEXER_API_URL` remain development fallbacks. The dashboard compares the direct
commitment with the indexed commitment and surfaces mismatches; it never uses the indexer to
authorize payments or silently overwrite the simulator.

The indexer is a convenience read model, not payment authority. Security-sensitive screens must
reconcile balances and lifecycle state against direct contract reads. Use a durable filesystem
path or replace `FileEventStore` with a transactional database adapter for multi-process or
high-availability deployments. The default storage path is `.buildbond-indexer/events.json`.

---

## 5. Web Frontend Configuration & Startup

To launch the web application with live contract bindings:

```bash
# Launch local development server
npm run dev --workspace=@buildbond/web
```

Or build the optimized production client bundle:

```bash
npm run build --workspace=@buildbond/web
```

---

## 6. Upgrades & Template Maintenance

When upgrading the Escrow contract logic:
1. Compile the new `buildbond_escrow.wasm`.
2. Upload the new WASM bytecode to the network via `stellar contract install`.
3. The factory administrator executes `factory.update_wasm_hash(admin_key, new_wasm_hash)`.
4. All future projects deployed via the factory will instantly use the upgraded escrow template, while previously deployed project instances remain completely safe and immutable.

---

## 7. Troubleshooting & Recovery

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| `InsufficientEscrowBalance` | Contract balance does not match requested withdrawal | Check active liabilities meter in `FundingWorkspace`. |
| `RetainageNotMature` | Attempted retainage claim before defect period expiry | Check defect liability countdown or use clock fast-forward in simulated demo. |
| `InvalidTermsHash` | Role participant attempted to sign mismatched terms | Recompute canonical terms hash via `computeTermsHash`. |
| `InvalidAwardAllocation` | Arbiter split award does not equal disputed sum | Ensure `contractor_award + owner_refund == amount_disputed`. |
