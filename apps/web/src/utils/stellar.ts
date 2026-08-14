import {
  Horizon,
  StrKey,
  TransactionBuilder,
  Operation,
  Asset,
  Memo,
  TimeoutInfinite,
} from '@stellar/stellar-sdk';
import freighterApi from '@stellar/freighter-api';
import {
  NETWORK_PASSPHRASE_TESTNET,
  DEFAULT_TESTNET_HORIZON_URL,
} from '@buildbond/shared';

const { signTransaction } = freighterApi;

export const HORIZON_TESTNET_URL =
  (typeof process !== 'undefined' && process.env?.VITE_STELLAR_HORIZON_URL) ||
  DEFAULT_TESTNET_HORIZON_URL;

export const horizonServer = new Horizon.Server(HORIZON_TESTNET_URL);

/**
 * Validates a Stellar public key (G-address)
 */
export function isValidStellarAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return StrKey.isValidEd25519PublicKey(address.trim());
}

/**
 * Formats a Stellar public key for display (e.g. GABC...WXYZ)
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address) return '';
  const trimmed = address.trim();
  if (trimmed.length <= chars * 2 + 3) return trimmed;
  return `${trimmed.slice(0, chars)}...${trimmed.slice(-chars)}`;
}

/**
 * Formats an amount with up to 7 decimal places
 */
export function formatXlmAmount(amountStr: string | number): string {
  const num = typeof amountStr === 'string' ? parseFloat(amountStr) : amountStr;
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  });
}

/**
 * Returns a Stellar Expert explorer URL for a given transaction hash
 */
export function getExplorerTxUrl(txHash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}

/**
 * Returns a Stellar Expert explorer URL for an account
 */
export function getExplorerAccountUrl(account: string): string {
  return `https://stellar.expert/explorer/testnet/account/${account}`;
}

export interface AccountBalance {
  native: string;
  balances: Horizon.HorizonApi.BalanceLine[];
}

/**
 * Fetches the native XLM balance for a Stellar account
 */
export async function fetchAccountBalance(publicKey: string): Promise<AccountBalance> {
  if (!isValidStellarAddress(publicKey)) {
    throw new Error('Invalid Stellar public key');
  }

  try {
    const account = await horizonServer.loadAccount(publicKey);
    const nativeLine = account.balances.find((b) => b.asset_type === 'native');
    return {
      native: nativeLine ? nativeLine.balance : '0',
      balances: account.balances,
    };
  } catch (error: any) {
    if (error?.response?.status === 404) {
      // Account not funded on testnet
      return {
        native: '0',
        balances: [],
      };
    }
    throw error;
  }
}

export interface SendPaymentParams {
  sourcePublicKey: string;
  destinationPublicKey: string;
  amount: string;
  memo?: string;
}

export interface PaymentResult {
  successful: boolean;
  hash: string;
  ledger?: number;
  error?: string;
}

/**
 * Builds, signs via Freighter, and submits a direct native XLM payment on Testnet
 */
export async function sendNativePayment(
  params: SendPaymentParams,
  onStatusUpdate?: (status: 'simulating' | 'signing' | 'submitting' | 'confirming') => void
): Promise<PaymentResult> {
  const { sourcePublicKey, destinationPublicKey, amount, memo } = params;

  if (!isValidStellarAddress(sourcePublicKey)) {
    throw new Error('Invalid source public key');
  }
  if (!isValidStellarAddress(destinationPublicKey)) {
    throw new Error('Invalid destination public key');
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // 1. Simulating / Loading source account
  onStatusUpdate?.('simulating');
  let sourceAccount: Horizon.AccountResponse;
  try {
    sourceAccount = await horizonServer.loadAccount(sourcePublicKey);
  } catch (err: any) {
    if (err?.response?.status === 404) {
      throw new Error(
        'Source account is not funded on Stellar Testnet. Fund it with Friendbot first.'
      );
    }
    throw new Error(`Failed to load source account: ${err.message || err}`);
  }

  // Verify source has sufficient balance including base fee
  const nativeBalance = parseFloat(
    sourceAccount.balances.find((b) => b.asset_type === 'native')?.balance || '0'
  );
  if (nativeBalance < parsedAmount + 0.00001) {
    throw new Error(
      `Insufficient XLM balance. Available: ${nativeBalance} XLM, Required: ${(parsedAmount + 0.00001).toFixed(7)} XLM (including fee).`
    );
  }

  // 2. Build Transaction
  let txBuilder = new TransactionBuilder(sourceAccount, {
    fee: '10000', // 100 stroops = 0.00001 XLM base fee
    networkPassphrase: NETWORK_PASSPHRASE_TESTNET,
  }).addOperation(
    Operation.payment({
      destination: destinationPublicKey,
      asset: Asset.native(),
      amount: parsedAmount.toFixed(7),
    })
  ).setTimeout(TimeoutInfinite);

  if (memo && memo.trim().length > 0) {
    txBuilder = txBuilder.addMemo(Memo.text(memo.trim()));
  }

  const builtTx = txBuilder.build();
  const txXdr = builtTx.toXDR();

  // 3. Request Freighter signature
  onStatusUpdate?.('signing');
  let signedXdr: string;
  try {
    const signResult = await signTransaction(txXdr, {
      networkPassphrase: NETWORK_PASSPHRASE_TESTNET,
    });

    if (!signResult) {
      throw new Error('Freighter rejected the signature request.');
    }
    signedXdr = typeof signResult === 'string' ? signResult : (signResult as any).signedTxXdr || txXdr;
  } catch (err: any) {
    if (err.message && err.message.includes('User declined')) {
      throw new Error('Transaction signing was cancelled in Freighter.');
    }
    throw new Error(`Wallet signing error: ${err.message || err}`);
  }

  // 4. Submit to Horizon
  onStatusUpdate?.('submitting');
  try {
    const transaction = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE_TESTNET);
    onStatusUpdate?.('confirming');
    const result = await horizonServer.submitTransaction(transaction);

    return {
      successful: result.successful,
      hash: result.hash,
      ledger: result.ledger,
    };
  } catch (err: any) {
    const horizonError = err?.response?.data?.extras?.result_codes;
    if (horizonError) {
      const txCode = horizonError.transaction;
      const opCodes = (horizonError.operations || []).join(', ');
      throw new Error(`Horizon submission failed: ${txCode} [${opCodes}]`);
    }
    throw new Error(`Transaction submission failed: ${err.message || err}`);
  }
}
