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

### Step 3.3: Automated Contract Deployment

Execute the automated deployment script targeting the desired network:

```bash
# Deploy to Testnet
npm run deploy:testnet

# Deploy to Mainnet (requires BUILD_BOND_ADMIN_ADDRESS environment variable)
npm run deploy:mainnet
```

The script will automatically:
1. Upload and install the `buildbond_escrow.wasm` template.
2. Deploy the `BuildBondFactoryContract` instance.
3. Call `factory.initialize(admin_address, escrow_wasm_hash)`.
4. Deploy a reference project instance through the factory to verify end-to-end execution.
5. Write updated contract IDs to `packages/shared/src/contracts.json` and `.env.contracts`.

---

### Step 3.4: Verification & Health Check

Verify on-chain deployment status and RPC reachability:

```bash
npm run verify:deployment
```

Expected output checklist:
- `RPC Status`: Healthy (Ledger sequence verified)
- `Escrow WASM`: Valid SHA-256 hash (64 hex characters)
- `Factory WASM`: Valid SHA-256 hash (64 hex characters)
- `Factory ID`: Verified on-chain

---

## 4. Starting the Background Indexer Daemon

To run the real-time Soroban RPC event indexer daemon in the background:

```bash
cd services/indexer
npm run build
INDEXER_POLL_INTERVAL_MS=5000 npx tsx src/index.ts
```

The indexer will continuously:
1. Poll new ledgers from Soroban RPC.
2. Decode milestone submissions, inspection approvals, retainage claims, and arbitration awards.
3. Populate the normalized event store.

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
