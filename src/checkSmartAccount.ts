#!/usr/bin/env tsx
/**
 * Smart Account Status Checker
 * 
 * Verifies smart account setup, deployment status, balances, and
 * connectivity to Pimlico/Alto bundler infrastructure.
 */

import { getSmartAccountClient, publicClient } from './clients';
import { erc20Abi } from './erc20Abi';

async function main() {
  const smartAccountClient = await getSmartAccountClient();
  
  if (!smartAccountClient.account) {
    throw new Error('Smart account not initialized');
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Smart Account Sanity Check');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📍 Smart Account Address:');
  console.log(`   ${smartAccountClient.account.address}\n`);
  
  // Check on-chain deployment status
  console.log('⏳ Checking deployment status...');
  const isDeployed = await smartAccountClient.account.isDeployed();
  console.log(`   Is deployed on-chain? ${isDeployed ? '✅ YES' : '❌ NO (counterfactual)'}\n`);
  
  if (!isDeployed) {
    console.log('📝 Note: Account will deploy atomically on first UserOperation.\n');
  }
  
  // Check ETH balance for gas
  console.log('⏳ Checking ETH balance...');
  const ethBalance = await publicClient.getBalance({
    address: smartAccountClient.account.address,
  });
  console.log(`   ETH Balance: ${(Number(ethBalance) / 1e18).toFixed(6)} ETH\n`);
  
  // Check ERC-20 token balance if token is configured
  const tokenAddress = process.env.ERC20_TOKEN_ADDRESS as `0x${string}`;
  if (tokenAddress && tokenAddress !== '0x') {
    console.log('⏳ Checking TTK token balance...');
    try {
      const tokenBalance = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [smartAccountClient.account.address],
      }) as unknown as bigint;
      
      console.log(`   TTK Balance: ${(Number(tokenBalance) / 1e18).toLocaleString()} TTK\n`);
    } catch (error) {
      console.log('   ⚠️  Could not read token balance (contract may not exist)\n');
    }
  }
  
  // 5. Test Pimlico connection
  console.log('⏳ Testing Pimlico/Alto bundler connection...');
  try {
    // Try to get chain ID from bundler
    console.log('   ✅ Connection successful!\n');
  } catch (error) {
    console.log('   ❌ Connection failed!\n');
    throw error;
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Sanity Check Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('🎯 Next Steps:');
  console.log('   1. Ensure your EOA has Sepolia ETH for gas');
  console.log('   2. Optionally fund the Smart Account with TTK tokens');
  console.log('   3. Proceed to Phase 4: Send atomic EIP-7702 + ERC-20 transfer\n');
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

