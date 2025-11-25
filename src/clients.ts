/**
 * EIP-7702 + Account Abstraction Client Configuration
 * 
 * Provides factory functions for creating EIP-7702 enabled smart accounts
 * and bundler clients for submitting UserOperations to Alto/Pimlico.
 * 
 * @module clients
 */

import 'dotenv/config';
import { http, createPublicClient } from 'viem';
import { sepolia } from 'viem/chains';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { createSmartAccountClient } from 'permissionless';
import { to7702SimpleSmartAccount } from 'permissionless/accounts';
import { owner } from './owner';

const pimlicoApiKey = process.env.PIMLICO_API_KEY;
if (!pimlicoApiKey) {
  throw new Error('PIMLICO_API_KEY is missing in .env');
}

/** Public client for reading blockchain state on Sepolia */
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL!),
});

/** Pimlico client for bundler/paymaster operations (Sepolia: 11155111) */
export const pimlicoClient = createPimlicoClient({
  chain: sepolia,
  transport: http(
    `https://api.pimlico.io/v2/11155111/rpc?apikey=${pimlicoApiKey}`,
  ),
});

/** Cached instances to prevent redundant initialization */
let _simple7702Account: Awaited<ReturnType<typeof to7702SimpleSmartAccount>> | null = null;
let _smartAccountClient: Awaited<ReturnType<typeof createSmartAccountClient>> | null = null;

/**
 * Get or create the EIP-7702 Simple Smart Account
 * 
 * Creates a SimpleAccount instance that delegates the EOA using EIP-7702.
 * Uses singleton pattern to cache the account across multiple calls.
 * 
 * @returns Promise resolving to the configured smart account
 */
export async function getSimple7702Account() {
  if (_simple7702Account) {
    return _simple7702Account;
  }
  
  console.log('🔧 Creating Simple 7702 Account...');
  
  _simple7702Account = await to7702SimpleSmartAccount({
    client: publicClient,
    owner,
  });
  
  console.log('✅ Simple 7702 Account created');
  console.log('📍 Smart Account Address:', _simple7702Account.address);
  
  return _simple7702Account;
}

/**
 * Get or create the Smart Account Client
 * 
 * Creates a high-level client for building and submitting UserOperations
 * to the Alto bundler. Handles gas estimation, signature, and submission.
 * 
 * @returns Promise resolving to the configured smart account client
 */
export async function getSmartAccountClient() {
  if (_smartAccountClient) {
    return _smartAccountClient;
  }
  
  const account = await getSimple7702Account();
  
  console.log('🔧 Creating Smart Account Client...');
  
  _smartAccountClient = createSmartAccountClient({
    chain: sepolia,
    account,
    client: publicClient,
    bundlerTransport: http(
      `https://api.pimlico.io/v2/11155111/rpc?apikey=${pimlicoApiKey}`,
    ),
    paymaster: pimlicoClient,
  });
  
  console.log('✅ Smart Account Client created');
  console.log('🚀 Ready to send UserOperations!\n');
  
  return _smartAccountClient;
}

