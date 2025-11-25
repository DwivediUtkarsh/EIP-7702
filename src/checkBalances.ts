#!/usr/bin/env tsx
/**
 * Token Balance Checker
 * 
 * Displays ERC-20 token balances for EOA owner, smart account, and receiver.
 * Useful for verifying state before and after UserOperation execution.
 */

import 'dotenv/config';
import { publicClient } from './publicClient';
import { erc20Abi } from './erc20Abi';
import { owner } from './owner';
import { getSimple7702Account } from './clients';

async function main() {
  const tokenAddress = process.env.ERC20_TOKEN_ADDRESS as `0x${string}`;
  const receiver = process.env.RECEIVER_ADDRESS as `0x${string}`;

  if (!tokenAddress || tokenAddress === '0x') {
    throw new Error('ERC20_TOKEN_ADDRESS is missing in .env');
  }

  if (!receiver || receiver === '0x') {
    throw new Error('RECEIVER_ADDRESS is missing in .env');
  }

  const simple7702Account = await getSimple7702Account();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 Token Balance Check');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`📍 Token: ${tokenAddress}\n`);

  // Get token info
  const [name, symbol, decimals] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'name',
      args: [],
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'symbol',
      args: [],
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'decimals',
      args: [],
    }),
  ]);

  console.log('📊 Token Details:');
  console.log(`   Name: ${name}`);
  console.log(`   Symbol: ${symbol}`);
  console.log(`   Decimals: ${decimals}\n`);

  // Get balances
  const [ownerBalance, receiverBalance, smartAccountBalance] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [owner.address],
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [receiver],
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [simple7702Account.address],
    }),
  ]) as [bigint, bigint, bigint];

  const divisor = 10n ** BigInt(Number(decimals));

  console.log('💼 Balances:');
  console.log(`   EOA Owner (${owner.address}):`);
  console.log(`   ${(Number(ownerBalance) / Number(divisor)).toLocaleString()} ${symbol}\n`);

  console.log(`   Smart Account (${simple7702Account.address}):`);
  console.log(`   ${(Number(smartAccountBalance) / Number(divisor)).toLocaleString()} ${symbol}\n`);

  console.log(`   Receiver (${receiver}):`);
  console.log(`   ${(Number(receiverBalance) / Number(divisor)).toLocaleString()} ${symbol}\n`);

  // Check if addresses are the same (EIP-7702 behavior)
  if (owner.address.toLowerCase() === simple7702Account.address.toLowerCase()) {
    console.log('📝 Note: EOA and Smart Account have the same address');
    console.log('   This is expected for EIP-7702 (EOA delegation)\n');
  }
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

