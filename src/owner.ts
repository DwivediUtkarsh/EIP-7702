/**
 * EOA Owner Account Configuration
 * 
 * Loads the EOA private key from environment and creates a viem account.
 * This account controls the EIP-7702 smart account and signs authorizations.
 * 
 * @module owner
 */

import 'dotenv/config';
import { privateKeyToAccount } from 'viem/accounts';

const privateKey = process.env.PRIVATE_KEY as `0x${string}`;

if (!privateKey) {
  throw new Error('PRIVATE_KEY is missing in .env');
}

if (!privateKey.startsWith('0x')) {
  throw new Error('PRIVATE_KEY must start with 0x');
}

/** EOA account that controls the smart account via EIP-7702 */
export const owner = privateKeyToAccount(privateKey);

console.log('💼 EOA Owner loaded:', owner.address);

