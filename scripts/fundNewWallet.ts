#!/usr/bin/env tsx
/**
 * TEMPORARY SCRIPT: Fund New Wallet
 * 
 * Sends funds from current wallet to a new wallet address:
 * 1. Send 0.1 Sepolia ETH from current EOA
 * 2. Send 10,000 TTK from current smart account
 * 
 * @requires PRIVATE_KEY - Current wallet private key
 * @requires ADDRESS2 - New wallet address to fund
 * @requires ERC20_TOKEN_ADDRESS - TTK token contract
 */

import 'dotenv/config';
import { createWalletClient, http, parseEther, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import { erc20Abi } from '../src/erc20Abi';
import { publicClient } from '../src/publicClient';
import { owner } from '../src/owner';
import { getSmartAccountClient } from '../src/clients';

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 Fund New Wallet');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const newWalletAddress = process.env.ADDRESS2 as `0x${string}`;
  const tokenAddress = process.env.ERC20_TOKEN_ADDRESS as `0x${string}`;

  if (!newWalletAddress) {
    throw new Error('❌ ADDRESS2 is missing in .env (new wallet address)');
  }

  if (!tokenAddress || tokenAddress === '0x') {
    throw new Error('❌ ERC20_TOKEN_ADDRESS is missing in .env');
  }

  console.log('📋 Configuration:');
  console.log(`   Current EOA: ${owner.address}`);
  console.log(`   New Wallet: ${newWalletAddress}`);
  console.log(`   Token: ${tokenAddress}\n`);

  // Check current balances
  console.log('📊 Checking current balances...');
  const smartAccountClient = await getSmartAccountClient();
  const smartAccountAddress = smartAccountClient.account!.address;

  const [currentEthBalance, currentTtkBalance, newWalletEthBalance, newWalletTtkBalance] = await Promise.all([
    publicClient.getBalance({ address: owner.address }),
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [smartAccountAddress],
    }),
    publicClient.getBalance({ address: newWalletAddress }),
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [newWalletAddress],
    }),
  ]);

  console.log(`   Current EOA ETH: ${Number(currentEthBalance) / 1e18} ETH`);
  console.log(`   Current Smart Account TTK: ${(Number(currentTtkBalance) / 1e18).toLocaleString()} TTK`);
  console.log(`   New Wallet ETH: ${Number(newWalletEthBalance) / 1e18} ETH`);
  console.log(`   New Wallet TTK: ${(Number(newWalletTtkBalance) / 1e18).toLocaleString()} TTK\n`);

  // Verify sufficient balances
  const ethToSend = parseEther('0.1');
  const ttkToSend = 10_000n * 10n ** 18n; // 10,000 TTK

  if (currentEthBalance < ethToSend) {
    throw new Error(`❌ Insufficient ETH balance. Need 0.1 ETH, have ${Number(currentEthBalance) / 1e18} ETH`);
  }

  if (currentTtkBalance < ttkToSend) {
    throw new Error(`❌ Insufficient TTK balance. Need 10,000 TTK, have ${Number(currentTtkBalance) / 1e18} TTK`);
  }

  // ========================================
  // Step 1: Send ETH from current EOA
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💸 Step 1: Send 0.1 Sepolia ETH');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const walletClient = createWalletClient({
    account: owner,
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'),
  });

  console.log('🚀 Sending ETH transaction...');
  const ethTxHash = await walletClient.sendTransaction({
    to: newWalletAddress,
    value: ethToSend,
  });

  console.log(`   Transaction hash: ${ethTxHash}`);
  console.log(`   https://sepolia.etherscan.io/tx/${ethTxHash}\n`);

  console.log('⏳ Waiting for ETH transaction confirmation...');
  const ethReceipt = await publicClient.waitForTransactionReceipt({ 
    hash: ethTxHash,
    timeout: 120_000,
  });

  if (ethReceipt.status === 'reverted') {
    throw new Error('❌ ETH transaction reverted!');
  }

  console.log('✅ ETH transfer confirmed!\n');

  // ========================================
  // Step 2: Send TTK from smart account
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🪙 Step 2: Send 10,000 TTK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const transferData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [newWalletAddress, ttkToSend],
  });

  console.log('🚀 Sending TTK transfer via UserOperation...');
  const txParams: any = {
    to: tokenAddress,
    value: 0n,
    data: transferData,
  };
  const ttkTxHash = await smartAccountClient.sendTransaction(txParams);

  console.log(`   Transaction hash: ${ttkTxHash}`);
  console.log(`   https://sepolia.etherscan.io/tx/${ttkTxHash}\n`);

  console.log('⏳ Waiting for TTK transaction confirmation...');
  const ttkReceipt = await publicClient.waitForTransactionReceipt({ 
    hash: ttkTxHash,
    timeout: 120_000,
  });

  if (ttkReceipt.status === 'reverted') {
    throw new Error('❌ TTK transaction reverted!');
  }

  console.log('✅ TTK transfer confirmed!\n');

  // ========================================
  // Verify final balances
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Final Balances');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const [newWalletEthBalanceAfter, newWalletTtkBalanceAfter] = await Promise.all([
    publicClient.getBalance({ address: newWalletAddress }),
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [newWalletAddress],
    }),
  ]);

  const ethReceived = Number(newWalletEthBalanceAfter - newWalletEthBalance) / 1e18;
  const ttkReceived = Number(newWalletTtkBalanceAfter - newWalletTtkBalance) / 1e18;

  console.log('New Wallet:');
  console.log(`   ETH: ${Number(newWalletEthBalanceAfter) / 1e18} ETH (+${ethReceived.toFixed(4)} ETH)`);
  console.log(`   TTK: ${(Number(newWalletTtkBalanceAfter) / 1e18).toLocaleString()} TTK (+${ttkReceived.toLocaleString()} TTK)\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 SUCCESS! New Wallet Funded');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ Sent 0.1 ETH for gas fees');
  console.log('✅ Sent 10,000 TTK for transfers\n');
  console.log('💡 Next steps:');
  console.log('   1. Update PRIVATE_KEY in .env to PRIVATE_KEY2');
  console.log('   2. Run: npm run send-erc20-7702');
  console.log('   3. This will deploy new smart account & send tokens\n');
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

