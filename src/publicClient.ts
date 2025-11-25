/**
 * Public RPC Client Configuration
 * 
 * Creates a read-only client for interacting with Sepolia testnet.
 * Used for reading blockchain state, balances, and contract data.
 * 
 * @module publicClient
 */

import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

if (!process.env.SEPOLIA_RPC_URL) {
  throw new Error('SEPOLIA_RPC_URL is missing in .env');
}

/** Public client for read operations on Sepolia */
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL),
});

