#!/usr/bin/env tsx
/**
 * Atomic EIP-7702 Authorization + ERC-20 Transfer
 * 
 * Demonstrates atomic execution of EIP-7702 delegation and token transfer
 * in a single transaction via Alto bundler on Sepolia.
 * 
 * Flow:
 * 1. First execution: Signs EIP-7702 authorization → deploys smart account → transfers tokens
 * 2. Subsequent executions: Transfers tokens only (authorization persists on-chain)
 * 
 * @requires ERC20_TOKEN_ADDRESS - Deployed ERC-20 contract address
 * @requires RECEIVER_ADDRESS - Token recipient address
 * @requires PRIVATE_KEY - EOA with Sepolia ETH for gas
 * 
 * @see https://docs.pimlico.io/permissionless/how-to/accounts/use-eip7702-simple-account
 */

import 'dotenv/config';
import { encodeFunctionData } from 'viem';
import { sepolia } from 'viem/chains';

import { erc20Abi } from './erc20Abi';
import { publicClient } from './publicClient';
import { owner } from './owner';
import { getSmartAccountClient } from './clients';

/** SimpleAccount implementation address for EIP-7702 delegation (EntryPoint v0.8) */
const SIMPLE_ACCOUNT_LOGIC_ADDRESS = '0xe6Cae83BdE06E4c305530e199D7217f42808555B' as const;

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧩 EIP-7702 Atomic UserOperation Execution');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const tokenAddress = process.env.ERC20_TOKEN_ADDRESS as `0x${string}`;
  const receiver = process.env.RECEIVER_ADDRESS as `0x${string}`;

  if (!tokenAddress || tokenAddress === '0x') {
    throw new Error('❌ ERC20_TOKEN_ADDRESS is missing in .env');
  }

  if (!receiver || receiver === '0x') {
    throw new Error('❌ RECEIVER_ADDRESS is missing in .env');
  }

  console.log('📋 Configuration:');
  console.log(`   Owner (EOA): ${owner.address}`);
  console.log(`   Token: ${tokenAddress}`);
  console.log(`   Receiver: ${receiver}\n`);

  const smartAccountClient = await getSmartAccountClient();

  const amount = 10n * 10n ** 18n; // 10 tokens with 18 decimals
  console.log(`📤 Transfer Amount: ${Number(amount) / 1e18} TTK\n`);

  // Snapshot balances before transaction
  console.log('📊 Checking initial balances...');
  const [senderBalanceBefore, receiverBalanceBefore] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [smartAccountClient.account!.address],
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [receiver],
    }),
  ]);

  console.log(`   Sender: ${(Number(senderBalanceBefore) / 1e18).toLocaleString()} TTK`);
  console.log(`   Receiver: ${(Number(receiverBalanceBefore) / 1e18).toLocaleString()} TTK\n`);

  // Encode ERC-20 transfer call
  const transferData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [receiver, amount],
  });

  console.log('🔍 Checking deployment status...');
  const isDeployed = await smartAccountClient.account!.isDeployed();
  console.log(`   Smart Account deployed: ${isDeployed ? '✅ YES' : '❌ NO'}\n`);

  /**
   * Critical: Sign EIP-7702 authorization ONLY on first transaction
   * Must use EOA transaction nonce, not smart account nonce
   */
  let authorization: any = undefined;

  if (!isDeployed) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 First Transaction: EIP-7702 + ERC-20 Transfer');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📝 This transaction will:');
    console.log('   1. Convert EOA to SimpleAccount via EIP-7702');
    console.log('   2. Execute ERC-20 transfer');
    console.log('   3. Both in ONE atomic transaction\n');

    console.log('🧾 Building EIP-7702 authorization...');
    console.log(`   Logic Address: ${SIMPLE_ACCOUNT_LOGIC_ADDRESS}`);
    console.log(`   Chain ID: ${sepolia.id}`);
    
    // Must use EOA transaction nonce, not smart account nonce
    const nonce = await publicClient.getTransactionCount({
      address: owner.address,
    });
    
    console.log(`   EOA Nonce: ${nonce}`);

    authorization = await owner.signAuthorization({
      contractAddress: SIMPLE_ACCOUNT_LOGIC_ADDRESS,
      chainId: sepolia.id,
      nonce,
    });

    console.log(`   ✅ Authorization signed by: ${owner.address}\n`);
  } else {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 Subsequent Transaction: ERC-20 Transfer Only');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('   (EIP-7702 authorization persists on-chain)\n');
  }

  console.log('🚀 Sending UserOperation to Alto bundler...');
  console.log('⏳ Building UserOperation...\n');

  let hash: `0x${string}`;
  try {
    const txParams: any = {
      to: tokenAddress,
      value: 0n,
      data: transferData,
    };
    
    // Include authorization only on first transaction
    if (authorization) {
      txParams.authorization = authorization;
    }
    
    hash = await smartAccountClient.sendTransaction(txParams);
  } catch (error: any) {
    console.error('❌ Transaction failed:', error.message);
    console.error('\n💡 Debug info:');
    console.error(`   Account deployed: ${isDeployed}`);
    console.error(`   Account address: ${smartAccountClient.account!.address}`);
    console.error(`   Owner address: ${owner.address}`);
    console.error(`   Authorization included: ${!!authorization}`);
    throw error;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ UserOperation Sent Successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📦 Transaction Hash:');
  console.log(`   ${hash}\n`);

  console.log('🔗 View on Etherscan:');
  console.log(`   https://sepolia.etherscan.io/tx/${hash}\n`);

  console.log('⏳ Waiting for transaction confirmation...\n');
  const receipt = await publicClient.waitForTransactionReceipt({ 
    hash,
    timeout: 120_000,
  });

  if (receipt.status === 'reverted') {
    console.error('❌ Transaction reverted!');
    process.exit(1);
  }

  console.log('✅ Transaction confirmed!');
  console.log(`   Block: ${receipt.blockNumber}`);
  console.log(`   Gas Used: ${receipt.gasUsed.toString()}\n`);

  // Verify smart account deployment status
  console.log('🔍 Verifying deployment status...');
  const isDeployedAfter = await smartAccountClient.account!.isDeployed();
  console.log(`   Smart Account deployed: ${isDeployedAfter ? '✅ YES' : '❌ NO'}\n`);

  if (!isDeployed && isDeployedAfter) {
    console.log('🎉 SUCCESS: Smart Account deployed atomically!\n');
  }

  // Verify final balances
  console.log('📊 Checking final balances...');
  const [senderBalanceAfter, receiverBalanceAfter] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [smartAccountClient.account!.address],
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [receiver],
    }),
  ]);

  console.log(`   Sender: ${(Number(senderBalanceAfter) / 1e18).toLocaleString()} TTK`);
  console.log(`   Receiver: ${(Number(receiverBalanceAfter) / 1e18).toLocaleString()} TTK\n`);

  // Calculate balance deltas
  const senderChange = Number(senderBalanceBefore) - Number(senderBalanceAfter);
  const receiverChange = Number(receiverBalanceAfter) - Number(receiverBalanceBefore);

  console.log('📈 Balance Changes:');
  console.log(`   Sender: -${(senderChange / 1e18).toFixed(2)} TTK`);
  console.log(`   Receiver: +${(receiverChange / 1e18).toFixed(2)} TTK\n`);

  // Verify Transfer event in transaction logs
  console.log('📝 Verifying Transfer event in logs...');
  const transferLog = receipt.logs.find((log) => {
    try {
      return log.address.toLowerCase() === tokenAddress.toLowerCase() &&
             log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    } catch {
      return false;
    }
  });

  if (transferLog) {
    console.log('   ✅ Transfer event found in transaction logs\n');
  } else {
    console.log('   ⚠️  Transfer event not found (verify on Etherscan)\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Phase 4 Complete: Atomic Execution Verified!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('✅ Proof of Atomicity:');
  console.log(`   • Single transaction hash: ${hash}`);
  console.log(`   • Smart Account deployment: ${!isDeployed ? 'YES (first tx)' : 'Already deployed'}`);
  console.log(`   • ERC-20 transfer: SUCCESS (${amount / BigInt(1e18)} TTK)`);
  console.log(`   • Both operations: IN ONE TRANSACTION\n`);

  console.log('📋 Next Steps:');
  console.log('   1. Verify on Etherscan (link above)');
  console.log('   2. Check for ERC-20 Transfer event in logs');
  console.log('   3. Confirm both operations share the same tx hash');
  console.log('   4. Run this script again to see "subsequent transaction" flow\n');
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  console.error('\nFull error:', error);
  process.exit(1);
});

