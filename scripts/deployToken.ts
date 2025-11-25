#!/usr/bin/env tsx
/**
 * ERC-20 Token Deployment Script
 * 
 * Compiles and deploys TestToken contract to Sepolia using viem.
 * Automatically updates .env with deployed contract address.
 * 
 * @requires PRIVATE_KEY - EOA with Sepolia ETH for gas
 * @requires SEPOLIA_RPC_URL - RPC endpoint for Sepolia
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
// @ts-ignore - solc package lacks TypeScript definitions
import solc from 'solc';
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL!;

if (!PRIVATE_KEY || !SEPOLIA_RPC_URL) {
  console.error('❌ Missing required environment variables!');
  console.error('Please ensure PRIVATE_KEY and SEPOLIA_RPC_URL are set in .env');
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(SEPOLIA_RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(SEPOLIA_RPC_URL),
});

/**
 * Compile TestToken.sol using solc
 * @returns Contract ABI and bytecode
 */
async function compileContract() {
  console.log('📝 Compiling TestToken.sol...\n');
  
  const contractPath = path.join(process.cwd(), 'contracts', 'TestToken.sol');
  const source = fs.readFileSync(contractPath, 'utf8');
  
  const input = {
    language: 'Solidity',
    sources: {
      'TestToken.sol': {
        content: source,
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  };
  
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  
  if (output.errors) {
    const errors = output.errors.filter((e: any) => e.severity === 'error');
    if (errors.length > 0) {
      console.error('❌ Compilation errors:');
      errors.forEach((err: any) => console.error(err.formattedMessage));
      process.exit(1);
    }
  }
  
  const contract = output.contracts['TestToken.sol']['TestToken'];
  console.log('✅ Contract compiled successfully!\n');
  
  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}` as `0x${string}`,
  };
}

/**
 * Deploy compiled contract to Sepolia
 * @param bytecode - Contract bytecode
 * @param abi - Contract ABI
 * @returns Deployed contract address
 */
async function deployContract(bytecode: `0x${string}`, abi: any[]) {
  console.log('🚀 Deploying TestToken to Sepolia...');
  console.log(`📧 Deployer address: ${account.address}\n`);
  
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Deployer balance: ${(Number(balance) / 1e18).toFixed(4)} ETH`);
  
  if (balance < parseEther('0.001')) {
    console.warn('⚠️  Warning: Low ETH balance. May need more for deployment.\n');
  }
  
  console.log('⏳ Sending deployment transaction...\n');
  
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [],
  });
  
  console.log(`📤 Transaction hash: ${hash}`);
  console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${hash}\n`);
  
  console.log('⏳ Waiting for confirmation...\n');
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.status === 'reverted') {
    console.error('❌ Deployment failed!');
    process.exit(1);
  }
  
  const contractAddress = receipt.contractAddress!;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ TestToken deployed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`📍 Contract address: ${contractAddress}`);
  console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
  console.log(`📦 Block number: ${receipt.blockNumber}`);
  console.log(`🔗 Etherscan: https://sepolia.etherscan.io/address/${contractAddress}\n`);
  
  return contractAddress;
}

/**
 * Verify deployment by reading contract state
 * @param contractAddress - Deployed contract address
 * @param abi - Contract ABI
 */
async function verifyDeployment(contractAddress: `0x${string}`, abi: any[]) {
  console.log('🔍 Verifying deployment...\n');
  
  const name = await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: 'name',
    args: [],
  });
  
  const symbol = await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: 'symbol',
    args: [],
  });
  
  const totalSupply = await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: 'totalSupply',
    args: [],
  }) as unknown as bigint;
  
  const deployerBalance = await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: 'balanceOf',
    args: [account.address],
  }) as unknown as bigint;
  
  console.log('📊 Token Details:');
  console.log(`   Name: ${name}`);
  console.log(`   Symbol: ${symbol}`);
  console.log(`   Total Supply: ${(Number(totalSupply) / 1e18).toLocaleString()} TTK`);
  console.log(`   Deployer Balance: ${(Number(deployerBalance) / 1e18).toLocaleString()} TTK\n`);
  
  console.log('✅ Verification complete!\n');
}

/**
 * Update .env file with deployed contract address
 * @param contractAddress - Address to add to .env
 */
function updateEnvFile(contractAddress: string) {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  if (envContent.includes('ERC20_TOKEN_ADDRESS=')) {
    envContent = envContent.replace(
      /ERC20_TOKEN_ADDRESS=.*/,
      `ERC20_TOKEN_ADDRESS=${contractAddress}`
    );
  } else {
    envContent += `\nERC20_TOKEN_ADDRESS=${contractAddress}\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Updated .env file with ERC20_TOKEN_ADDRESS\n');
}

async function main() {
  console.log('🧩 EIP-7702 TestToken Deployment\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Step 1: Compile
    const { abi, bytecode } = await compileContract();
    
    // Step 2: Deploy
    const contractAddress = await deployContract(bytecode, abi);
    
    // Step 3: Verify
    await verifyDeployment(contractAddress, abi);
    
    // Step 4: Update .env
    updateEnvFile(contractAddress);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Phase 2 Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📝 Next steps:');
    console.log('   1. Verify contract on Etherscan (optional)');
    console.log('   2. Fund your EOA with test ETH if needed');
    console.log('   3. Proceed to Phase 3: Set up EIP-7702 clients\n');
    
  } catch (error) {
    console.error('❌ Deployment failed:');
    console.error(error);
    process.exit(1);
  }
}

main();

