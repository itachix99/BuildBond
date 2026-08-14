import {
  isValidStellarAddress,
  formatAddress,
  formatXlmAmount,
  getExplorerTxUrl,
  getExplorerAccountUrl,
} from './stellar';

// Simple lightweight assertion runner for frontend unit testing
export function runStellarUtilityTests() {
  console.log('Running Stellar utility unit tests...');

  // 1. Address validation tests
  const validAddress = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';
  const invalidAddress1 = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNM'; // Too short
  const invalidAddress2 = 'CBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI'; // Contract C-address, not G-address
  const invalidAddress3 = 'not-an-address';

  if (!isValidStellarAddress(validAddress)) {
    throw new Error(`Test failed: Expected ${validAddress} to be valid`);
  }
  if (isValidStellarAddress(invalidAddress1)) {
    throw new Error(`Test failed: Expected ${invalidAddress1} to be invalid`);
  }
  if (isValidStellarAddress(invalidAddress2)) {
    throw new Error(`Test failed: Expected ${invalidAddress2} to be invalid for Ed25519 G-address`);
  }
  if (isValidStellarAddress(invalidAddress3)) {
    throw new Error(`Test failed: Expected ${invalidAddress3} to be invalid`);
  }

  // 2. Address formatting tests
  const formatted = formatAddress(validAddress, 4);
  if (formatted !== 'GBZX...MADI') {
    throw new Error(`Test failed: Expected 'GBZX...MADI', got '${formatted}'`);
  }

  // 3. Amount formatting tests
  if (formatXlmAmount('1250.5') !== '1,250.50') {
    throw new Error(`Test failed: Expected '1,250.50', got '${formatXlmAmount('1250.5')}'`);
  }
  if (formatXlmAmount(0) !== '0.00') {
    throw new Error(`Test failed: Expected '0.00', got '${formatXlmAmount(0)}'`);
  }

  // 4. Explorer URL tests
  const dummyHash = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
  const explorerUrl = getExplorerTxUrl(dummyHash);
  if (!explorerUrl.includes('stellar.expert/explorer/testnet/tx/' + dummyHash)) {
    throw new Error(`Test failed: Incorrect explorer URL ${explorerUrl}`);
  }

  const accountUrl = getExplorerAccountUrl(validAddress);
  if (!accountUrl.includes('stellar.expert/explorer/testnet/account/' + validAddress)) {
    throw new Error(`Test failed: Incorrect account explorer URL ${accountUrl}`);
  }

  console.log('✅ All Stellar utility unit tests passed successfully!');
  return true;
}

// Execute tests
runStellarUtilityTests();
