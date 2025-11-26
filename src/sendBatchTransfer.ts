#!/usr/bin/env tsx
/**
 * Atomic Batch ERC-20 Transfer
 * 
 * Demonstrates batch execution: send tokens to multiple recipients
 * in a single UserOperation. If any transfer fails, the entire batch reverts.
 * 
 * Architecture:
 * - Uses SimpleAccount's executeBatch function
 * - All operations execute atomically (all-or-nothing)
 * - Single gas payment for multiple transfers
 * - EIP-7702 authorization included if first transaction
 * 
 * @requires ERC20_TOKEN_ADDRESS - Token contract address
 * @requires RECEIVER_ADDRESS - First recipient
 * @requires RECEIVER_ADDRESS2 - Second recipient
 * @requires PRIVATE_KEY - EOA with Sepolia ETH for gas
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
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 Atomic Batch ERC-20 Transfer');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const tokenAddress = process.env.ERC20_TOKEN_ADDRESS as `0x${string}`;
  const receiver1 = process.env.RECEIVER_ADDRESS as `0x${string}`;
  const receiver2 = process.env.RECEIVER_ADDRESS2 as `0x${string}`;

  if (!tokenAddress || tokenAddress === '0x') {
    throw new Error('❌ ERC20_TOKEN_ADDRESS is missing in .env');
  }

  if (!receiver1 || receiver1 === '0x') {
    throw new Error('❌ RECEIVER_ADDRESS is missing in .env');
  }

  if (!receiver2) {
    throw new Error('❌ RECEIVER_ADDRESS2 is missing in .env');
  }

  console.log('📋 Configuration:');
  console.log(`   Owner (EOA): ${owner.address}`);
  console.log(`   Token: ${tokenAddress}`);
  console.log(`   Receiver 1: ${receiver1}`);
  console.log(`   Receiver 2: ${receiver2}\n`);

  const smartAccountClient = await getSmartAccountClient();

  // Prepare two transfers
  const amount1 = 10n * 10n ** 18n; // 10 TTK to receiver1
  const amount2 = 20n * 10n ** 18n; // 20 TTK to receiver2

  console.log('📤 Transfer Amounts:');
  console.log(`   → Receiver 1: ${Number(amount1) / 1e18} TTK`);
  console.log(`   → Receiver 2: ${Number(amount2) / 1e18} TTK\n`);

  // Snapshot balances before transaction
  console.log('📊 Checking initial balances...');
  const [senderBalanceBefore, receiver1BalanceBefore, receiver2BalanceBefore] = await Promise.all([
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
      args: [receiver1],
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [receiver2],
    }),
  ]);

  console.log(`   Sender: ${(Number(senderBalanceBefore) / 1e18).toLocaleString()} TTK`);
  console.log(`   Receiver 1: ${(Number(receiver1BalanceBefore) / 1e18).toLocaleString()} TTK`);
  console.log(`   Receiver 2: ${(Number(receiver2BalanceBefore) / 1e18).toLocaleString()} TTK\n`);

  // Encode individual transfer calls
  const transferData1 = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [receiver1, amount1],
  });

  const transferData2 = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [receiver2, amount2],
  });

  // Define calls array for batch execution
  const calls = [
    {
      to: tokenAddress,
      value: 0n,
      data: transferData1,
    },
    {
      to: tokenAddress,
      value: 0n,
      data: transferData2,
    },
  ];

  // Check if account is deployed
  console.log('🔍 Checking deployment status...');
  const isDeployed = await smartAccountClient.account!.isDeployed();
  console.log(`   Smart Account: ${smartAccountClient.account!.address}`);
  console.log(`   Is deployed: ${isDeployed ? '✅ YES' : '❌ NO'}\n`);

  // Prepare authorization if needed
  let authorization = undefined;
  if (!isDeployed) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 First Transaction: EIP-7702 Authorization Required');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('   Creating EIP-7702 authorization for SimpleAccount deployment...');
    
    const nonce = await publicClient.getTransactionCount({
      address: owner.address,
    });

    console.log(`   EOA Nonce: ${nonce}`);
    console.log(`   Chain: ${sepolia.name} (${sepolia.id})`);
    console.log(`   Logic Address: ${SIMPLE_ACCOUNT_LOGIC_ADDRESS}`);

    authorization = await owner.signAuthorization({
      contractAddress: SIMPLE_ACCOUNT_LOGIC_ADDRESS,
      chainId: sepolia.id,
      nonce,
    });
    
    console.log('   ✅ Authorization signed\n');
    console.log('   📦 This transaction will:');
    console.log('      1️⃣  Deploy SimpleAccount contract (via EIP-7702)');
    console.log('      2️⃣  Transfer 10 TTK to receiver1');
    console.log('      3️⃣  Transfer 20 TTK to receiver2');
    console.log(`      ⚛️  All atomic - controlled by ${owner.address}\n`);
  } else {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 Subsequent Transaction: Batch Transfer Only');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('   (SimpleAccount already deployed, no authorization needed)\n');
  }

  // Use smart account's encodeCalls to properly batch the operations
  console.log('📦 Preparing batch transaction...');
  const batchCallData = await smartAccountClient.account!.encodeCalls(calls);
  console.log('   ✅ Batch calldata encoded\n');

  console.log('🚀 Sending batch UserOperation to Alto bundler...');
  console.log('⏳ Building and signing UserOperation...\n');

  let hash: `0x${string}`;
  try {
    const txParams: any = {
      to: smartAccountClient.account!.address, // Call smart account's executeBatch
      value: 0n,
      data: batchCallData,
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
  console.log('✅ Batch UserOperation Sent Successfully!');
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
  if (!isDeployed) {
    console.log('🔍 Verifying deployment status...');
    const isDeployedAfter = await smartAccountClient.account!.isDeployed();
    console.log(`   Smart Account deployed: ${isDeployedAfter ? '✅ YES' : '❌ NO'}\n`);

    if (isDeployedAfter) {
      console.log('🎉 SUCCESS: Smart Account deployed atomically with batch transfer!\n');
    }
  }

  // Verify final balances
  console.log('📊 Checking final balances...');
  const [senderBalanceAfter, receiver1BalanceAfter, receiver2BalanceAfter] = await Promise.all([
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
      args: [receiver1],
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [receiver2],
    }),
  ]);

  console.log(`   Sender: ${(Number(senderBalanceAfter) / 1e18).toLocaleString()} TTK`);
  console.log(`   Receiver 1: ${(Number(receiver1BalanceAfter) / 1e18).toLocaleString()} TTK`);
  console.log(`   Receiver 2: ${(Number(receiver2BalanceAfter) / 1e18).toLocaleString()} TTK\n`);

  // Calculate balance deltas
  const senderChange = Number(senderBalanceBefore) - Number(senderBalanceAfter);
  const receiver1Change = Number(receiver1BalanceAfter) - Number(receiver1BalanceBefore);
  const receiver2Change = Number(receiver2BalanceAfter) - Number(receiver2BalanceBefore);

  console.log('📈 Balance Changes:');
  console.log(`   Sender: -${(senderChange / 1e18).toLocaleString()} TTK`);
  console.log(`   Receiver 1: +${(receiver1Change / 1e18).toLocaleString()} TTK`);
  console.log(`   Receiver 2: +${(receiver2Change / 1e18).toLocaleString()} TTK\n`);

  // Verify the transfers by checking Transfer events
  console.log('🔍 Verifying Transfer events in transaction...');
  const transferEvents = receipt.logs.filter(log => 
    log.address.toLowerCase() === tokenAddress.toLowerCase() &&
    log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
  );

  console.log(`   Found ${transferEvents.length} Transfer events ✅\n`);

  if (transferEvents.length === 2) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 ATOMIC BATCH TRANSFER SUCCESSFUL!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`   ✅ Transfer 1: ${Number(amount1) / 1e18} TTK → ${receiver1}`);
    console.log(`   ✅ Transfer 2: ${Number(amount2) / 1e18} TTK → ${receiver2}`);
    console.log('   ⚛️  Both executed atomically in SINGLE transaction\n');
    console.log('💡 Key Benefits:');
    console.log('   • Single gas payment (more efficient than 2 transactions)');
    console.log('   • Atomic execution (all-or-nothing guarantee)');
    console.log('   • Single confirmation (faster than sequential transfers)\n');
  } else {
    console.warn(`⚠️  Warning: Expected 2 Transfer events, found ${transferEvents.length}`);
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

